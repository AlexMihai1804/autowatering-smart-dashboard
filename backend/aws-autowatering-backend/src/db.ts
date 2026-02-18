import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DeleteCommand,
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    ScanCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { config } from './config';

export interface UserRecord {
    uid: string;
    doc_version?: number;
    premium?: boolean;
    profile?: Record<string, unknown>;
    state?: Record<string, unknown>;
    subscription?: Record<string, unknown>;
    usage?: Record<string, unknown>;
    trial?: Record<string, unknown>;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface RateLimitRecord {
    id: string;
    scope: string;
    windowSec: number;
    windowStartedAtMs: number;
    count: number;
    updatedAt: string;
    expiresAt: number;
}

export interface ProvisioningRecord {
    hw_id: string;
    serial: string;
    serial_seq: number;
    thing_name: string;
    status: 'active' | 'revoked' | 'factory_only';
    created_at: string;
    updated_at: string;
    claimed_by_uid?: string;
    claimed_at?: string;
    metadata?: Record<string, unknown>;
    audit_trail?: AuditEntry[];
}

export interface AuditEntry {
    action: string;
    actor_uid: string;
    timestamp: string;
    reason?: string;
    details?: Record<string, unknown>;
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    }
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, patch: unknown): T {
    if (!isPlainObject(base) || !isPlainObject(patch)) {
        return patch as T;
    }

    const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        if (isPlainObject(value) && isPlainObject(output[key])) {
            output[key] = deepMerge(output[key] as Record<string, unknown>, value);
        } else {
            output[key] = value;
        }
    }
    return output as T;
}

export async function getUser(uid: string): Promise<UserRecord | null> {
    const out = await docClient.send(new GetCommand({
        TableName: config.usersTable,
        Key: { uid }
    }));
    return (out.Item as UserRecord | undefined) || null;
}

export async function putUser(user: UserRecord): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: config.usersTable,
        Item: user
    }));
}

export async function mergeUser(uid: string, patch: Record<string, unknown>): Promise<UserRecord> {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const existing = await getUser(uid);
        const base: UserRecord = existing || { uid };
        const merged = deepMerge(base, patch);
        merged.uid = uid;

        const currentVersion = typeof base.doc_version === 'number' ? base.doc_version : 0;
        merged.doc_version = currentVersion + 1;

        try {
            if (currentVersion === 0 && !existing) {
                // New document — condition: must not exist yet
                await docClient.send(new PutCommand({
                    TableName: config.usersTable,
                    Item: merged,
                    ConditionExpression: 'attribute_not_exists(uid)'
                }));
            } else {
                // Existing document — optimistic lock on doc_version
                await docClient.send(new PutCommand({
                    TableName: config.usersTable,
                    Item: merged,
                    ConditionExpression: 'doc_version = :expected OR attribute_not_exists(doc_version)',
                    ExpressionAttributeValues: {
                        ':expected': currentVersion
                    }
                }));
            }
            return merged;
        } catch (error: any) {
            if (error?.name === 'ConditionalCheckFailedException') {
                if (attempt < MAX_RETRIES - 1) {
                    // Brief backoff before retry
                    await new Promise(r => setTimeout(r, 50 * (attempt + 1)));
                    continue;
                }
                throw Object.assign(
                    new Error('Concurrent update conflict — please retry'),
                    { statusCode: 409, code: 'optimistic_lock_failed' }
                );
            }
            throw error;
        }
    }

    // Unreachable, but TypeScript wants it
    throw Object.assign(new Error('mergeUser: max retries exhausted'), { statusCode: 500 });
}

export async function deleteUser(uid: string): Promise<void> {
    await docClient.send(new DeleteCommand({
        TableName: config.usersTable,
        Key: { uid }
    }));
}

function getNestedValue(source: Record<string, unknown>, path: string[]): unknown {
    let current: unknown = source;
    for (const key of path) {
        if (!isPlainObject(current)) return undefined;
        current = current[key];
    }
    return current;
}

export async function findUserUidByPathValue(path: string[], value: string): Promise<string | null> {
    // Optimised: use GSI for known Stripe fields, fall back to scan otherwise
    if (path.length === 2 && path[0] === 'subscription') {
        if (path[1] === 'stripeCustomerId') {
            return findUserUidByStripeCustomerId(value);
        }
        if (path[1] === 'stripeSubscriptionId') {
            return findUserUidByStripeSubscriptionId(value);
        }
    }

    // Generic fallback scan (should no longer be needed for Stripe lookups)
    let lastEvaluatedKey: Record<string, unknown> | undefined = undefined;

    do {
        const out = await docClient.send(new ScanCommand({
            TableName: config.usersTable,
            ProjectionExpression: 'uid, subscription',
            ExclusiveStartKey: lastEvaluatedKey
        }));

        const items = (out.Items || []) as Array<Record<string, unknown>>;
        for (const item of items) {
            const nested = getNestedValue(item, path);
            if (typeof nested === 'string' && nested === value) {
                return typeof item.uid === 'string' ? item.uid : null;
            }
        }

        lastEvaluatedKey = out.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastEvaluatedKey);

    return null;
}

