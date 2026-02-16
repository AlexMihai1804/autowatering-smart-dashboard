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

function clearExpiredCacheEntries(nowMs: number): void {
    for (const [key, entry] of cacheMap.entries()) {
        if (entry.expiresAtMs <= nowMs) {
            cacheMap.delete(key);
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

function buildCacheKey(params: {
    imageBuffer: Buffer;
    symptoms?: string;
    latitude?: number;
    longitude?: number;
    language?: string;
}): string {
    const hash = createHash('sha256');
    hash.update(params.imageBuffer);
    hash.update('|');
    hash.update(params.symptoms || '');
    hash.update('|');
    hash.update(typeof params.latitude === 'number' ? String(params.latitude) : '');
    hash.update('|');
    hash.update(typeof params.longitude === 'number' ? String(params.longitude) : '');
    hash.update('|');
    hash.update(params.language || '');
    return hash.digest('hex');
}

async function requirePremiumForAi(auth: { uid: string; claims: Record<string, unknown> }): Promise<void> {
    if (!config.requirePremiumForAi) return;
    const premiumClaim = auth.claims.premium === true || auth.claims['custom:premium'] === 'true';
    if (premiumClaim) return;

    const snapshot = await readSubscriptionSnapshot(auth.uid);
    if (snapshot.isPremium !== true) {
        throw Object.assign(new Error('AI Doctor is available only for premium users'), { statusCode: 402 });
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
                fields: 20,
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

            const symptoms = fields.symptoms?.trim();
            const latitude = parseOptionalNumber(fields.latitude);
            const longitude = parseOptionalNumber(fields.longitude);
            const language = fields.language?.trim();

            resolve({
                imageBuffer,
                imageMimeType,
                symptoms: symptoms && symptoms.length > 0 ? symptoms : undefined,
                latitude,
                longitude,
                language: language && language.length > 0 ? language : undefined,
                cacheKey: buildCacheKey({
                    imageBuffer,
                    symptoms,
                    latitude,
                    longitude,
                    language
                })
            });
        });

        busboy.end(rawBody);
    });
}

function buildKindwiseQuestion(symptoms?: string, language?: string): string {
    const locale = language?.toLowerCase().startsWith('ro') ? 'Romanian' : 'English';
    const sections = [
        'Provide practical diagnosis summary for the detected plant diseases.',
        symptoms ? `User symptoms: ${symptoms}` : '',
        'Give likely causes, quick confirmation checks, low-risk treatment steps first, and prevention.',
        `Respond in ${locale}.`
    ];
    return sections.filter(Boolean).join(' ');
}

async function parseJsonOrThrow(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('application/json')) {
        return response.json();
    }
    const text = await response.text();
    throw new Error(text || 'Unexpected non-JSON response');
}

async function requestKindwiseIdentification(parsedPayload: any): Promise<any> {
    if (!config.kindwiseApiKey) {
        throw Object.assign(new Error('KINDWISE_API_KEY is not configured'), { statusCode: 500 });
    }

    const body: Record<string, unknown> = {
        images: [`data:${parsedPayload.imageMimeType};base64,${parsedPayload.imageBuffer.toString('base64')}`],
        health: 'all',
        disease_level: 'all',
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

async function requestKindwiseConversation(accessToken: string, parsedPayload: any): Promise<string | null> {
    if (!config.enableConversation) {
        return null;
    }

    const response = await fetch(`${config.kindwiseBaseUrl}/identification/${accessToken}/conversation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Api-Key': config.kindwiseApiKey
        },
        body: JSON.stringify({
            question: buildKindwiseQuestion(parsedPayload.symptoms, parsedPayload.language),
            app_name: 'AutoWatering AI Doctor',
            temperature: 0.2,
            stream: false
        }),
        signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
        return null;
    }

    const data = await parseJsonOrThrow(response);
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    const assistantMessage = [...messages]
        .reverse()
        .find((item) => item?.role === 'assistant' && typeof item?.content === 'string');

    return assistantMessage?.content ?? null;
}

export const aiDoctor: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    let auth: { uid: string; claims: Record<string, unknown> };
    try {
        auth = await requireAuthenticatedUser(ctx.headers);
        await requirePremiumForAi(auth);
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 401;
        return sendJsonError(statusCode, 'auth_failed', error.message || 'Authentication failed');
    }

    const clientIp = getClientIp(ctx);
    try {
        const windowSec = parseInteger(
            process.env.AIDOCTOR_RATE_LIMIT_WINDOW_SEC || process.env.RATE_LIMIT_WINDOW_SEC,
            600,
            1,
            86400
        );
        const maxRequests = parseInteger(
            process.env.AIDOCTOR_RATE_LIMIT_MAX || process.env.RATE_LIMIT_MAX,
            30,
            1,
            10000
        );

        await consumeGlobalRateLimit({
            scope: 'ip_aiDoctor',
            key: clientIp === 'unknown' ? auth.uid : clientIp,
            windowSec,
            maxRequests
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 429;
        return sendJsonError(statusCode, error?.code || 'rate_limited', error.message || 'Too many requests. Try again later.');
    }

    try {
        await consumeUsage(auth.uid, 'aiDoctor', auth.claims);
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

        const identificationResponse = await requestKindwiseIdentification(parsedPayload);
        const accessToken = identificationResponse?.access_token;
        let llmAdvice = null;
        if (accessToken) {
            llmAdvice = await requestKindwiseConversation(accessToken, parsedPayload);
        }

        const responsePayload = {
            ...identificationResponse,
            provider: 'kindwise',
            llm_advice: llmAdvice,
            proxy_timestamp: new Date().toISOString()
        };

        writeCache(parsedPayload.cacheKey, responsePayload);
        return jsonResponse(200, responsePayload, { 'X-AI-Cache': 'MISS' });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(
            statusCode,
            'ai_doctor_failed',
            statusCode >= 500 ? 'AI Doctor backend request failed' : (error.message || 'Request failed')
        );
    }
};

export const aiDoctorHealth: RouteHandler = async () => {
    return jsonResponse(200, {
        ok: true,
        service: 'autowatering-aws-backend',
        time: new Date().toISOString()
    });
};
