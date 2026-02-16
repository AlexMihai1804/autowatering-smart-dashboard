import { APIGatewayProxyHandlerV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { deleteMyAccount, getProfile, getUserState, saveUserState, updateProfile } from './account';
import { aiDoctor, aiDoctorHealth } from './aiDoctor';
import { assertCoreConfig } from './config';
import { preflightResponse, responseWithCors } from './http';
import { plantId, plantIdHealth } from './plantId';
import { claimDevice, getMyDevices, provisionDevice } from './provisioning';
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
    { method: 'GET', path: '/myDevices', handler: getMyDevices, cors: true }
];

function pathMatches(rawPath: string, expectedPath: string): boolean {
    if (rawPath === expectedPath) return true;
    if (rawPath.endsWith(expectedPath)) return true;
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
    const method = (event.requestContext?.http?.method || 'GET').toUpperCase();
    const path = event.rawPath || event.requestContext?.http?.path || '/';
    const headers = normalizeHeaders(event.headers as Record<string, string | undefined>);
    const rawBody = decodeRawBody(event.body, event.isBase64Encoded === true);

    try {
        assertCoreConfig();
    } catch (error: any) {
        const response = sendJsonError(500, 'config_error', error?.message || 'Missing backend configuration');
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
        return responseWithCors(context, sendJsonError(404, 'not_found', 'Route not found'));
    }

    try {
        const response = await route.handler(context);
        return route.cors ? responseWithCors(context, response) : response;
    } catch (error: any) {
        const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
        const errorResponse = sendJsonError(statusCode, 'internal_error', error?.message || 'Unexpected server error');
        return route.cors ? responseWithCors(context, errorResponse) : errorResponse;
    }
};
