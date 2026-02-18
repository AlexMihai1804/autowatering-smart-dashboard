import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from './config';

const s3Client = new S3Client({});

function bucket(): string {
    const name = config.otaS3Bucket;
    if (!name) {
        throw Object.assign(new Error('OTA_S3_BUCKET is not configured'), { statusCode: 500 });
    }
    return name;
}

/**
 * Build the S3 object key for an OTA release binary.
 * Convention: ota/{channel}/{board}/{version}/{artifactName}
 */
export function buildStorageKey(
    channel: string,
    board: string,
    version: string,
    artifactName: string
): string {
    const ch = channel.trim().toLowerCase();
    const bd = board.trim().toLowerCase();
    const ver = version.trim().replace(/^v/i, '');
    const name = artifactName.trim() || 'zephyr.signed.bin';
    return `ota/${ch}/${bd}/${ver}/${name}`;
}

/**
 * Generate a presigned PUT URL for uploading an OTA binary to S3.
 */
export async function getPresignedUploadUrl(
    storageKey: string,
    ttlSeconds: number = 900
): Promise<{ url: string; expiresIn: number }> {
    const command = new PutObjectCommand({
        Bucket: bucket(),
        Key: storageKey,
        ContentType: 'application/octet-stream'
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: ttlSeconds });
    return { url, expiresIn: ttlSeconds };
}

/**
 * Generate a presigned GET URL for downloading an OTA binary from S3.
 */
export async function getPresignedDownloadUrl(
    storageKey: string,
    ttlSeconds?: number
): Promise<{ url: string; expiresAt: string }> {
    const ttl = ttlSeconds || config.otaDownloadUrlTtlSeconds;
    const command = new GetObjectCommand({
        Bucket: bucket(),
        Key: storageKey
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: ttl });
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return { url, expiresAt };
}
