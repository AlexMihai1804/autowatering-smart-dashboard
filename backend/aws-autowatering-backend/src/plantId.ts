import Busboy from 'busboy';
import { createHash } from 'node:crypto';
import { requireAuthenticatedUser } from './auth';
import { config } from './config';
import { getClientIp } from './http';
import {
    consumeGlobalRateLimit,
    consumeUsage,
    isOriginAllowed,
    jsonResponse,
    parseInteger,
    parseOptionalNumber,
    readSubscriptionSnapshot,
    sendJsonError
} from './shared';
import { RouteHandler } from './types';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const cacheMap = new Map<string, { expiresAtMs: number; payload: any }>();
const taxonomyCacheMap = new Map<string, { expiresAtMs: number; payload: TaxonomyResolution | null }>();

interface NormalizedPlantSuggestion {
    scientific_name: string;
    probability: number | null;
    canonical_name?: string;
    gbif_key?: number;
}

interface TaxonomyResolution {
    canonical_name: string | null;
    gbif_key: number | null;
}

function clearExpiredCacheEntries(nowMs: number): void {
    for (const [key, entry] of cacheMap.entries()) {
        if (entry.expiresAtMs <= nowMs) {
            cacheMap.delete(key);
        }
    }
    for (const [key, entry] of taxonomyCacheMap.entries()) {
        if (entry.expiresAtMs <= nowMs) {
            taxonomyCacheMap.delete(key);
        }
    }
}

function readCache(cacheKey: string): any | null {
    const nowMs = Date.now();
    clearExpiredCacheEntries(nowMs);
    const existing = cacheMap.get(cacheKey);
    if (!existing || existing.expiresAtMs <= nowMs) {
        return null;
    }
    return existing.payload;
}

function writeCache(cacheKey: string, payload: any): void {
    const cacheTtlSec = parseInteger(process.env.CACHE_TTL_SEC, 600, 0, 3600);
    if (cacheTtlSec <= 0) return;
    cacheMap.set(cacheKey, {
        expiresAtMs: Date.now() + cacheTtlSec * 1000,
        payload
    });
}

function readTaxonomyCache(cacheKey: string): TaxonomyResolution | null | undefined {
    const nowMs = Date.now();
    clearExpiredCacheEntries(nowMs);
    const existing = taxonomyCacheMap.get(cacheKey);
    if (!existing || existing.expiresAtMs <= nowMs) {
        return undefined;
    }
    return existing.payload;
}

function writeTaxonomyCache(cacheKey: string, payload: TaxonomyResolution | null): void {
    const cacheTtlSec = parseInteger(process.env.PLANTID_TAXONOMY_CACHE_TTL_SEC, 86400, 60, 604800);
    if (cacheTtlSec <= 0) return;
    taxonomyCacheMap.set(cacheKey, {
        expiresAtMs: Date.now() + cacheTtlSec * 1000,
        payload
    });
}

function normalizeScientificName(value: string | null | undefined): string {
    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function deriveCanonicalName(scientificName: string): string | null {
    const normalized = normalizeScientificName(scientificName);
    if (!normalized) return null;
    const match = normalized.match(/^([A-Z][A-Za-z-]+)\s+([a-z][A-Za-z-]+)/);
    if (match) {
        return `${match[1]} ${match[2]}`;
    }
    return normalized;
}

function parseGbifKey(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return Math.trunc(value);
    }
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return null;
}

async function resolveTaxonomyForScientificName(scientificName: string): Promise<TaxonomyResolution | null> {
    const normalizedName = normalizeScientificName(scientificName);
    if (!normalizedName) {
        return null;
    }

    const cacheKey = normalizedName.toLowerCase();
    const cached = readTaxonomyCache(cacheKey);
    if (cached !== undefined) {
        return cached;
    }

    const gbifBaseUrl = (process.env.PLANTID_TAXONOMY_BASE_URL?.trim() || 'https://api.gbif.org/v1').replace(/\/$/, '');
    const requestUrl = `${gbifBaseUrl}/species/match?name=${encodeURIComponent(normalizedName)}`;

    try {
        const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
                Accept: 'application/json'
            },
            signal: AbortSignal.timeout(5000)
        });

        if (!response.ok) {
            writeTaxonomyCache(cacheKey, null);
            return null;
        }

        const payload = await parseJsonOrThrow(response);
        const gbifKey = parseGbifKey(payload?.usageKey)
            ?? parseGbifKey(payload?.speciesKey)
            ?? parseGbifKey(payload?.acceptedUsageKey);
        const canonicalName = normalizeScientificName(payload?.canonicalName)
            || normalizeScientificName(payload?.scientificName)
            || deriveCanonicalName(normalizedName)
            || null;

        const result: TaxonomyResolution | null = canonicalName || gbifKey
            ? {
                canonical_name: canonicalName || null,
                gbif_key: gbifKey
            }
            : null;

        writeTaxonomyCache(cacheKey, result);
        return result;
    } catch (error) {
        console.warn('[plantId] Taxonomy resolver failed for', normalizedName, error);
        return null;
    }
}

