import Stripe from 'stripe';
import { requireAuthenticatedUser } from './auth';
import { config } from './config';
import { findUserUidByPathValue, getUser, mergeUser } from './db';
import { readJsonBody } from './http';
import {
    isOriginAllowed,
    isPremiumStatus,
    jsonResponse,
    parseIsoFromUnix,
    readSubscriptionSnapshot,
    saveSubscriptionSnapshot,
    sendJsonError,
    textResponse
} from './shared';
import { RouteHandler } from './types';

const FREE_TRIAL_DAYS = 7;

let stripeClient: Stripe | null = null;
let stripeSecretCache = '';

function getStripeClient(): Stripe {
    const secret = config.stripeSecretKey;
    if (!secret) {
        throw Object.assign(new Error('STRIPE_SECRET_KEY is not configured'), { statusCode: 500 });
    }

    if (!stripeClient || stripeSecretCache !== secret) {
        stripeClient = new Stripe(secret);
        stripeSecretCache = secret;
    }
    return stripeClient;
}

function monthlyPriceIdFromConfig(): string {
    const priceId = config.stripeMonthlyPriceId;
    if (!priceId) {
        throw Object.assign(new Error('STRIPE_MONTHLY_PRICE_ID is not configured'), { statusCode: 500 });
    }
    return priceId;
}

function getAppBaseUrl(): string | null {
    const raw = config.appBaseUrl;
    if (!raw) return null;

    try {
        const url = new URL(raw);
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        return url.toString().replace(/\/$/, '');
    } catch {
        return null;
    }
}

function getAllowedReturnUrlSchemes(): Set<string> {
    const schemes = config.returnUrlAllowedSchemes
        .map((item) => item.trim().toLowerCase())
        .filter((item) => /^[a-z][a-z0-9+.-]*$/.test(item));

    if (schemes.length === 0) {
        return new Set(['https', 'http', 'autowatering', 'com.autowatering.smartdashboard']);
    }
    return new Set(schemes);
}

function getAllowedReturnUrlOrigins(): Set<string> {
    const origins = new Set<string>();
    for (const item of config.returnUrlAllowedOrigins) {
        const candidate = item.trim();
        if (!candidate) continue;
        try {
            const url = new URL(candidate);
            if (url.protocol === 'https:' || url.protocol === 'http:') {
                origins.add(url.origin);
            }
        } catch {
            // ignore invalid entries
        }
    }

    const appBase = getAppBaseUrl();
    if (appBase) {
        try {
            const url = new URL(appBase);
            origins.add(url.origin);
        } catch {
            // ignore APP_BASE_URL if malformed
        }
    }

    return origins;
}

