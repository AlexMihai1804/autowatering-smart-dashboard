import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
    QueryCommand,
    UpdateCommand
} from '@aws-sdk/lib-dynamodb';
import { config } from './config';

export interface OtaReleaseRecord {
    board_channel: string;
    version: string;
    board: string;
    channel: string;
    mandatory: boolean;
    notes: string;
    artifact_name: string;
    artifact_size_bytes: number | null;
    artifact_sha256: string;
    storage_key: string;
    download_url: string;
    published: boolean;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: {
        removeUndefinedValues: true,
        convertClassInstanceToMap: true
    }
});

function tableName(): string {
    const name = config.otaReleasesTable;
    if (!name) {
        throw Object.assign(new Error('OTA_RELEASES_TABLE is not configured'), { statusCode: 500 });
    }
    return name;
}

export function buildPartitionKey(board: string, channel: string): string {
    return `${board.trim().toLowerCase()}#${channel.trim().toLowerCase()}`;
}

export function normalizeVersion(version: string): string {
    return version.trim().replace(/^v/i, '');
}

export async function putOtaRelease(release: OtaReleaseRecord): Promise<void> {
    await docClient.send(new PutCommand({
        TableName: tableName(),
        Item: release
    }));
}

export async function getOtaRelease(board: string, channel: string, version: string): Promise<OtaReleaseRecord | null> {
    const pk = buildPartitionKey(board, channel);
    const ver = normalizeVersion(version);
    const out = await docClient.send(new GetCommand({
        TableName: tableName(),
        Key: { board_channel: pk, version: ver }
    }));
    return (out.Item as OtaReleaseRecord | undefined) || null;
}

export async function getLatestPublishedRelease(board: string, channel: string): Promise<OtaReleaseRecord | null> {
    const pk = buildPartitionKey(board, channel);
    // Query all published releases for this board#channel, sorted by version (descending).
    // Since version strings are semver, we fetch all and pick the highest.
    const out = await docClient.send(new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'board_channel = :pk',
        FilterExpression: 'published = :pub',
        ExpressionAttributeValues: {
            ':pk': pk,
            ':pub': true
        },
        ScanIndexForward: false
    }));

    const items = (out.Items || []) as OtaReleaseRecord[];
    if (items.length === 0) return null;

    // Pick the highest version by semver comparison
    let best = items[0];
    for (let i = 1; i < items.length; i++) {
        if (compareSemver(items[i].version, best.version) > 0) {
            best = items[i];
        }
    }
    return best;
}

export async function listReleases(board: string, channel: string, limit: number = 20): Promise<OtaReleaseRecord[]> {
    const pk = buildPartitionKey(board, channel);
    const out = await docClient.send(new QueryCommand({
        TableName: tableName(),
        KeyConditionExpression: 'board_channel = :pk',
        ExpressionAttributeValues: {
            ':pk': pk
        },
        ScanIndexForward: false,
        Limit: limit
    }));
    return (out.Items || []) as OtaReleaseRecord[];
}

export async function publishRelease(board: string, channel: string, version: string): Promise<OtaReleaseRecord | null> {
    const pk = buildPartitionKey(board, channel);
    const ver = normalizeVersion(version);
    const now = new Date().toISOString();

    try {
        const out = await docClient.send(new UpdateCommand({
            TableName: tableName(),
            Key: { board_channel: pk, version: ver },
            UpdateExpression: 'SET published = :pub, published_at = :pubAt, updated_at = :updatedAt',
            ConditionExpression: 'attribute_exists(board_channel)',
            ExpressionAttributeValues: {
                ':pub': true,
                ':pubAt': now,
                ':updatedAt': now
            },
            ReturnValues: 'ALL_NEW'
        }));
        return (out.Attributes as OtaReleaseRecord | undefined) || null;
    } catch (error: any) {
        if (error?.name === 'ConditionalCheckFailedException') {
            return null;
        }
        throw error;
    }
}

function parseVersionParts(version: string): number[] {
    return version
        .trim()
        .replace(/^v/i, '')
        .split(/[^\d]+/)
        .filter((part) => part.length > 0)
        .map((part) => Number.parseInt(part, 10))
        .filter((value) => Number.isFinite(value) && value >= 0);
}

function compareSemver(a: string, b: string): number {
    const aParts = parseVersionParts(a);
    const bParts = parseVersionParts(b);
    const length = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < length; i++) {
        const aVal = aParts[i] ?? 0;
        const bVal = bParts[i] ?? 0;
        if (aVal > bVal) return 1;
        if (aVal < bVal) return -1;
    }
    return 0;
}
