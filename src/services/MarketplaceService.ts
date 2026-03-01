/**
 * MarketplaceService — Singleton service wrapping all marketplace REST endpoints.
 * URL derivation: uses `VITE_MARKETPLACE_API_URL` if set, else derives from
 * `VITE_AI_DOCTOR_API_URL` by replacing `/aiDoctor` suffix with `/marketplace`.
 */

import { getCognitoIdToken } from '../lib/cognitoClient';
import type {
    AiChatMessage,
    AiChatResult,
    AiFillGapsResult,
    AiSearchResult,
    AiTranslateResult,
    Comment,
    MarketplaceNotification,
    MarketplacePack,
    MarketplacePlant,
    ModerationResult,
    PackDetail,
    PlantEditorData,
    PlantSummary,
    Review,
    UserPlant,
} from '../types/marketplace';

const env = import.meta.env as Record<string, string | undefined>;

function deriveBaseUrl(): string {
    const explicit = env.VITE_MARKETPLACE_API_URL?.trim();
    if (explicit) return explicit.replace(/\/+$/, '');

    const aiDoctor = env.VITE_AI_DOCTOR_API_URL?.trim() || '';
    if (aiDoctor.endsWith('/aiDoctor')) {
        return aiDoctor.replace(/\/aiDoctor$/, '');
    }
    // Fallback — strip trailing path to get base
    try {
        const u = new URL(aiDoctor);
        u.pathname = u.pathname.replace(/\/[^/]+$/, '') || '/';
        return u.toString().replace(/\/+$/, '');
    } catch {
        return '';
    }
}

const BASE_URL = deriveBaseUrl();
const SEARCH_EXPANSION_CACHE_PREFIX = 'marketplace_search_expand_v1';
const SEARCH_EXPANSION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type SearchExpansionCachePayload = {
    expiresAtMs: number;
    response: {
        normalizedQuery: string;
        expandedTerms: string[];
        sourcesUsed: string[];
        expiresAt: string;
    };
};

// ── HTTP helpers ───────────────────────────────────────────────────

async function authHeaders(): Promise<HeadersInit> {
    const token = await getCognitoIdToken();
    const h: HeadersInit = {};
    if (token) h['Authorization'] = `Bearer ${token}`;
    return h;
}

async function get<T>(path: string): Promise<T> {
    const url = `${BASE_URL}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: await authHeaders(),
            signal: controller.signal,
        });
        if (!response.ok) {
            const text = await response.text();
            let msg = `HTTP ${response.status}`;
            try { msg = JSON.parse(text)?.error?.message || msg; } catch { /* ignore */ }
            throw new Error(msg);
        }
        return response.json();
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

async function post<T>(path: string, body?: unknown, timeoutMs = 15_000): Promise<T> {
    const headers: HeadersInit = {
        ...(await authHeaders()),
        'Content-Type': 'application/json',
    };
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${BASE_URL}${path}`, {
            method: 'POST',
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined,
            signal: controller.signal,
        });
        if (!response.ok) {
            const text = await response.text();
            let msg = `HTTP ${response.status}`;
            try { msg = JSON.parse(text)?.error?.message || msg; } catch { /* ignore */ }
            throw new Error(msg);
        }
        return response.json();
    } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
            throw new Error('Request timed out');
        }
        throw err;
    } finally {
        clearTimeout(timer);
    }
}

// ── Plants ─────────────────────────────────────────────────────────

export interface BrowsePlantsOpts {
    category?: string;
    status?: string;
    authorUid?: string;
    search?: string;
    locale?: 'en' | 'ro';
    sort?: 'newest' | 'top_rated' | 'most_downloaded';
    limit?: number;
    nextToken?: string;
}

export async function browsePlants(opts: BrowsePlantsOpts = {}) {
    const params = new URLSearchParams();
    if (opts.category) params.set('category', opts.category);
    if (opts.status) params.set('status', opts.status);
    if (opts.authorUid) params.set('authorUid', opts.authorUid);
    if (opts.search) params.set('search', opts.search);
    if (opts.locale) params.set('locale', opts.locale);
    if (opts.sort) params.set('sort', opts.sort);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ plants: PlantSummary[]; nextToken: string | null }>(
        `/marketplace/plants${qs ? `?${qs}` : ''}`
    );
}

