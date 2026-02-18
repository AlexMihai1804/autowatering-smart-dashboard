/**
 * Health / readiness check endpoints.
 *
 * Provides:
 *   GET /health            — shallow liveness (always 200)
 *   GET /health/deep       — deep readiness (DynamoDB tables reachable, config valid)
 *   GET /health/ota        — OTA subsystem status
 *   GET /health/stripe     — Stripe webhook readiness
 *   GET /health/provision  — Provisioning readiness
 */

import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { config } from './config';
import { jsonResponse, sendJsonError } from './shared';
import { RequestContext } from './types';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
    marshallOptions: { removeUndefinedValues: true }
});

interface CheckResult {
    name: string;
    ok: boolean;
    latencyMs: number;
    error?: string;
}

async function checkTable(tableName: string, keyName: string, keyValue: string): Promise<CheckResult> {
    const start = Date.now();
    try {
        await docClient.send(new GetCommand({
            TableName: tableName,
            Key: { [keyName]: keyValue },
            ProjectionExpression: keyName
        }));
        return { name: tableName, ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
        return { name: tableName, ok: false, latencyMs: Date.now() - start, error: err?.name || 'unknown' };
    }
}

function checkConfig(name: string, value: string | undefined): CheckResult {
    return { name, ok: !!value && value.trim().length > 0, latencyMs: 0 };
}

// ── Handlers ──────────────────────────────────────────────────────

/** Shallow liveness — always 200. */
export async function healthLiveness(_ctx: RequestContext) {
    return jsonResponse(200, {
        ok: true,
        status: 'alive',
        timestamp: new Date().toISOString()
    });
}

/** Deep readiness — checks DynamoDB tables + config. */
export async function healthDeep(_ctx: RequestContext) {
    const start = Date.now();

    const checks = await Promise.all([
        checkTable(config.usersTable, 'uid', '__health_probe__'),
        checkTable(config.rateLimitsTable, 'id', '__health_probe__'),
        checkTable(config.provisioningTable, 'hw_id', '__health_probe__'),
        ...(config.otaReleasesTable
            ? [checkTable(config.otaReleasesTable, 'board_channel', '__health_probe__')]
            : []),
        Promise.resolve(checkConfig('COGNITO_USER_POOL_ID', config.cognitoUserPoolId)),
        Promise.resolve(checkConfig('COGNITO_APP_CLIENT_ID', config.cognitoAppClientId)),
    ]);

    const allOk = checks.every(c => c.ok);
    const totalLatency = Date.now() - start;

    return jsonResponse(allOk ? 200 : 503, {
        ok: allOk,
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        latencyMs: totalLatency,
        checks
    });
}

/** OTA subsystem readiness. */
export async function healthOta(_ctx: RequestContext) {
    const checks: CheckResult[] = [
        checkConfig('OTA_RELEASES_TABLE', config.otaReleasesTable),
        checkConfig('OTA_S3_BUCKET', config.otaS3Bucket),
        checkConfig('OTA_ADMIN_TOKEN', config.otaAdminToken),
    ];

    if (config.otaReleasesTable) {
        checks.push(await checkTable(config.otaReleasesTable, 'board_channel', '__health_probe__'));
    }

    const allOk = checks.every(c => c.ok);
    return jsonResponse(allOk ? 200 : 503, {
        ok: allOk,
        subsystem: 'ota',
        timestamp: new Date().toISOString(),
        checks
    });
}

/** Stripe webhook readiness. */
export async function healthStripe(_ctx: RequestContext) {
    const checks: CheckResult[] = [
        checkConfig('STRIPE_SECRET_KEY', config.stripeSecretKey),
        checkConfig('STRIPE_WEBHOOK_SECRET', config.stripeWebhookSecret),
        checkConfig('STRIPE_MONTHLY_PRICE_ID', config.stripeMonthlyPriceId),
    ];

    const allOk = checks.every(c => c.ok);
    return jsonResponse(allOk ? 200 : 503, {
        ok: allOk,
        subsystem: 'stripe',
        timestamp: new Date().toISOString(),
        checks
    });
}

/** Provisioning readiness. */
export async function healthProvisioning(_ctx: RequestContext) {
    const checks: CheckResult[] = [
        checkConfig('PROVISIONING_TABLE', config.provisioningTable),
        checkConfig('FACTORY_PROVISION_TOKEN', config.factoryProvisionToken),
    ];

    if (config.provisioningTable) {
        checks.push(await checkTable(config.provisioningTable, 'hw_id', '__health_probe__'));
    }

    const allOk = checks.every(c => c.ok);
    return jsonResponse(allOk ? 200 : 503, {
        ok: allOk,
        subsystem: 'provisioning',
        timestamp: new Date().toISOString(),
        checks
    });
}