export async function findUserUidByStripeCustomerId(customerId: string): Promise<string | null> {
    const out = await docClient.send(new QueryCommand({
        TableName: config.usersTable,
        IndexName: 'stripe-customer-index',
        KeyConditionExpression: 'stripe_customer_id = :cid',
        ExpressionAttributeValues: {
            ':cid': customerId
        },
        Limit: 1
    }));

    const item = (out.Items || [])[0] as Record<string, unknown> | undefined;
    return item && typeof item.uid === 'string' ? item.uid : null;
}

export async function findUserUidByStripeSubscriptionId(subscriptionId: string): Promise<string | null> {
    const out = await docClient.send(new QueryCommand({
        TableName: config.usersTable,
        IndexName: 'stripe-subscription-index',
        KeyConditionExpression: 'stripe_subscription_id = :sid',
        ExpressionAttributeValues: {
            ':sid': subscriptionId
        },
        Limit: 1
    }));

    const item = (out.Items || [])[0] as Record<string, unknown> | undefined;
    return item && typeof item.uid === 'string' ? item.uid : null;
}

export async function getRateLimit(id: string): Promise<RateLimitRecord | null> {
    const out = await docClient.send(new GetCommand({
        TableName: config.rateLimitsTable,
        Key: { id }
    }));
    return (out.Item as RateLimitRecord | undefined) || null;
}

export async function putRateLimit(record: RateLimitRecord): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: config.rateLimitsTable,
        Item: record
    }));
}

export async function getProvisioningRecord(hwId: string): Promise<ProvisioningRecord | null> {
    const out = await docClient.send(new GetCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: hwId }
    }));
    return (out.Item as ProvisioningRecord | undefined) || null;
}

export async function incrementSerialCounter(): Promise<number> {
    const nowIso = new Date().toISOString();
    try {
        await docClient.send(new PutCommand({
            TableName: config.provisioningTable,
            Item: {
                hw_id: config.serialCounterKey,
                serial_counter: 0,
                updated_at: nowIso
            },
            ConditionExpression: 'attribute_not_exists(hw_id)'
        }));
    } catch (error: any) {
        if (error?.name !== 'ConditionalCheckFailedException') {
            throw error;
        }
    }

    const updateOut = await docClient.send(new UpdateCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: config.serialCounterKey },
        UpdateExpression: 'SET serial_counter = if_not_exists(serial_counter, :zero) + :inc, updated_at = :updatedAt',
        ExpressionAttributeValues: {
            ':zero': 0,
            ':inc': 1,
            ':updatedAt': nowIso
        },
        ReturnValues: 'UPDATED_NEW'
    }));

    const value = (updateOut.Attributes as Record<string, unknown> | undefined)?.serial_counter;
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw Object.assign(new Error('Invalid serial counter value'), { statusCode: 500 });
    }
    return Math.floor(value);
}

export async function createProvisioningRecord(record: ProvisioningRecord): Promise<boolean> {
    try {
        await docClient.send(new PutCommand({
            TableName: config.provisioningTable,
            Item: record,
            ConditionExpression: 'attribute_not_exists(hw_id)'
        }));
        return true;
    } catch (error: any) {
        if (error?.name === 'ConditionalCheckFailedException') {
            return false;
        }
        throw error;
    }
}

export async function getProvisioningRecordBySerial(serial: string): Promise<ProvisioningRecord | null> {
    const out = await docClient.send(new QueryCommand({
        TableName: config.provisioningTable,
        IndexName: 'serial-index',
        KeyConditionExpression: 'serial = :serial',
        ExpressionAttributeValues: {
            ':serial': serial
        },
        Limit: 1
    }));

    const item = (out.Items || [])[0] as ProvisioningRecord | undefined;
    return item || null;
}

