import { config } from './config';
import { readJsonBody } from './http';
import {
    buildPartitionKey,
    getLatestPublishedRelease,
    getOtaRelease,
    listReleases,
    normalizeVersion,
    OtaReleaseRecord,
    publishRelease,
    putOtaRelease
} from './otaDb';
import { buildStorageKey, getPresignedDownloadUrl, getPresignedUploadUrl } from './otaS3';
import { jsonResponse, sendJsonError } from './shared';
import { RouteHandler } from './types';

// ---------------------------------------------------------------------------
// Env-var fallback (legacy single-release config)
// ---------------------------------------------------------------------------

interface EnvReleaseConfig {
    version: string;
    channel: string;
    board: string;
    mandatory: boolean;
    notes: string;
    artifactName: string;
    artifactSizeBytes: number | null;
    artifactSha256: string;
    downloadUrl: string;
}

function trimOrEmpty(value: string | undefined): string {
    return typeof value === 'string' ? value.trim() : '';
}

function envBool(value: string | undefined, fallback: boolean): boolean {
    if (typeof value !== 'string') return fallback;
    const n = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(n)) return true;
    if (['0', 'false', 'no', 'off'].includes(n)) return false;
    return fallback;
}

function envOptionalInt(value: string | undefined): number | null {
    if (typeof value !== 'string' || value.trim().length === 0) return null;
    const parsed = Number.parseInt(value.trim(), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return Math.floor(parsed);
}

function getEnvConfig(): EnvReleaseConfig {
    return {
        version: trimOrEmpty(process.env.OTA_LATEST_VERSION),
        channel: trimOrEmpty(process.env.OTA_LATEST_CHANNEL) || 'stable',
        board: trimOrEmpty(process.env.OTA_LATEST_BOARD) || 'arduino_nano_33_ble',
        mandatory: envBool(process.env.OTA_LATEST_MANDATORY, false),
        notes: trimOrEmpty(process.env.OTA_LATEST_NOTES),
        artifactName: trimOrEmpty(process.env.OTA_LATEST_ARTIFACT_NAME) || 'zephyr.signed.bin',
        artifactSizeBytes: envOptionalInt(process.env.OTA_LATEST_ARTIFACT_SIZE_BYTES),
        artifactSha256: trimOrEmpty(process.env.OTA_LATEST_ARTIFACT_SHA256),
        downloadUrl: trimOrEmpty(process.env.OTA_LATEST_DOWNLOAD_URL)
    };
}

function isEnvConfigured(): boolean {
    return getEnvConfig().version.length > 0;
}

function isRegistryConfigured(): boolean {
    return config.otaReleasesTable.length > 0;
}

// ---------------------------------------------------------------------------
// Version helpers
// ---------------------------------------------------------------------------

function parseVersionParts(version: string): number[] {
    return version
        .trim()
        .replace(/^v/i, '')
        .split(/[^\d]+/)
        .filter((p) => p.length > 0)
        .map((p) => Number.parseInt(p, 10))
        .filter((v) => Number.isFinite(v) && v >= 0);
}

function compareFirmwareVersions(a: string, b: string): number {
    const ap = parseVersionParts(a);
    const bp = parseVersionParts(b);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i++) {
        const av = ap[i] ?? 0;
        const bv = bp[i] ?? 0;
        if (av > bv) return 1;
        if (av < bv) return -1;
    }
    return 0;
}

function versionsAreEquivalent(a: string, b: string): boolean {
    return compareFirmwareVersions(a, b) === 0;
}

function normalizeKey(value: string): string {
    return value.trim().toLowerCase();
}

function requestMatchesRelease(requested: string | undefined | null, expected: string): boolean {
    if (typeof requested !== 'string' || requested.trim().length === 0) return true;
    return normalizeKey(requested) === normalizeKey(expected);
}

// ---------------------------------------------------------------------------
// Admin auth
// ---------------------------------------------------------------------------

function requireAdminToken(headers: Record<string, string | undefined>): void {
    const token = config.otaAdminToken;
    if (!token) {
        throw Object.assign(new Error('OTA_ADMIN_TOKEN is not configured'), { statusCode: 500 });
    }
    const provided =
        headers['x-admin-token']
        || headers['authorization']?.replace(/^Bearer\s+/i, '')
        || '';
    if (!provided || provided !== token) {
        throw Object.assign(new Error('Unauthorized'), { statusCode: 401, code: 'admin_auth_required' });
    }
}