function normalizeAbsoluteUrl(raw: unknown): string | null {
    if (typeof raw !== 'string' || raw.trim().length === 0) return null;

    try {
        const url = new URL(raw.trim());
        const scheme = url.protocol.replace(':', '').toLowerCase();
        const allowedSchemes = getAllowedReturnUrlSchemes();
        if (!allowedSchemes.has(scheme)) return null;

        if (scheme === 'http' || scheme === 'https') {
            const allowedOrigins = getAllowedReturnUrlOrigins();
            if (!allowedOrigins.has(url.origin)) return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

function resolveReturnUrl(candidate: unknown, fallbackPath: string): string | null {
    const hasCandidate = typeof candidate === 'string' && candidate.trim().length > 0;
    const normalized = normalizeAbsoluteUrl(candidate);
    if (normalized) return normalized;
    if (hasCandidate) return null;

    const appBase = getAppBaseUrl();
    if (!appBase) return null;
    return `${appBase}${fallbackPath.startsWith('/') ? fallbackPath : `/${fallbackPath}`}`;
}

function getRequestBaseUrl(headers: Record<string, string | undefined>): string | null {
    const host = headers.host;
    if (!host) return null;
    const forwardedProto = headers['x-forwarded-proto'];
    const proto = (forwardedProto || 'https').split(',')[0].trim().toLowerCase();
    const scheme = proto === 'http' || proto === 'https' ? proto : 'https';
    return `${scheme}://${host}`;
}

function wrapReturnUrlForStripe(ctx: { headers: Record<string, string | undefined> }, url: string): string {
    try {
        const parsed = new URL(url);
        const scheme = parsed.protocol.replace(':', '').toLowerCase();
        if (scheme === 'http' || scheme === 'https') {
            return url;
        }
    } catch {
        // If url is somehow not parseable, keep it and let Stripe validate.
        return url;
    }

    const base = getRequestBaseUrl(ctx.headers);
    if (!base) {
        throw Object.assign(new Error('Unable to resolve request base URL for Stripe return URLs'), { statusCode: 500 });
    }
    return `${base}/appReturn?to=${encodeURIComponent(url)}`;
}

export const appReturn: RouteHandler = async (ctx) => {
    if (ctx.method !== 'GET') {
        return sendJsonError(405, 'method_not_allowed', 'Use GET');
    }

    const raw = ctx.event.queryStringParameters?.to;
    const normalized = normalizeAbsoluteUrl(raw);
    if (!normalized) {
        return sendJsonError(400, 'invalid_return_url', 'Missing or invalid return URL.');
    }

    return {
        statusCode: 302,
        headers: {
            Location: normalized,
            'Cache-Control': 'no-store'
        },
        body: ''
    };
};

async function findUidBySubscriptionField(fieldPath: string, value: string): Promise<string | null> {
    if (fieldPath === 'subscription.stripeCustomerId') {
        return findUserUidByPathValue(['subscription', 'stripeCustomerId'], value);
    }
    if (fieldPath === 'subscription.stripeSubscriptionId') {
        return findUserUidByPathValue(['subscription', 'stripeSubscriptionId'], value);
    }
    return null;
}

async function resolveUidFromCustomer(stripe: Stripe, customerId: string): Promise<string | null> {
    try {
        const customer = await stripe.customers.retrieve(customerId);
        if (!customer.deleted) {
            const metadataUid = typeof customer.metadata?.uid === 'string'
                ? customer.metadata.uid
                : (typeof customer.metadata?.firebase_uid === 'string' ? customer.metadata.firebase_uid : '');
            if (metadataUid.trim().length > 0) {
                return metadataUid.trim();
            }
        }
    } catch {
        // fallback to local mapping
    }

    return findUidBySubscriptionField('subscription.stripeCustomerId', customerId);
}

function extractUidFromMetadata(metadata: any): string | null {
    if (!metadata || typeof metadata !== 'object') return null;
    const uid = typeof metadata.uid === 'string' && metadata.uid.trim().length > 0
        ? metadata.uid
        : metadata.firebase_uid;
    if (typeof uid === 'string' && uid.trim().length > 0) {
        return uid.trim();
    }
    return null;
}

async function syncUserFromStripeSubscription(uid: string, subscription: Stripe.Subscription, customerIdOverride?: string | null): Promise<any> {
    const monthlyPriceId = config.stripeMonthlyPriceId || null;
    const hasMonthlyPrice = subscription.items.data.some((item) => item.price?.id === monthlyPriceId);

    const customerId = customerIdOverride
        || (typeof subscription.customer === 'string' ? subscription.customer : null)
        || null;

    const snapshot = {
        uid,
        isPremium: isPremiumStatus(subscription.status),
        status: subscription.status || null,
        plan: hasMonthlyPrice ? 'monthly' : (subscription.items.data.length > 0 ? 'subscription' : null),
        currentPeriodEnd: parseIsoFromUnix(subscription.items.data[0]?.current_period_end ?? null),
        cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        source: 'stripe'
    };

    await saveSubscriptionSnapshot(uid, snapshot);

    const trialStart = parseIsoFromUnix(subscription.trial_start);
    const trialEnd = parseIsoFromUnix(subscription.trial_end);
    const hadTrial = Boolean(trialStart || trialEnd);
    if (hadTrial) {
        await mergeUser(uid, {
            trial: {
                used: true,
                startedAt: trialStart,
                endedAt: trialEnd,
                updatedAt: new Date().toISOString()
            }
        });
    }

    return snapshot;
}

async function getOrCreateStripeCustomer(stripe: Stripe, uid: string, email?: string | null): Promise<string> {
    const existing = await readSubscriptionSnapshot(uid);
    if (typeof existing.stripeCustomerId === 'string' && existing.stripeCustomerId) {
        return existing.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: {
            uid,
            firebase_uid: uid
        }
    });

    await mergeUser(uid, {
        subscription: {
            stripeCustomerId: customer.id,
            updatedAt: new Date().toISOString()
        },
        // Top-level attribute for GSI lookup
        stripe_customer_id: customer.id,
        updatedAt: new Date().toISOString()
    });

    return customer.id;
}

function normalizeEmail(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized || !normalized.includes('@')) return null;
    return normalized;
}

function subscriptionPriority(status: string | null | undefined): number {
    if (status === 'active' || status === 'trialing') return 4;
    if (status === 'past_due' || status === 'unpaid') return 3;
    if (status === 'incomplete' || status === 'incomplete_expired') return 2;
    if (status === 'canceled') return 1;
    return 0;
}

function pickBestSubscription(subscriptions: Stripe.Subscription[]): Stripe.Subscription | null {
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) return null;
    const sorted = [...subscriptions].sort((a, b) => {
        const priorityDiff = subscriptionPriority(b.status) - subscriptionPriority(a.status);
        if (priorityDiff !== 0) return priorityDiff;
        const createdA = typeof a.created === 'number' ? a.created : 0;
        const createdB = typeof b.created === 'number' ? b.created : 0;
        return createdB - createdA;
    });
    return sorted[0] || null;
}

