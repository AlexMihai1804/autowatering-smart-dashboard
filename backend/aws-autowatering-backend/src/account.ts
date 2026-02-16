import { adminDeleteUser, adminGetProfile, adminUpdateProfileAttributes, requireAuthenticatedUser } from './auth';
import { deleteUser, getUser, mergeUser } from './db';
import { readJsonBody } from './http';
import {
    isOriginAllowed,
    jsonResponse,
    sendJsonError
} from './shared';
import { RouteHandler } from './types';

const MAX_PROFILE_FIELD_LEN = 120;
const MAX_STATE_BYTES = 512 * 1024;
const ALLOWED_PROFILE_FIELDS = new Set([
    'displayName',
    'phone',
    'company',
    'country',
    'language',
    'unitSystem',
    'theme',
    'notificationsEnabled',
    'photoURL'
]);

function sanitizeProfile(input: unknown): Record<string, unknown> {
    const source = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(source)) {
        if (!ALLOWED_PROFILE_FIELDS.has(key)) continue;

        if (typeof value === 'string') {
            const normalized = value.trim();
            if (normalized.length === 0) continue;
            result[key] = normalized.slice(0, MAX_PROFILE_FIELD_LEN);
            continue;
        }

        if (typeof value === 'boolean' && key === 'notificationsEnabled') {
            result[key] = value;
            continue;
        }
    }

    return result;
}

function parseStatePayload(input: unknown): { payload: Record<string, unknown>; bytes: number } {
    const payload = (input && typeof input === 'object') ? input as Record<string, unknown> : {};
    const raw = JSON.stringify(payload);
    const bytes = Buffer.byteLength(raw, 'utf8');
    if (bytes > MAX_STATE_BYTES) {
        throw Object.assign(new Error(`State payload too large (${bytes} bytes). Max is ${MAX_STATE_BYTES}.`), { statusCode: 413 });
    }
    return { payload, bytes };
}

async function ensureUserDoc(uid: string, seed: Record<string, unknown>): Promise<void> {
    await mergeUser(uid, {
        ...seed,
        updatedAt: new Date().toISOString()
    });
}

export const getProfile: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'GET') {
        return sendJsonError(405, 'method_not_allowed', 'Use GET');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const cognitoProfile = await adminGetProfile(auth.uid);

        await ensureUserDoc(auth.uid, {
            profile: {
                displayName: cognitoProfile?.displayName || '',
                photoURL: cognitoProfile?.photoURL || '',
                language: null,
                unitSystem: null,
                theme: null,
                notificationsEnabled: null
            }
        });

        const user = await getUser(auth.uid);
        const profile = user?.profile && typeof user.profile === 'object' ? user.profile : {};

        return jsonResponse(200, {
            uid: auth.uid,
            email: cognitoProfile?.email || null,
            emailVerified: cognitoProfile?.emailVerified === true,
            displayName: cognitoProfile?.displayName || null,
            photoURL: cognitoProfile?.photoURL || null,
            createdAt: cognitoProfile?.createdAt || null,
            lastSignInAt: null,
            profile,
            updatedAt: typeof user?.updatedAt === 'string' ? user.updatedAt : null
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'profile_load_failed', error.message || 'Failed to load profile');
    }
};

export const updateProfile: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const body = readJsonBody(ctx);
        const profilePatch = sanitizeProfile(body.profile);

        if (Object.keys(profilePatch).length === 0) {
            return sendJsonError(400, 'invalid_profile', 'No valid profile fields provided.');
        }

        const now = new Date().toISOString();
        await mergeUser(auth.uid, {
            profile: {
                ...profilePatch,
                updatedAt: now
            },
            updatedAt: now
        });

        try {
            await adminUpdateProfileAttributes(auth.uid, {
                displayName: typeof profilePatch.displayName === 'string' ? profilePatch.displayName : undefined,
                photoURL: typeof profilePatch.photoURL === 'string' ? profilePatch.photoURL : undefined
            });
        } catch {
            // backend profile stays source of truth
        }

        const user = await getUser(auth.uid);
        return jsonResponse(200, {
            ok: true,
            profile: user?.profile || {},
            updatedAt: user?.updatedAt || now
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'profile_update_failed', error.message || 'Failed to update profile');
    }
};

export const getUserState: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'GET') {
        return sendJsonError(405, 'method_not_allowed', 'Use GET');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const user = await getUser(auth.uid);
        const state = user?.state && typeof user.state === 'object' ? user.state as Record<string, unknown> : null;

        return jsonResponse(200, {
            uid: auth.uid,
            state: state?.payload || null,
            updatedAt: state?.updatedAt || null,
            version: state?.version || null
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'user_state_load_failed', error.message || 'Failed to load user state');
    }
};

export const saveUserState: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const body = readJsonBody(ctx);
        const { payload, bytes } = parseStatePayload(body.state);
        const version = typeof body.version === 'string' ? body.version.slice(0, 64) : 'v1';
        const updatedAt = new Date().toISOString();

        await mergeUser(auth.uid, {
            state: {
                payload,
                bytes,
                version,
                updatedAt
            },
            updatedAt
        });

        return jsonResponse(200, {
            ok: true,
            bytes,
            version,
            updatedAt
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'user_state_save_failed', error.message || 'Failed to save user state');
    }
};

export const deleteMyAccount: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);

        const nowSeconds = Math.floor(Date.now() / 1000);
        const authTimeRaw = auth.claims.auth_time;
        const authTime = typeof authTimeRaw === 'number'
            ? authTimeRaw
            : (typeof authTimeRaw === 'string' ? Number.parseInt(authTimeRaw, 10) : NaN);
        const maxAgeSeconds = 10 * 60;

        if (!Number.isFinite(authTime) || nowSeconds - authTime > maxAgeSeconds) {
            return sendJsonError(401, 'recent_login_required', 'Recent login required. Please re-authenticate and try again.');
        }

        const body = readJsonBody(ctx);
        const confirmText = typeof body.confirmText === 'string' ? body.confirmText.trim().toUpperCase() : '';
        if (confirmText !== 'DELETE') {
            return sendJsonError(400, 'missing_delete_confirmation', 'Set confirmText to DELETE to confirm account removal.');
        }

        await deleteUser(auth.uid).catch(() => undefined);
        await adminDeleteUser(auth.uid);

        return jsonResponse(200, {
            ok: true,
            deleted: true
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'account_delete_failed', error.message || 'Failed to delete account');
    }
};