// ---------------------------------------------------------------------------
// Build payloads
// ---------------------------------------------------------------------------

function buildLatestFromRecord(record: OtaReleaseRecord, downloadInfo?: { url: string; expiresAt: string } | null): Record<string, unknown> {
    const latest: Record<string, unknown> = {
        version: record.version,
        channel: record.channel,
        mandatory: record.mandatory
    };

    const artifact: Record<string, unknown> = {};
    if (record.artifact_name) artifact.name = record.artifact_name;
    if (typeof record.artifact_size_bytes === 'number') artifact.size_bytes = record.artifact_size_bytes;
    if (record.artifact_sha256) artifact.sha256 = record.artifact_sha256;
    if (Object.keys(artifact).length > 0) latest.artifact = artifact;

    if (record.notes) latest.notes = record.notes;

    if (downloadInfo) {
        latest.download = {
            url: downloadInfo.url,
            expires_at: downloadInfo.expiresAt
        };
    } else if (record.download_url) {
        latest.download = { url: record.download_url };
    }

    return latest;
}

function buildLatestFromEnv(cfg: EnvReleaseConfig): Record<string, unknown> {
    const latest: Record<string, unknown> = {
        version: cfg.version,
        channel: cfg.channel,
        mandatory: cfg.mandatory
    };

    const artifact: Record<string, unknown> = {};
    if (cfg.artifactName) artifact.name = cfg.artifactName;
    if (typeof cfg.artifactSizeBytes === 'number') artifact.size_bytes = cfg.artifactSizeBytes;
    if (cfg.artifactSha256) artifact.sha256 = cfg.artifactSha256;
    if (Object.keys(artifact).length > 0) latest.artifact = artifact;

    if (cfg.notes) latest.notes = cfg.notes;

    if (cfg.downloadUrl) {
        latest.download = { url: cfg.downloadUrl };
    }

    return latest;
}

// ---------------------------------------------------------------------------
// Helper to extract version from path
// ---------------------------------------------------------------------------

function readVersionPathParam(path: string, pathParameters: Record<string, string | undefined> | undefined): string | null {
    const fromApi = pathParameters?.version;
    if (typeof fromApi === 'string' && fromApi.trim().length > 0) {
        return decodeURIComponent(fromApi.trim());
    }
    // Fallback: manual extraction from path
    const match = path.match(/\/ota\/releases\/([^/]+)\/(download-url|publish)\/?$/i);
    if (!match || !match[1]) return null;
    return decodeURIComponent(match[1]);
}

// ---------------------------------------------------------------------------
// GET /ota/latest  (public, reads from DB first, falls back to env)
// ---------------------------------------------------------------------------

export const otaGetLatest: RouteHandler = async (ctx) => {
    const query = ctx.event.queryStringParameters || {};
    const requestedChannel = query.channel;
    const requestedBoard = query.board;
    const currentVersion = trimOrEmpty(query.current_version);

    const channel = trimOrEmpty(requestedChannel) || 'stable';
    const board = trimOrEmpty(requestedBoard) || 'arduino_nano_33_ble';

    // Try DB-backed registry first
    if (isRegistryConfigured()) {
        try {
            const record = await getLatestPublishedRelease(board, channel);
            if (record) {
                const updateAvailable = currentVersion.length === 0 || compareFirmwareVersions(record.version, currentVersion) > 0;

                let downloadInfo: { url: string; expiresAt: string } | null = null;
                if (record.storage_key && config.otaS3Bucket) {
                    try {
                        downloadInfo = await getPresignedDownloadUrl(record.storage_key);
                    } catch {
                        // fall through to static download_url
                    }
                }

                return jsonResponse(200, {
                    ok: true,
                    update_available: updateAvailable,
                    latest: buildLatestFromRecord(record, downloadInfo)
                });
            }
        } catch {
            // DB query failed, fall through to env
        }
    }

    // Env-var fallback
    const envCfg = getEnvConfig();
    if (!envCfg.version) {
        return jsonResponse(200, { ok: true, update_available: false, latest: null });
    }

    if (!requestMatchesRelease(requestedChannel, envCfg.channel) || !requestMatchesRelease(requestedBoard, envCfg.board)) {
        return jsonResponse(200, { ok: true, update_available: false, latest: null });
    }

    const updateAvailable = currentVersion.length === 0 || compareFirmwareVersions(envCfg.version, currentVersion) > 0;

    return jsonResponse(200, {
        ok: true,
        update_available: updateAvailable,
        latest: buildLatestFromEnv(envCfg)
    });
};