async function tryRecoverSubscriptionByEmail(uid: string, email: string): Promise<any | null> {
    const stripe = getStripeClient();
    const customers = await stripe.customers.list({ email, limit: 10 });

    for (const customer of customers.data) {
        if ((customer as any)?.deleted === true) continue;

        const customerId = customer.id;
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'all',
            limit: 10
        });

        const bestSubscription = pickBestSubscription(subscriptions.data);
        if (!bestSubscription) continue;

        const currentMetadataUid = typeof customer.metadata?.uid === 'string'
            ? customer.metadata.uid.trim()
            : (typeof customer.metadata?.firebase_uid === 'string' ? customer.metadata.firebase_uid.trim() : '');

        if (currentMetadataUid !== uid) {
            try {
                await stripe.customers.update(customerId, {
                    metadata: {
                        ...(customer.metadata || {}),
                        uid,
                        firebase_uid: uid
                    }
                });
            } catch {
                // ignore metadata update failures
            }
        }

        const recovered = await syncUserFromStripeSubscription(uid, bestSubscription, customerId);
        return {
            ...recovered,
            source: 'stripe_recovered_email'
        };
    }

    return null;
}

async function handleSubscriptionStatus(uid: string, claims?: Record<string, unknown>): Promise<any> {
    let snapshot = await readSubscriptionSnapshot(uid);

    if (!snapshot.stripeSubscriptionId) {
        const email = normalizeEmail(claims?.email);
        const emailVerified = claims?.email_verified === true || claims?.email_verified === 'true';
        if (email && emailVerified) {
            try {
                const recovered = await tryRecoverSubscriptionByEmail(uid, email);
                if (recovered) {
                    snapshot = recovered;
                }
            } catch {
                // ignore email recovery errors
            }
        }
    }

    if (snapshot.stripeSubscriptionId && typeof snapshot.stripeSubscriptionId === 'string') {
        try {
            const stripe = getStripeClient();
            const subscription = await stripe.subscriptions.retrieve(snapshot.stripeSubscriptionId);
            snapshot = await syncUserFromStripeSubscription(
                uid,
                subscription,
                typeof snapshot.stripeCustomerId === 'string' ? snapshot.stripeCustomerId : null
            );
            snapshot.source = 'stripe';
        } catch {
            // keep cached snapshot
        }
    }

    return snapshot;
}

async function handleStripeCheckoutSessionCompleted(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
    const customerId = typeof session.customer === 'string' ? session.customer : null;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;

    const metadataUid = extractUidFromMetadata(session.metadata);
    const referenceUid = typeof session.client_reference_id === 'string' ? session.client_reference_id : null;

    const uid = metadataUid
        || referenceUid
        || (customerId ? await resolveUidFromCustomer(stripe, customerId) : null);

    if (!uid) {
        return;
    }

    if (customerId) {
        await mergeUser(uid, {
            subscription: {
                stripeCustomerId: customerId,
                updatedAt: new Date().toISOString()
            },
            // Top-level attribute for GSI lookup
            stripe_customer_id: customerId,
            updatedAt: new Date().toISOString()
        });
    }

    if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await syncUserFromStripeSubscription(uid, subscription, customerId);
    }
}

async function handleStripeSubscriptionEvent(stripe: Stripe, subscription: Stripe.Subscription): Promise<void> {
    const metadataUid = extractUidFromMetadata(subscription.metadata);
    const customerId = typeof subscription.customer === 'string' ? subscription.customer : null;

    const uid = metadataUid
        || (customerId ? await resolveUidFromCustomer(stripe, customerId) : null)
        || await findUidBySubscriptionField('subscription.stripeSubscriptionId', subscription.id);

    if (!uid) return;
    await syncUserFromStripeSubscription(uid, subscription, customerId);
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
    const stripe = getStripeClient();
    switch (event.type) {
        case 'checkout.session.completed': {
            const session = event.data.object as Stripe.Checkout.Session;
            await handleStripeCheckoutSessionCompleted(stripe, session);
            return;
        }
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
            const subscription = event.data.object as Stripe.Subscription;
            await handleStripeSubscriptionEvent(stripe, subscription);
            return;
        }
        default:
            return;
    }
}

