import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { createHash } from 'node:crypto';
import { config } from './config';
import { getRateLimit, getUser, mergeUser, putRateLimit } from './db';

export type UsageFeature = 'aiDoctor' | 'plantId';

export interface UsageSnapshot {
    feature: UsageFeature;
    dayKey: string;
    dayCount: number;
    dayLimit: number;
    monthKey: string;
    monthCount: number;
    monthLimit: number;
    isPremium: boolean;
    updatedAt: string;
}

export const PREMIUM_STATUSES = new Set(['active', 'trialing']);
export const USAGE_FEATURES = new Set(['aiDoctor', 'plantId']);

export function normalizeHeaders(headers: Record<string, string | undefined> | undefined): Record<string, string | undefined> {
    const output: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(headers || {})) {
        output[key.toLowerCase()] = value;
    }
    return output;
}

export function parseBoolean(value: string | undefined, fallback: boolean): boolean {
    if (typeof value !== 'string') return fallback;
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return fallback;
}

export function parseInteger(value: string | undefined, fallback: number, min: number, max: number): number {
    if (typeof value !== 'string' || value.trim().length === 0) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

export function parseOptionalNumber(value: string | undefined): number | undefined {
    if (typeof value !== 'string' || value.trim().length === 0) return undefined;
    const parsed = Number.parseFloat(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseIsoFromUnix(unixSeconds: number | null | undefined): string | null {
    if (typeof unixSeconds !== 'number' || !Number.isFinite(unixSeconds) || unixSeconds <= 0) {
        return null;
    }
    return new Date(unixSeconds * 1000).toISOString();
}

export function isPremiumStatus(status: string | null | undefined): boolean {
    if (!status) return false;
    return PREMIUM_STATUSES.has(status);
}

function isReadableCorsOrigin(origin: string): boolean {
    try {
        const parsed = new URL(origin);
        return parsed.protocol === 'http:'
            || parsed.protocol === 'https:'
            || parsed.protocol === 'capacitor:'
            || parsed.protocol === 'ionic:';
    } catch {
        return false;
    }
}

export function isOriginAllowed(headers: Record<string, string | undefined>): boolean {
    const origin = headers.origin;
    if (!origin) return true;
    if (config.allowedOrigins.includes('*')) return true;
    return config.allowedOrigins.includes(origin);
}

export function corsHeadersForRequest(headers: Record<string, string | undefined>): Record<string, string> {
    const requestOrigin = headers.origin;
    // Some WebViews (notably Android) inject extra headers like X-Requested-With.
    // If we don't explicitly allow them, CORS preflights fail and fetch() throws a generic "Network error".
    const defaultAllowedHeaders = [
        'Content-Type',
        'Authorization',
        'X-Api-Key',
        'Stripe-Signature',
        'X-Requested-With'
    ];
    const requestedHeaders = (headers['access-control-request-headers'] || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const mergedHeaders = new Map<string, string>();
    for (const header of [...defaultAllowedHeaders, ...requestedHeaders]) {
        const normalized = header.toLowerCase();
        if (!mergedHeaders.has(normalized)) mergedHeaders.set(normalized, header);
    }
    const allowHeadersValue = Array.from(mergedHeaders.values()).join(',');
    const out: Record<string, string> = {
        Vary: 'Origin',
        'Access-Control-Allow-Methods': 'POST,GET,OPTIONS',
        'Access-Control-Allow-Headers': allowHeadersValue,
        'Access-Control-Max-Age': '3600'
    };

    if (requestOrigin && isReadableCorsOrigin(requestOrigin)) {
        out['Access-Control-Allow-Origin'] = requestOrigin;
    } else if (config.allowedOrigins.includes('*')) {
        out['Access-Control-Allow-Origin'] = '*';
    }

    return out;
}

export function jsonResponse(
    statusCode: number,
    payload: Record<string, unknown>,
    headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        },
        body: JSON.stringify(payload)
    };
}

export function textResponse(
    statusCode: number,
    body: string,
    headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
    return {
        statusCode,
        headers,
        body
    };
}

export function sendJsonError(
    statusCode: number,
    code: string,
    message: string,
    headers: Record<string, string> = {}
): APIGatewayProxyStructuredResultV2 {
    return jsonResponse(statusCode, {
        error: {
            code,
            message
        }
    }, headers);
}

function getUsageLimitEnv(feature: UsageFeature, tier: 'free' | 'premium', period: 'daily' | 'monthly'): number {
    const key = `${feature}_${period}_limit_${tier}`.toUpperCase();

    const defaults: Record<string, number> = {
        PLANTID_DAILY_LIMIT_FREE: 0,
        PLANTID_MONTHLY_LIMIT_FREE: 0,
        PLANTID_DAILY_LIMIT_PREMIUM: 20,
        PLANTID_MONTHLY_LIMIT_PREMIUM: 200,
        AIDOCTOR_DAILY_LIMIT_FREE: 0,
        AIDOCTOR_MONTHLY_LIMIT_FREE: 0,
        AIDOCTOR_DAILY_LIMIT_PREMIUM: 5,
        AIDOCTOR_MONTHLY_LIMIT_PREMIUM: 50
    };

    const fallback = defaults[key] ?? 0;
    return parseInteger(process.env[key], fallback, -1, 1_000_000);
}

function resolveUsageLimits(feature: UsageFeature, isPremium: boolean): { dayLimit: number; monthLimit: number } {
    const tier = isPremium ? 'premium' : 'free';
    return {
        dayLimit: getUsageLimitEnv(feature, tier, 'daily'),
        monthLimit: getUsageLimitEnv(feature, tier, 'monthly')
    };
}

function isoDayKey(now: Date): string {
    return now.toISOString().slice(0, 10);
}

function isoMonthKey(now: Date): string {
    return now.toISOString().slice(0, 7);
}

function readBooleanClaim(value: unknown): boolean {
    if (value === true) return true;
    if (typeof value === 'string') {
        return value.trim().toLowerCase() === 'true';
    }
    return false;
}

function readNestedUsage(source: Record<string, unknown>, feature: UsageFeature): Record<string, unknown> {
    const usage = source.usage;
    if (!usage || typeof usage !== 'object') return {};
    const featureEntry = (usage as Record<string, unknown>)[feature];
    if (!featureEntry || typeof featureEntry !== 'object') return {};
    return featureEntry as Record<string, unknown>;
}

function hashRateLimitId(scope: string, key: string): string {
    const hash = createHash('sha256')
        .update(`${config.rateLimitSalt}|${scope}|${key}`)
        .digest('hex');
    return `${scope}_${hash}`;
}

export async function consumeGlobalRateLimit(params: {
    scope: string;
    key: string;
    windowSec: number;
    maxRequests: number;
}): Promise<{ scope: string; windowStartedAtMs: number; count: number; windowSec: number; updatedAt: string }> {
    const scope = params.scope.trim();
    const key = params.key.trim();
    const windowSec = Math.max(1, Math.floor(params.windowSec));
    const maxRequests = Math.max(1, Math.floor(params.maxRequests));

    if (!scope || !key) {
        throw Object.assign(new Error('Invalid rate limit key'), { statusCode: 500 });
    }

    const id = hashRateLimitId(scope, key);
    const current = await getRateLimit(id);

    const now = new Date();
    const nowMs = now.getTime();
    const windowMs = windowSec * 1000;

    const storedStartedAtMs = typeof current?.windowStartedAtMs === 'number' ? current.windowStartedAtMs : 0;
    const storedCount = typeof current?.count === 'number' ? current.count : 0;

    const expired = !storedStartedAtMs || nowMs - storedStartedAtMs >= windowMs;
    const windowStartedAtMs = expired ? nowMs : storedStartedAtMs;
    const baseCount = expired ? 0 : storedCount;
    const nextCount = baseCount + 1;

    if (nextCount > maxRequests) {
        throw Object.assign(new Error('Too many requests. Try again later.'), {
            statusCode: 429,
            code: 'rate_limited',
            scope,
            windowSec,
            maxRequests
        });
    }

    const updatedAt = now.toISOString();
    await putRateLimit({
        id,
        scope,
        windowSec,
        windowStartedAtMs,
        count: nextCount,
        updatedAt,
        expiresAt: windowStartedAtMs + windowMs * 2
    });

    return { scope, windowStartedAtMs, count: nextCount, windowSec, updatedAt };
}

export async function consumeUsage(uid: string, feature: UsageFeature, claims?: Record<string, unknown> | null): Promise<UsageSnapshot> {
    if (!USAGE_FEATURES.has(feature)) {
        throw Object.assign(new Error('Invalid usage feature'), { statusCode: 500 });
    }

    const now = new Date();
    const dayKey = isoDayKey(now);
    const monthKey = isoMonthKey(now);

    const user = (await getUser(uid)) || { uid };
    const claimsPremium = readBooleanClaim(claims?.premium) || readBooleanClaim(claims?.['custom:premium']);
    const docSubscription = user.subscription && typeof user.subscription === 'object'
        ? user.subscription as Record<string, unknown>
        : {};
    const docStatus = typeof docSubscription.status === 'string' ? docSubscription.status : null;
    const docPremium = user.premium === true || isPremiumStatus(docStatus);
    const isPremium = claimsPremium || docPremium;

    const { dayLimit, monthLimit } = resolveUsageLimits(feature, isPremium);
    const entry = readNestedUsage(user, feature);

    const storedDayKey = typeof entry.dayKey === 'string' ? entry.dayKey : null;
    const storedMonthKey = typeof entry.monthKey === 'string' ? entry.monthKey : null;
    const prevDayCount = typeof entry.dayCount === 'number' && Number.isFinite(entry.dayCount) ? entry.dayCount : 0;
    const prevMonthCount = typeof entry.monthCount === 'number' && Number.isFinite(entry.monthCount) ? entry.monthCount : 0;

    const nextDayCount = (storedDayKey === dayKey ? prevDayCount : 0) + 1;
    const nextMonthCount = (storedMonthKey === monthKey ? prevMonthCount : 0) + 1;

    if (dayLimit >= 0 && nextDayCount > dayLimit) {
        throw Object.assign(new Error('Daily usage limit reached'), {
            statusCode: 429,
            code: 'daily_limit_reached',
            feature,
            dayLimit
        });
    }

    if (monthLimit >= 0 && nextMonthCount > monthLimit) {
        throw Object.assign(new Error('Monthly usage limit reached'), {
            statusCode: 429,
            code: 'monthly_limit_reached',
            feature,
            monthLimit
        });
    }

    const updatedAt = now.toISOString();
    await mergeUser(uid, {
        usage: {
            ...(user.usage && typeof user.usage === 'object' ? user.usage : {}),
            [feature]: {
                dayKey,
                dayCount: nextDayCount,
                monthKey,
                monthCount: nextMonthCount,
                updatedAt
            }
        },
        updatedAt
    });

    return {
        feature,
        dayKey,
        dayCount: nextDayCount,
        dayLimit,
        monthKey,
        monthCount: nextMonthCount,
        monthLimit,
        isPremium,
        updatedAt
    };
}

export async function readSubscriptionSnapshot(uid: string): Promise<Record<string, unknown>> {
    const user = await getUser(uid);
    const subscription = user?.subscription && typeof user.subscription === 'object'
        ? user.subscription as Record<string, unknown>
        : {};

    const status = typeof subscription.status === 'string' ? subscription.status : null;
    const premium = user?.premium === true || isPremiumStatus(status);

    return {
        uid,
        isPremium: premium,
        status,
        plan: typeof subscription.plan === 'string' ? subscription.plan : null,
        currentPeriodEnd: typeof subscription.currentPeriodEnd === 'string' ? subscription.currentPeriodEnd : null,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd === true,
        stripeCustomerId: typeof subscription.stripeCustomerId === 'string' ? subscription.stripeCustomerId : null,
        stripeSubscriptionId: typeof subscription.stripeSubscriptionId === 'string' ? subscription.stripeSubscriptionId : null,
        source: 'dynamodb'
    };
}

export async function saveSubscriptionSnapshot(uid: string, snapshot: Record<string, unknown>): Promise<void> {
    const stripeCustomerId = typeof snapshot.stripeCustomerId === 'string' && snapshot.stripeCustomerId
        ? snapshot.stripeCustomerId : undefined;
    const stripeSubscriptionId = typeof snapshot.stripeSubscriptionId === 'string' && snapshot.stripeSubscriptionId
        ? snapshot.stripeSubscriptionId : undefined;

    await mergeUser(uid, {
        premium: snapshot.isPremium === true,
        subscription: {
            status: snapshot.status ?? null,
            plan: snapshot.plan ?? null,
            currentPeriodEnd: snapshot.currentPeriodEnd ?? null,
            cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd === true,
            stripeCustomerId: snapshot.stripeCustomerId ?? null,
            stripeSubscriptionId: snapshot.stripeSubscriptionId ?? null,
            updatedAt: new Date().toISOString()
        },
        // Top-level attributes for GSI lookups (eliminates full table scan)
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updatedAt: new Date().toISOString()
    });
}
