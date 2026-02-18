import { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { deleteMyAccount, getProfile, getUserState, saveUserState, updateProfile } from './account';
import { aiDoctor, aiDoctorHealth } from './aiDoctor';
import { assertCoreConfig } from './config';
import { healthDeep, healthLiveness, healthOta, healthProvisioning, healthStripe } from './health';
import { preflightResponse, responseWithCors } from './http';
import { requestLogger } from './logger';
import { otaCreateRelease, otaGetDownloadUrl, otaGetLatest, otaListReleases, otaPublishRelease } from './ota';
import { plantId, plantIdHealth } from './plantId';
import { claimDevice, getDeviceAudit, getMyDevices, provisionDevice, reactivateDevice, revokeDevice, unclaimDevice } from './provisioning';
import { normalizeHeaders, sendJsonError } from './shared';
import {
    appReturn,
    createBillingPortalSession,
    createSubscriptionCheckout,
    stripeWebhook,
    subscriptionStatus
} from './subscriptions';
import { RequestContext, RouteHandler } from './types';

interface RouteDefinition {
    method: 'GET' | 'POST';
    path: string;
    handler: RouteHandler;
    cors: boolean;
}

const routes: RouteDefinition[] = [
    // Health / readiness
    { method: 'GET', path: '/health', handler: healthLiveness, cors: true },
    { method: 'GET', path: '/health/deep', handler: healthDeep, cors: true },
    { method: 'GET', path: '/health/ota', handler: healthOta, cors: true },
    { method: 'GET', path: '/health/stripe', handler: healthStripe, cors: true },
    { method: 'GET', path: '/health/provision', handler: healthProvisioning, cors: true },
    // AI / Plant ID
    { method: 'POST', path: '/aiDoctor', handler: aiDoctor, cors: true },
    { method: 'GET', path: '/aiDoctorHealth', handler: aiDoctorHealth, cors: true },
    { method: 'POST', path: '/plantId', handler: plantId, cors: true },
    { method: 'GET', path: '/plantIdHealth', handler: plantIdHealth, cors: true },
    { method: 'GET', path: '/subscriptionStatus', handler: subscriptionStatus, cors: true },
    { method: 'POST', path: '/createSubscriptionCheckout', handler: createSubscriptionCheckout, cors: true },
    { method: 'POST', path: '/createBillingPortalSession', handler: createBillingPortalSession, cors: true },
    { method: 'POST', path: '/stripeWebhook', handler: stripeWebhook, cors: false },
    { method: 'GET', path: '/appReturn', handler: appReturn, cors: true },
    { method: 'GET', path: '/getProfile', handler: getProfile, cors: true },
    { method: 'POST', path: '/updateProfile', handler: updateProfile, cors: true },
    { method: 'GET', path: '/getUserState', handler: getUserState, cors: true },
    { method: 'POST', path: '/saveUserState', handler: saveUserState, cors: true },
    { method: 'POST', path: '/deleteMyAccount', handler: deleteMyAccount, cors: true },
    { method: 'POST', path: '/provision', handler: provisionDevice, cors: true },
    { method: 'POST', path: '/claimDevice', handler: claimDevice, cors: true },
    { method: 'POST', path: '/unclaimDevice', handler: unclaimDevice, cors: true },
    { method: 'POST', path: '/revokeDevice', handler: revokeDevice, cors: true },
    { method: 'POST', path: '/reactivateDevice', handler: reactivateDevice, cors: true },
    { method: 'GET', path: '/deviceAudit', handler: getDeviceAudit, cors: true },
    { method: 'GET', path: '/myDevices', handler: getMyDevices, cors: true },
    { method: 'GET', path: '/ota/latest', handler: otaGetLatest, cors: true },
    { method: 'GET', path: '/ota/releases/{version}/download-url', handler: otaGetDownloadUrl, cors: true },
    { method: 'POST', path: '/ota/releases', handler: otaCreateRelease, cors: true },
    { method: 'POST', path: '/ota/releases/{version}/publish', handler: otaPublishRelease, cors: true },
    { method: 'GET', path: '/ota/releases', handler: otaListReleases, cors: true }
];

function normalizePath(path: string): string {
    if (!path || path === '/') return '/';
    const withLeadingSlash = path.startsWith('/') ? path : `/${path}`;
    return withLeadingSlash.replace(/\/+$/, '') || '/';
}

function splitPath(path: string): string[] {
    const normalized = normalizePath(path);
    if (normalized === '/') return [];
    return normalized.slice(1).split('/');
}

function isTemplateSegment(segment: string): boolean {
    return segment.startsWith('{') && segment.endsWith('}') && segment.length > 2;
}

function segmentsMatch(actualSegments: string[], expectedSegments: string[]): boolean {
    if (actualSegments.length !== expectedSegments.length) return false;

    for (let index = 0; index < expectedSegments.length; index += 1) {
        const expected = expectedSegments[index];
        const actual = actualSegments[index];
        if (isTemplateSegment(expected)) {
            if (!actual || actual.length === 0) return false;
            continue;
        }
        if (actual !== expected) return false;
    }

    return true;
}

function pathMatches(rawPath: string, expectedPath: string): boolean {
    const rawSegments = splitPath(rawPath);
    const expectedSegments = splitPath(expectedPath);

    if (segmentsMatch(rawSegments, expectedSegments)) {
        return true;
    }

    if (rawSegments.length > expectedSegments.length) {
        const suffix = rawSegments.slice(rawSegments.length - expectedSegments.length);
        if (segmentsMatch(suffix, expectedSegments)) {
            return true;
        }
    }

    return false;
}

function decodeRawBody(body: string | undefined, isBase64Encoded: boolean): Buffer {
    if (!body) return Buffer.alloc(0);
    return Buffer.from(body, isBase64Encoded ? 'base64' : 'utf8');
}

function findRoute(method: string, path: string): RouteDefinition | null {
    const normalizedMethod = method.toUpperCase();
    for (const route of routes) {
        if (route.method !== normalizedMethod) continue;
        if (pathMatches(path, route.path)) {
            return route;
        }
    }
    return null;
}

export const main: APIGatewayProxyHandlerV2 = async (event): Promise<APIGatewayProxyStructuredResultV2> => {
    const startMs = Date.now();
    const method = (event.requestContext?.http?.method || 'GET').toUpperCase();
    const path = event.rawPath || event.requestContext?.http?.path || '/';
    const headers = normalizeHeaders(event.headers as Record<string, string | undefined>);
    const rawBody = decodeRawBody(event.body, event.isBase64Encoded === true);
    const log = requestLogger(event);

    try {
        assertCoreConfig();
    } catch (error: any) {
        const response = sendJsonError(500, 'config_error', error?.message || 'Missing backend configuration');
        log.error('Config assertion failed', { statusCode: 500, latencyMs: Date.now() - startMs });
        return responseWithCors({
            event,
            method,
            path,
            headers,
            rawBody
        }, response);
    }

    const route = findRoute(method, path);
    if (!route && method !== 'OPTIONS') {
        log.warn('Route not found', { statusCode: 404, latencyMs: Date.now() - startMs });
        return responseWithCors({
            event,
            method,
            path,
            headers,
            rawBody
        }, sendJsonError(404, 'not_found', 'Route not found'));
    }

    const context: RequestContext = {
        event,
        method,
        path,
        headers,
        rawBody
    };

    if (method === 'OPTIONS') {
        return preflightResponse(context);
    }

    if (!route) {
        log.warn('Route not found (post-options)', { statusCode: 404, latencyMs: Date.now() - startMs });
        return responseWithCors(context, sendJsonError(404, 'not_found', 'Route not found'));
    }

    try {
        const response = await route.handler(context);
        const statusCode = typeof response.statusCode === 'number' ? response.statusCode : 200;
        log.info('Request completed', { statusCode, latencyMs: Date.now() - startMs });
        return route.cors ? responseWithCors(context, response) : response;
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        log.error('Request failed', {
            statusCode,
            latencyMs: Date.now() - startMs,
            errorCode: error?.code || error?.name || 'unknown',
            errorMessage: error?.message
        });
        const errorResponse = sendJsonError(statusCode, 'internal_error', error?.message || 'Unexpected server error');
        return route.cors ? responseWithCors(context, errorResponse) : errorResponse;
    }
};