export async function claimProvisioningRecord(
    hwId: string,
    uid: string,
    claimedAt: string
): Promise<'claimed' | 'already_owned' | 'owned_by_other' | 'not_claimable'> {
    try {
        await docClient.send(new UpdateCommand({
            TableName: config.provisioningTable,
            Key: { hw_id: hwId },
            UpdateExpression: 'SET claimed_by_uid = :uid, claimed_at = :claimedAt, updated_at = :updatedAt',
            ConditionExpression: '((attribute_not_exists(claimed_by_uid) OR claimed_by_uid = :uid) AND #status = :active)',
            ExpressionAttributeNames: {
                '#status': 'status'
            },
            ExpressionAttributeValues: {
                ':uid': uid,
                ':claimedAt': claimedAt,
                ':updatedAt': claimedAt,
                ':active': 'active'
            }
        }));
        return 'claimed';
    } catch (error: any) {
        if (error?.name !== 'ConditionalCheckFailedException') {
            throw error;
        }

        const existing = await getProvisioningRecord(hwId);
        if (!existing) {
            return 'not_claimable';
        }
        if (existing.status !== 'active') {
            return 'not_claimable';
        }
        if (existing.claimed_by_uid === uid) {
            return 'already_owned';
        }
        if (typeof existing.claimed_by_uid === 'string' && existing.claimed_by_uid.length > 0) {
            return 'owned_by_other';
        }
        return 'not_claimable';
    }
}

// ── Fleet lifecycle operations ──────────────────────────────────────

export async function unclaimProvisioningRecord(
    hwId: string,
    actorUid: string,
    reason?: string
): Promise<'unclaimed' | 'not_found' | 'not_owned' | 'not_active'> {
    const record = await getProvisioningRecord(hwId);
    if (!record) return 'not_found';
    if (record.status !== 'active') return 'not_active';
    if (record.claimed_by_uid !== actorUid) return 'not_owned';

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = {
        action: 'unclaim',
        actor_uid: actorUid,
        timestamp: now,
        reason: reason || 'User initiated unclaim'
    };

    await docClient.send(new UpdateCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: hwId },
        UpdateExpression: 'REMOVE claimed_by_uid, claimed_at SET updated_at = :now, audit_trail = list_append(if_not_exists(audit_trail, :empty), :entry)',
        ConditionExpression: 'claimed_by_uid = :uid AND #status = :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':uid': actorUid,
            ':now': now,
            ':active': 'active',
            ':entry': [auditEntry],
            ':empty': []
        }
    }));

    return 'unclaimed';
}

export async function revokeProvisioningRecord(
    hwId: string,
    actorUid: string,
    reason?: string
): Promise<'revoked' | 'not_found' | 'already_revoked'> {
    const record = await getProvisioningRecord(hwId);
    if (!record) return 'not_found';
    if (record.status === 'revoked') return 'already_revoked';

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = {
        action: 'revoke',
        actor_uid: actorUid,
        timestamp: now,
        reason: reason || 'Admin revoked device'
    };

    await docClient.send(new UpdateCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: hwId },
        UpdateExpression: 'SET #status = :revoked, updated_at = :now, audit_trail = list_append(if_not_exists(audit_trail, :empty), :entry)',
        ConditionExpression: '#status <> :revoked',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':revoked': 'revoked',
            ':now': now,
            ':entry': [auditEntry],
            ':empty': []
        }
    }));

    return 'revoked';
}

export async function reactivateProvisioningRecord(
    hwId: string,
    actorUid: string,
    reason?: string
): Promise<'reactivated' | 'not_found' | 'already_active'> {
    const record = await getProvisioningRecord(hwId);
    if (!record) return 'not_found';
    if (record.status === 'active') return 'already_active';

    const now = new Date().toISOString();
    const auditEntry: AuditEntry = {
        action: 'reactivate',
        actor_uid: actorUid,
        timestamp: now,
        reason: reason || 'Admin reactivated device'
    };

    await docClient.send(new UpdateCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: hwId },
        UpdateExpression: 'SET #status = :active, updated_at = :now, audit_trail = list_append(if_not_exists(audit_trail, :empty), :entry)',
        ConditionExpression: '#status <> :active',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
            ':active': 'active',
            ':now': now,
            ':entry': [auditEntry],
            ':empty': []
        }
    }));

    return 'reactivated';
}

export async function getDeviceAuditTrail(hwId: string): Promise<AuditEntry[] | null> {
    const record = await getProvisioningRecord(hwId);
    if (!record) return null;
    return record.audit_trail || [];
}

export async function appendProvisioningAudit(hwId: string, entry: AuditEntry): Promise<void> {
    await docClient.send(new UpdateCommand({
        TableName: config.provisioningTable,
        Key: { hw_id: hwId },
        UpdateExpression: 'SET audit_trail = list_append(if_not_exists(audit_trail, :empty), :entry), updated_at = :now',
        ExpressionAttributeValues: {
            ':entry': [entry],
            ':empty': [],
            ':now': entry.timestamp
        }
    }));
}