function buildCacheKey(params: {
    imageBuffer: Buffer;
    latitude?: number;
    longitude?: number;
}): string {
    const hash = createHash('sha256');
    hash.update(params.imageBuffer);
    hash.update('|');
    hash.update(typeof params.latitude === 'number' ? String(params.latitude) : '');
    hash.update('|');
    hash.update(typeof params.longitude === 'number' ? String(params.longitude) : '');
    return hash.digest('hex');
}

async function requirePremiumForPlantId(auth: { uid: string; claims: Record<string, unknown> }): Promise<void> {
    if (!config.requirePremiumForPlantId) return;
    const premiumClaim = auth.claims.premium === true || auth.claims['custom:premium'] === 'true';
    if (premiumClaim) return;

    const snapshot = await readSubscriptionSnapshot(auth.uid);
    if (snapshot.isPremium !== true) {
        throw Object.assign(new Error('Plant ID is available only for premium users'), {
            statusCode: 402,
            code: 'premium_required'
        });
    }
}

async function parseMultipartPayload(contentType: string | undefined, rawBody: Buffer): Promise<any> {
    if (!contentType || !contentType.toLowerCase().includes('multipart/form-data')) {
        throw Object.assign(new Error('Content-Type must be multipart/form-data'), { statusCode: 400 });
    }
    if (!rawBody || rawBody.length === 0) {
        throw Object.assign(new Error('Missing request body'), { statusCode: 400 });
    }

    return new Promise((resolve, reject) => {
        const fields: Record<string, string> = {};
        let imageMimeType = 'image/jpeg';
        let imageBuffer: Buffer | null = null;
        let hasFile = false;
        let fileTooLarge = false;

        const busboy = Busboy({
            headers: {
                'content-type': contentType
            },
            limits: {
                files: 1,
                fields: 10,
                fileSize: MAX_IMAGE_BYTES
            }
        });

        busboy.on('field', (fieldName: string, value: string) => {
            fields[fieldName] = value;
        });

        busboy.on('file', (_fieldName: string, file: any, info: any) => {
            hasFile = true;
            const chunks: Buffer[] = [];
            imageMimeType = info.mimeType || 'image/jpeg';

            file.on('data', (chunk: Buffer) => {
                chunks.push(chunk);
            });

            file.on('limit', () => {
                fileTooLarge = true;
            });

            file.on('end', () => {
                if (!fileTooLarge) {
                    imageBuffer = Buffer.concat(chunks);
                }
            });
        });

        busboy.on('error', (error) => reject(error));
        busboy.on('finish', () => {
            if (!hasFile || !imageBuffer) {
                reject(Object.assign(new Error('Field "image" is required'), { statusCode: 400 }));
                return;
            }

            if (fileTooLarge) {
                reject(Object.assign(new Error(`Image too large (max ${MAX_IMAGE_BYTES} bytes)`), { statusCode: 413 }));
                return;
            }

            const latitude = parseOptionalNumber(fields.latitude);
            const longitude = parseOptionalNumber(fields.longitude);

            resolve({
                imageBuffer,
                imageMimeType,
                latitude,
                longitude,
                cacheKey: buildCacheKey({ imageBuffer, latitude, longitude })
            });
        });

        busboy.end(rawBody);
    });
}

async function parseJsonOrThrow(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    throw new Error(text || 'Unexpected non-JSON response');
}

async function requestKindwisePlantId(parsedPayload: any): Promise<any> {
    if (!config.kindwiseApiKey) {
        throw Object.assign(new Error('KINDWISE_API_KEY is not configured'), { statusCode: 500 });
    }

    const body: Record<string, unknown> = {
        images: [`data:${parsedPayload.imageMimeType};base64,${parsedPayload.imageBuffer.toString('base64')}`],
        similar_images: false
    };

    if (typeof parsedPayload.latitude === 'number') body.latitude = parsedPayload.latitude;
    if (typeof parsedPayload.longitude === 'number') body.longitude = parsedPayload.longitude;

    const response = await fetch(`${config.kindwiseBaseUrl}/identification`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': config.kindwiseApiKey
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw Object.assign(
            new Error(`Kindwise identification failed: HTTP ${response.status} ${errorText.slice(0, 300)}`),
            { statusCode: 502 }
        );
    }

    return parseJsonOrThrow(response);
}

