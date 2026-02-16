import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';

export interface RequestContext {
    event: APIGatewayProxyEventV2;
    method: string;
    path: string;
    headers: Record<string, string | undefined>;
    rawBody: Buffer;
}

export type RouteHandler = (ctx: RequestContext) => Promise<APIGatewayProxyStructuredResultV2>;