export async function expandMarketplaceSearch(
    query: string,
    locale: 'en' | 'ro',
    maxTerms = 24,
) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return {
            normalizedQuery: '',
            expandedTerms: [],
            sourcesUsed: ['local'],
            cached: false,
            expiresAt: new Date(Date.now() + SEARCH_EXPANSION_CACHE_TTL_MS).toISOString(),
        };
    }

    const cacheKey = `${SEARCH_EXPANSION_CACHE_PREFIX}:${locale}:${maxTerms}:${normalizedQuery}`;
    try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
            const cached = JSON.parse(cachedRaw) as SearchExpansionCachePayload;
            if (cached?.expiresAtMs && Date.now() < cached.expiresAtMs && cached.response) {
                return {
                    ...cached.response,
                    cached: true,
                };
            }
            localStorage.removeItem(cacheKey);
        }
    } catch {
        // Ignore cache read issues.
    }

    const response = await post<{
        normalizedQuery: string;
        expandedTerms: string[];
        sourcesUsed: string[];
        cached: boolean;
        expiresAt: string;
    }>('/marketplace/search/expand', {
        query: normalizedQuery,
        locale,
        maxTerms,
    });

    try {
        const payload: SearchExpansionCachePayload = {
            expiresAtMs: Date.now() + SEARCH_EXPANSION_CACHE_TTL_MS,
            response: {
                normalizedQuery: response.normalizedQuery,
                expandedTerms: response.expandedTerms,
                sourcesUsed: response.sourcesUsed,
                expiresAt: response.expiresAt,
            },
        };
        localStorage.setItem(cacheKey, JSON.stringify(payload));
    } catch {
        // Ignore cache write issues.
    }

    return response;
}

export async function getPlantDetail(plantId: string) {
    return get<{ plant: MarketplacePlant }>(`/marketplace/plants/${plantId}`);
}

export async function createPlant(data: PlantEditorData) {
    return post<{ plant: MarketplacePlant }>('/marketplace/plants', data);
}

export async function updatePlant(plantId: string, data: Partial<PlantEditorData> & { version: number }) {
    return post<{ plant: MarketplacePlant }>(`/marketplace/plants/${plantId}`, data);
}

export async function submitForReview(plantId: string) {
    return post<{ plantId: string; status: string }>(`/marketplace/plants/${plantId}/submit`);
}

export async function requestImageUploadUrl(plantId: string, filename: string, contentType: string) {
    return post<{ uploadUrl: string; key: string }>(`/marketplace/plants/${plantId}/image-upload`, {
        filename,
        contentType,
    });
}

export async function confirmImageUpload(plantId: string, key: string, isPrimary: boolean) {
    return post<{ plant: MarketplacePlant }>(`/marketplace/plants/${plantId}/image-confirm`, {
        key,
        isPrimary,
    });
}

/**
 * Upload image file to S3 via presigned URL, then confirm it.
 */
export async function uploadPlantImage(plantId: string, file: File, isPrimary = false) {
    const { uploadUrl, key } = await requestImageUploadUrl(plantId, file.name, file.type);
    // Direct PUT to S3
    await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
    });
    // Confirm
    return confirmImageUpload(plantId, key, isPrimary);
}

// ── Packs ──────────────────────────────────────────────────────────

export interface BrowsePacksOpts {
    status?: string;
    authorUid?: string;
    limit?: number;
    nextToken?: string;
}

export async function browsePacks(opts: BrowsePacksOpts = {}) {
    const params = new URLSearchParams();
    if (opts.status) params.set('status', opts.status);
    if (opts.authorUid) params.set('authorUid', opts.authorUid);
    if (opts.limit) params.set('limit', String(opts.limit));
    if (opts.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ packs: MarketplacePack[]; nextToken: string | null }>(
        `/marketplace/packs${qs ? `?${qs}` : ''}`
    );
}

export async function getPackDetail(packId: string) {
    return get<{ pack: PackDetail }>(`/marketplace/packs/${packId}`);
}

export async function createPack(data: {
    nameEn: string; nameRo: string;
    descriptionEn?: string; descriptionRo?: string;
    plantIds: string[]; tags?: string[];
}) {
    return post<{ pack: MarketplacePack }>('/marketplace/packs', data);
}

export async function updatePack(packId: string, data: Partial<{
    nameEn: string; nameRo: string;
    descriptionEn: string; descriptionRo: string;
    plantIds: string[]; tags: string[];
}>) {
    return post<{ pack: MarketplacePack }>(`/marketplace/packs/${packId}`, data);
}

// ── User Library ───────────────────────────────────────────────────

export async function getUserLibrary() {
    return get<{ library: UserPlant[]; count: number }>('/marketplace/library');
}

export async function installPlant(plantId: string) {
    return post<{ userPlant: unknown }>('/marketplace/library/install', { plantId });
}

export async function installPackPlants(plantIds: string[]) {
    return post<{ results: { plantId: string; status: string }[]; installed: number }>(
        '/marketplace/library/install-pack',
        { plantIds }
    );
}

export async function removePlantFromLibrary(plantId: string) {
    return post<{ message: string }>(`/marketplace/library/${plantId}/remove`);
}

export async function updatePlantSyncStatus(plantId: string, syncedToDevice: boolean, devicePlantId?: number) {
    return post<{ userPlant: unknown }>(`/marketplace/library/${plantId}/sync`, {
        syncedToDevice,
        devicePlantId,
    });
}

// ── Reviews ────────────────────────────────────────────────────────