function normalizeSuggestions(raw: any): NormalizedPlantSuggestion[] {
    const suggestions = Array.isArray(raw?.result?.classification?.suggestions)
        ? raw.result.classification.suggestions
        : [];

    return suggestions
        .map((item: any) => ({
            scientific_name: typeof item?.name === 'string' ? item.name.trim() : '',
            probability: typeof item?.probability === 'number' ? item.probability : null
        }))
        .filter((item: any) => item.scientific_name.length > 0);
}

async function enrichSuggestionsWithTaxonomy(
    suggestions: NormalizedPlantSuggestion[]
): Promise<NormalizedPlantSuggestion[]> {
    if (!suggestions.length) {
        return [];
    }

    const maxLookups = parseInteger(process.env.PLANTID_TAXONOMY_MAX_LOOKUPS, 5, 0, 10);
    const namesToLookup = [...new Set(
        suggestions
            .map((item) => normalizeScientificName(item.scientific_name))
            .filter((name) => name.length > 0)
    )].slice(0, maxLookups);

    const resolutionEntries = await Promise.all(namesToLookup.map(async (name) => {
        const resolved = await resolveTaxonomyForScientificName(name);
        return [name.toLowerCase(), resolved] as const;
    }));

    const resolutionByName = new Map<string, TaxonomyResolution | null>(resolutionEntries);

    return suggestions.map((item) => {
        const normalizedName = normalizeScientificName(item.scientific_name);
        const resolved = normalizedName
            ? (resolutionByName.get(normalizedName.toLowerCase()) ?? null)
            : null;
        const canonicalName = resolved?.canonical_name
            ?? deriveCanonicalName(normalizedName)
            ?? undefined;
        const gbifKey = resolved?.gbif_key ?? null;

        return {
            ...item,
            ...(canonicalName ? { canonical_name: canonicalName } : {}),
            ...(typeof gbifKey === 'number' ? { gbif_key: gbifKey } : {})
        };
    });
}

export const plantId: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    let auth: { uid: string; claims: Record<string, unknown> };
    try {
        auth = await requireAuthenticatedUser(ctx.headers);
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 401;
        return sendJsonError(statusCode, 'auth_failed', error.message || 'Authentication failed');
    }

    try {
        await requirePremiumForPlantId(auth);
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 402;
        return sendJsonError(statusCode, error?.code || 'premium_required', error.message || 'Premium required');
    }

    const clientIp = getClientIp(ctx);
    try {
        const windowSec = parseInteger(
            process.env.PLANTID_RATE_LIMIT_WINDOW_SEC || process.env.RATE_LIMIT_WINDOW_SEC,
            600,
            1,
            86400
        );
        const maxRequests = parseInteger(
            process.env.PLANTID_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX,
            60,
            1,
            10000
        );

        await consumeGlobalRateLimit({
            scope: 'ip_plantId',
            key: clientIp === 'unknown' ? auth.uid : clientIp,
            windowSec,
            maxRequests
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 429;
        return sendJsonError(statusCode, error?.code || 'rate_limited', error.message || 'Too many requests. Try again later.');
    }

    try {
        await consumeUsage(auth.uid, 'plantId', auth.claims);
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 429;
        return sendJsonError(statusCode, error?.code || 'usage_limit', error.message || 'Usage limit reached');
    }

    try {
        const parsedPayload = await parseMultipartPayload(ctx.headers['content-type'], ctx.rawBody);
        const cacheHit = readCache(parsedPayload.cacheKey);
        if (cacheHit) {
            return jsonResponse(200, cacheHit, { 'X-AI-Cache': 'HIT' });
        }

        const identifyResponse = await requestKindwisePlantId(parsedPayload);
        const baseSuggestions = normalizeSuggestions(identifyResponse);
        let suggestions = baseSuggestions;
        try {
            suggestions = await enrichSuggestionsWithTaxonomy(baseSuggestions);
        } catch (error) {
            console.warn('[plantId] Failed to enrich suggestions with taxonomy data:', error);
        }
        const bestMatch = suggestions[0] || null;

        const responsePayload = {
            provider: 'kindwise',
            best_match: bestMatch,
            suggestions,
            proxy_timestamp: new Date().toISOString()
        };

        writeCache(parsedPayload.cacheKey, responsePayload);
        return jsonResponse(200, responsePayload, { 'X-AI-Cache': 'MISS' });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(
            statusCode,
            'plant_id_failed',
            statusCode >= 500 ? 'Plant ID backend request failed' : (error.message || 'Request failed')
        );
    }
};

export const plantIdHealth: RouteHandler = async () => {
    return jsonResponse(200, {
        ok: true,
        service: 'plant-id',
        time: new Date().toISOString()
    });
};