export const createSubscriptionCheckout: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const stripe = getStripeClient();
        const priceId = monthlyPriceIdFromConfig();
        const body = readJsonBody(ctx);

        const successUrl = resolveReturnUrl(body.successUrl, '/premium?checkout=success');
        const cancelUrl = resolveReturnUrl(body.cancelUrl, '/premium?checkout=cancelled');
        if (!successUrl || !cancelUrl) {
            return sendJsonError(
                400,
                'missing_return_urls',
                'Missing success/cancel URL. Send absolute URLs or set APP_BASE_URL env.'
                );
        }

        // Stripe Checkout/Billing Portal require http(s) return URLs.
        // For native apps we accept deep links (custom schemes) from the client and wrap them in an https
        // redirect endpoint on this API, which then 302s to the deep link.
        const stripeSuccessUrl = wrapReturnUrlForStripe(ctx, successUrl);
        const stripeCancelUrl = wrapReturnUrlForStripe(ctx, cancelUrl);

        const userData = await getUser(auth.uid);
        const subscription = userData?.subscription && typeof userData.subscription === 'object'
            ? userData.subscription as Record<string, unknown>
            : {};
        const hasAnySubscription = typeof subscription.stripeSubscriptionId === 'string'
            && subscription.stripeSubscriptionId.trim().length > 0;
        const trial = userData?.trial && typeof userData.trial === 'object'
            ? userData.trial as Record<string, unknown>
            : {};
        const trialUsed = trial.used === true || hasAnySubscription;
        const applyTrial = !trialUsed;

        const customerId = await getOrCreateStripeCustomer(stripe, auth.uid, typeof auth.claims.email === 'string' ? auth.claims.email : null);

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: customerId,
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: stripeSuccessUrl,
            cancel_url: stripeCancelUrl,
            allow_promotion_codes: true,
            ...(applyTrial ? { payment_method_collection: 'if_required' } : {}),
            client_reference_id: auth.uid,
            metadata: { uid: auth.uid, firebase_uid: auth.uid },
            subscription_data: {
                metadata: { uid: auth.uid, firebase_uid: auth.uid },
                ...(applyTrial ? { trial_period_days: FREE_TRIAL_DAYS } : {})
            }
        });

        return jsonResponse(200, {
            url: session.url,
            sessionId: session.id
        });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'checkout_failed', error.message || 'Checkout creation failed');
    }
};

export const createBillingPortalSession: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'POST') {
        return sendJsonError(405, 'method_not_allowed', 'Use POST');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const stripe = getStripeClient();
        const body = readJsonBody(ctx);

        const returnUrl = resolveReturnUrl(body.returnUrl, '/premium');
        if (!returnUrl) {
            return sendJsonError(400, 'missing_return_url', 'Missing return URL. Send absolute URL or set APP_BASE_URL env.');
        }

        const stripeReturnUrl = wrapReturnUrlForStripe(ctx, returnUrl);

        const customerId = await getOrCreateStripeCustomer(
            stripe,
            auth.uid,
            typeof auth.claims.email === 'string' ? auth.claims.email : null
        );
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: stripeReturnUrl
        });

        return jsonResponse(200, { url: session.url });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'billing_portal_failed', error.message || 'Billing portal creation failed');
    }
};

export const subscriptionStatus: RouteHandler = async (ctx) => {
    if (!isOriginAllowed(ctx.headers)) {
        return sendJsonError(403, 'origin_not_allowed', 'Origin is not allowed');
    }
    if (ctx.method !== 'GET') {
        return sendJsonError(405, 'method_not_allowed', 'Use GET');
    }

    try {
        const auth = await requireAuthenticatedUser(ctx.headers);
        const snapshot = await handleSubscriptionStatus(auth.uid, auth.claims);
        return jsonResponse(200, { uid: auth.uid, ...snapshot });
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        return sendJsonError(statusCode, 'subscription_status_failed', error.message || 'Failed to load subscription status');
    }
};

export const stripeWebhook: RouteHandler = async (ctx) => {
    if (ctx.method !== 'POST') {
        return textResponse(405, 'Use POST');
    }

    const signature = ctx.headers['stripe-signature'];
    if (!signature) {
        return textResponse(400, 'Missing Stripe signature');
    }

    if (!config.stripeWebhookSecret) {
        return textResponse(500, 'Missing STRIPE_WEBHOOK_SECRET');
    }

    if (!ctx.rawBody || ctx.rawBody.length === 0) {
        return textResponse(400, 'Missing raw body');
    }

    try {
        const stripe = getStripeClient();
        const event = stripe.webhooks.constructEvent(ctx.rawBody, signature, config.stripeWebhookSecret);
        await handleStripeEvent(event);
        return jsonResponse(200, { received: true });
    } catch (error: any) {
        return textResponse(400, `Webhook Error: ${error.message || 'invalid payload'}`);
    }
};