export async function getPlantReviews(plantId: string, opts?: { limit?: number; nextToken?: string }) {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ reviews: Review[]; nextToken: string | null }>(
        `/marketplace/plants/${plantId}/reviews${qs ? `?${qs}` : ''}`
    );
}

export async function createReview(plantId: string, data: { rating: number; title?: string; body?: string }) {
    return post<{ review: Review; updated: boolean }>(
        `/marketplace/plants/${plantId}/reviews`,
        data
    );
}

export async function getMyReviews(opts?: { limit?: number; nextToken?: string }) {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ reviews: Review[]; nextToken: string | null }>(
        `/marketplace/reviews/mine${qs ? `?${qs}` : ''}`
    );
}

// ── Comments ───────────────────────────────────────────────────────

export async function getPlantComments(plantId: string, opts?: { limit?: number; nextToken?: string }) {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ comments: Comment[]; nextToken: string | null }>(
        `/marketplace/plants/${plantId}/comments${qs ? `?${qs}` : ''}`
    );
}

export async function createComment(plantId: string, content: string, parentId?: string) {
    return post<{ comment: Comment }>(
        `/marketplace/plants/${plantId}/comments`,
        { content, parentId: parentId || null }
    );
}

// ── Notifications ──────────────────────────────────────────────────

export async function getNotifications(opts?: { limit?: number; nextToken?: string }) {
    const params = new URLSearchParams();
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ notifications: MarketplaceNotification[]; nextToken: string | null }>(
        `/marketplace/notifications${qs ? `?${qs}` : ''}`
    );
}

export async function getUnreadCount() {
    return get<{ unreadCount: number }>('/marketplace/notifications/unread');
}

export async function markNotificationsRead(notificationIds: string[]) {
    return post<{ marked: number }>('/marketplace/notifications/read', { notificationIds });
}

// ── AI ─────────────────────────────────────────────────────────────

export async function aiFillGaps(data: {
    scientificName?: string;
    commonName?: string;
    existingData?: Record<string, unknown>;
}) {
    return post<AiFillGapsResult>('/marketplace/ai/fill-gaps', data);
}

export async function aiTranslate(fields: Record<string, string>, fromLang: 'en' | 'ro') {
    return post<AiTranslateResult>('/marketplace/ai/translate', { fields, fromLang });
}

export async function aiSearch(query: string) {
    return post<AiSearchResult>('/marketplace/ai/search', { query }, 45_000);
}

export async function aiPlantChat(plantId: string, message: string, history: AiChatMessage[]) {
    return post<AiChatResult>(`/marketplace/plants/${plantId}/chat`, { message, history }, 45_000);
}

export async function aiSuggestImage(scientificName?: string, commonName?: string) {
    return post<{ suggestions: string[]; model: string }>('/marketplace/ai/suggest-image', {
        scientificName,
        commonName,
    });
}

export async function aiGenerateDescription(plantId: string, lang?: string) {
    const params = lang ? `?lang=${lang}` : '';
    return post<{
        descriptionEn: string;
        descriptionRo: string;
        description_ro?: string;
        [key: string]: unknown;
        cached: boolean;
        model?: string;
        availableTranslations?: string[];
    }>(
        `/marketplace/plants/${plantId}/generate-description${params}`,
        {},
        45_000,
    );
}

export async function aiTranslateDescription(plantId: string, lang: string) {
    return post<{
        description: string;
        lang: string;
        cached: boolean;
        model?: string;
    }>(
        `/marketplace/plants/${plantId}/translate-description`,
        { lang },
        30_000,
    );
}

// ── Profiles ───────────────────────────────────────────────────────

export async function getAuthorProfile(uid: string) {
    return get<{
        profile: {
            uid: string;
            displayName: string;
            plantCount: number;
            totalDownloads: number;
            totalReviews: number;
            averageRating: number;
            verified: boolean;
            official: boolean;
            joinedAt: string;
        };
        plants: PlantSummary[];
    }>(`/marketplace/profiles/${uid}`);
}

// ── Admin / Moderation ─────────────────────────────────────────────

export async function getModerationQueue(opts?: { status?: string; limit?: number; nextToken?: string }) {
    const params = new URLSearchParams();
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    if (opts?.nextToken) params.set('nextToken', opts.nextToken);
    const qs = params.toString();
    return get<{ plants: MarketplacePlant[]; nextToken: string | null }>(
        `/marketplace/admin/moderation/queue${qs ? `?${qs}` : ''}`
    );
}

export async function moderatePlant(plantId: string, action: 'approve' | 'reject', notes?: string) {
    return post<{ plantId: string; action: string; newStatus: string }>(
        `/marketplace/admin/moderation/${plantId}`,
        { action, notes }
    );
}

export async function aiModeratePlant(plantId: string) {
    return post<{ plantId: string; moderation: ModerationResult }>(
        `/marketplace/admin/moderation/${plantId}/ai`
    );
}

export async function getAdminStats() {
    return get<{ stats: Record<string, string> }>('/marketplace/admin/stats');
}