// ---------------------------------------------------------------------------
// GET /ota/releases/{version}/download-url  (public)
// ---------------------------------------------------------------------------

export const otaGetDownloadUrl: RouteHandler = async (ctx) => {
    const query = ctx.event.queryStringParameters || {};
    const requestedChannel = query.channel;
    const requestedBoard = query.board;
    const requestedVersion = readVersionPathParam(ctx.path, ctx.event.pathParameters || undefined);

    if (!requestedVersion) {
        return sendJsonError(400, 'invalid_version', 'Missing or invalid release version.');
    }

    const channel = trimOrEmpty(requestedChannel) || 'stable';
    const board = trimOrEmpty(requestedBoard) || 'arduino_nano_33_ble';

    // Try DB-backed registry first
    if (isRegistryConfigured()) {
        try {
            const record = await getOtaRelease(board, channel, requestedVersion);
            if (record && record.published) {
                if (record.storage_key && config.otaS3Bucket) {
                    const downloadInfo = await getPresignedDownloadUrl(record.storage_key);
                    return jsonResponse(200, {
                        ok: true,
                        version: record.version,
                        url: downloadInfo.url,
                        download: {
                            url: downloadInfo.url,
                            expires_at: downloadInfo.expiresAt
                        }
                    });
                }

                if (record.download_url) {
                    return jsonResponse(200, {
                        ok: true,
                        version: record.version,
                        url: record.download_url,
                        download: { url: record.download_url }
                    });
                }

                return sendJsonError(503, 'download_not_configured', 'OTA download URL is not configured for this release.');
            }
        } catch {
            // fall through to env
        }
    }

    // Env-var fallback
    const envCfg = getEnvConfig();
    if (
        !isEnvConfigured()
        || !versionsAreEquivalent(requestedVersion, envCfg.version)
        || !requestMatchesRelease(requestedChannel, envCfg.channel)
        || !requestMatchesRelease(requestedBoard, envCfg.board)
    ) {
        return sendJsonError(404, 'release_not_found', 'Requested OTA release is not available.');
    }

    if (!envCfg.downloadUrl) {
        return sendJsonError(503, 'download_not_configured', 'OTA download URL is not configured for this release.');
    }

    return jsonResponse(200, {
        ok: true,
        version: envCfg.version,
        url: envCfg.downloadUrl,
        download: { url: envCfg.downloadUrl }
    });
};

// ---------------------------------------------------------------------------
// POST /ota/releases  (admin - create release + presigned upload URL)
// ---------------------------------------------------------------------------

