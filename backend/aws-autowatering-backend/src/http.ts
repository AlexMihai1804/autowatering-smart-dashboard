import { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { corsHeadersForRequest } from './shared';
import { RequestContext } from './types';

export function readJsonBody(ctx: RequestContext): Record<string, unknown> {
    if (!ctx.rawBody || ctx.rawBody.length === 0) return {};
    const text = ctx.rawBody.toString('utf8').trim();
    if (!text) return {};
    try {
        const parsed = JSON.parse(text);
        return (parsed && typeof parsed === 'object') ? parsed as Record<string, unknown> : {};
    } catch {
        return {};
    }
}

export function responseWithCors(
    ctx: RequestContext,
    response: APIGatewayProxyStructuredResultV2
): APIGatewayProxyStructuredResultV2 {
    return {
        ...response,
        headers: {
            ...corsHeadersForRequest(ctx.headers),
            ...(response.headers || {})
        }
    };
}

export function preflightResponse(ctx: RequestContext): APIGatewayProxyStructuredResultV2 {
    return responseWithCors(ctx, {
        statusCode: 204,
        headers: {},
        body: ''
    });
}

export function getClientIp(ctx: RequestContext): string {
    const forwardedFor = ctx.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.trim().length > 0) {
        return forwardedFor.split(',')[0].trim();
    }
    const sourceIp = ctx.event.requestContext.http.sourceIp;
    return sourceIp || 'unknown';
}
