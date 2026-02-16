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
    const existing = await getUser(uid);
    const base: UserRecord = existing || { uid };
    const merged = deepMerge(base, patch);
    merged.uid = uid;
    await putUser(merged);
    return merged;
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