export const otaCreateRelease: RouteHandler = async (ctx) => {
    requireAdminToken(ctx.headers);

    if (!isRegistryConfigured()) {
        return sendJsonError(500, 'registry_not_configured', 'OTA_RELEASES_TABLE is not configured.');
    }

    const body = readJsonBody(ctx);

    const version = normalizeVersion(typeof body.version === 'string' ? body.version : '');
    const channel = normalizeKey(typeof body.channel === 'string' ? body.channel : 'stable') || 'stable';
    const board = normalizeKey(typeof body.board === 'string' ? body.board : 'arduino_nano_33_ble') || 'arduino_nano_33_ble';
    const mandatory = body.mandatory === true;
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';
    const artifactName = typeof body.artifact_name === 'string' ? body.artifact_name.trim() : 'zephyr.signed.bin';
    const artifactSizeBytes = typeof body.artifact_size_bytes === 'number' && Number.isFinite(body.artifact_size_bytes) && body.artifact_size_bytes >= 0
        ? Math.floor(body.artifact_size_bytes) : null;
    const artifactSha256 = typeof body.artifact_sha256 === 'string' ? body.artifact_sha256.trim().toLowerCase() : '';

    if (!version) {
        return sendJsonError(400, 'missing_version', 'version is required.');
    }

    // Check for duplicates
    const existing = await getOtaRelease(board, channel, version);
    if (existing) {
        return sendJsonError(409, 'release_exists', `Release ${version} for ${board}/${channel} already exists.`);
    }

    const storageKey = buildStorageKey(channel, board, version, artifactName);
    const now = new Date().toISOString();

    const record: OtaReleaseRecord = {
        board_channel: buildPartitionKey(board, channel),
        version,
        board,
        channel,
        mandatory,
        notes,
        artifact_name: artifactName,
        artifact_size_bytes: artifactSizeBytes,
        artifact_sha256: artifactSha256,
        storage_key: storageKey,
        download_url: '',
        published: false,
        published_at: null,
        created_at: now,
        updated_at: now
    };

    await putOtaRelease(record);

    // Generate presigned upload URL if S3 bucket is configured
    let uploadUrl: string | null = null;
    let uploadExpiresIn: number | null = null;
    if (config.otaS3Bucket) {
        const upload = await getPresignedUploadUrl(storageKey);
        uploadUrl = upload.url;
        uploadExpiresIn = upload.expiresIn;
    }

    return jsonResponse(201, {
        ok: true,
        version,
        channel,
        board,
        storage_key: storageKey,
        upload_url: uploadUrl,
        upload_expires_in: uploadExpiresIn
    });
};

// ---------------------------------------------------------------------------
// POST /ota/releases/{version}/publish  (admin - mark release as published)
// ---------------------------------------------------------------------------

export const otaPublishRelease: RouteHandler = async (ctx) => {
    requireAdminToken(ctx.headers);

    if (!isRegistryConfigured()) {
        return sendJsonError(500, 'registry_not_configured', 'OTA_RELEASES_TABLE is not configured.');
    }

    const requestedVersion = readVersionPathParam(ctx.path, ctx.event.pathParameters || undefined);
    if (!requestedVersion) {
        return sendJsonError(400, 'invalid_version', 'Missing or invalid release version.');
    }

    const query = ctx.event.queryStringParameters || {};
    const body = readJsonBody(ctx);
    const channel = normalizeKey(typeof body.channel === 'string' ? body.channel : (typeof query.channel === 'string' ? query.channel : 'stable')) || 'stable';
    const board = normalizeKey(typeof body.board === 'string' ? body.board : (typeof query.board === 'string' ? query.board : 'arduino_nano_33_ble')) || 'arduino_nano_33_ble';

    const updated = await publishRelease(board, channel, requestedVersion);
    if (!updated) {
        return sendJsonError(404, 'release_not_found', `Release ${requestedVersion} for ${board}/${channel} not found.`);
    }

    return jsonResponse(200, {
        ok: true,
        version: updated.version,
        channel: updated.channel,
        board: updated.board,
        published: true,
        published_at: updated.published_at
    });
};

// ---------------------------------------------------------------------------
// GET /ota/releases  (admin - list releases)
// ---------------------------------------------------------------------------

export const otaListReleases: RouteHandler = async (ctx) => {
    requireAdminToken(ctx.headers);

    if (!isRegistryConfigured()) {
        return sendJsonError(500, 'registry_not_configured', 'OTA_RELEASES_TABLE is not configured.');
    }

    const query = ctx.event.queryStringParameters || {};
    const channel = normalizeKey(typeof query.channel === 'string' ? query.channel : 'stable') || 'stable';
    const board = normalizeKey(typeof query.board === 'string' ? query.board : 'arduino_nano_33_ble') || 'arduino_nano_33_ble';
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || '20', 10) || 20));

    const releases = await listReleases(board, channel, limit);

    return jsonResponse(200, {
        ok: true,
        count: releases.length,
        releases: releases.map((r) => ({
            version: r.version,
            channel: r.channel,
            board: r.board,
            mandatory: r.mandatory,
            published: r.published,
            published_at: r.published_at,
            artifact_name: r.artifact_name,
            artifact_size_bytes: r.artifact_size_bytes,
            artifact_sha256: r.artifact_sha256,
            notes: r.notes,
            created_at: r.created_at
        }))
    });
};
