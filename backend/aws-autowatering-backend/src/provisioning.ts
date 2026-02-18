import { timingSafeEqual } from 'node:crypto';
import { requireAuthenticatedUser } from './auth';
import { config } from './config';
import {
    claimProvisioningRecord,
    createProvisioningRecord,
    getDeviceAuditTrail,
    getProvisioningRecord,
    getProvisioningRecordBySerial,
    getUser,
    incrementSerialCounter,
    ProvisioningRecord,
    mergeUser,
    reactivateProvisioningRecord,
    revokeProvisioningRecord,
    unclaimProvisioningRecord,
    AuditEntry,
    appendProvisioningAudit
} from './db';
import { readJsonBody } from './http';
import { jsonResponse, sendJsonError } from './shared';
import { RequestContext } from './types';

const HW_ID_PATTERN = /^[A-Fa-f0-9:_-]{8,64}$/;
const SERIAL_PATTERN = /^\d{6}$/;

function normalizeHwId(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    if (!HW_ID_PATTERN.test(cleaned)) return null;
    return cleaned.toUpperCase();
}

function formatSerial(counter: number): string {
    return counter.toString().padStart(6, '0');
}

function buildThingName(serial: string): string {
    return `autowatering-${serial}`;
}

function normalizeSerial(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const cleaned = value.trim();
    if (!SERIAL_PATTERN.test(cleaned)) return null;
    return cleaned;
}

function safeEqual(a: string, b: string): boolean {
    const aa = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (aa.length !== bb.length) return false;
    return timingSafeEqual(aa, bb);
}

function isAuthorized(ctx: RequestContext): boolean {
    if (!config.factoryProvisionToken) {
        throw Object.assign(new Error('FACTORY_PROVISION_TOKEN is not configured'), { statusCode: 500 });
    }

    const token = ctx.headers['x-factory-token'];
    if (typeof token !== 'string' || token.trim().length === 0) return false;
    return safeEqual(token.trim(), config.factoryProvisionToken);
}

function sanitizeMetadata(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
        if (key.length > 64) continue;
        if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
            output[key] = entry;
        }
    }
    return Object.keys(output).length > 0 ? output : undefined;
}

function toResponse(record: ProvisioningRecord, created: boolean) {
    return jsonResponse(created ? 201 : 200, {
        ok: true,
        created,
        hw_id: record.hw_id,
        serial: record.serial,
        serial_seq: record.serial_seq,
        thing_name: record.thing_name,
        status: record.status,
        created_at: record.created_at,
        updated_at: record.updated_at,
        claimed_by_uid: record.claimed_by_uid || null,
        claimed_at: record.claimed_at || null
    });
}

export async function provisionDevice(ctx: RequestContext) {
    if (!isAuthorized(ctx)) {
        return sendJsonError(401, 'unauthorized', 'Invalid factory token');
    }

    const payload = readJsonBody(ctx);
    const hwId = normalizeHwId(payload.hw_id);
    if (!hwId) {
        return sendJsonError(400, 'invalid_hw_id', 'hw_id must be 8-64 chars [A-F0-9:_-]');
    }

    const existing = await getProvisioningRecord(hwId);
    if (existing) {
        return toResponse(existing, false);
    }

    const nextSerialValue = await incrementSerialCounter();
    const nowIso = new Date().toISOString();
    const serial = formatSerial(nextSerialValue);
    const record: ProvisioningRecord = {
        hw_id: hwId,
        serial,
        serial_seq: nextSerialValue,
        thing_name: buildThingName(serial),
        status: 'active',
        created_at: nowIso,
        updated_at: nowIso,
        metadata: sanitizeMetadata(payload.metadata)
    };

    const created = await createProvisioningRecord(record);
    if (created) {
        return toResponse(record, true);
    }

    const afterRace = await getProvisioningRecord(hwId);
    if (afterRace) {
        return toResponse(afterRace, false);
    }

    return sendJsonError(500, 'provisioning_failed', 'Unable to provision device at this time');
}

export async function claimDevice(ctx: RequestContext) {
    const auth = await requireAuthenticatedUser(ctx.headers);
    const payload = readJsonBody(ctx);
    const serial = normalizeSerial(payload.serial);

    if (!serial) {
        return sendJsonError(400, 'invalid_serial', 'serial must be exactly 6 digits');
    }

    const record = await getProvisioningRecordBySerial(serial);
    if (!record) {
        return sendJsonError(404, 'device_not_found', 'No provisioned device found for this serial');
    }

    const claimedAt = new Date().toISOString();
    const claimResult = await claimProvisioningRecord(record.hw_id, auth.uid, claimedAt);

    if (claimResult === 'owned_by_other') {
        return sendJsonError(409, 'already_claimed', 'Device is already assigned to another account');
    }
    if (claimResult === 'not_claimable') {
        return sendJsonError(409, 'not_claimable', 'Device cannot be claimed in current status');
    }

    await mergeUser(auth.uid, {
        devices: {
            [serial]: {
                serial,
                hw_id: record.hw_id,
                thing_name: record.thing_name,
                claimed_at: claimedAt,
                status: 'active'
            }
        },
        updatedAt: claimedAt
    });

    return jsonResponse(200, {
        ok: true,
        claimed: true,
        serial,
        hw_id: record.hw_id,
        thing_name: record.thing_name,
        owner_uid: auth.uid,
        claimed_at: claimedAt,
        already_owned: claimResult === 'already_owned'
    });
}

export async function getMyDevices(ctx: RequestContext) {
    const auth = await requireAuthenticatedUser(ctx.headers);
    const user = await getUser(auth.uid);

    const devicesMap = (user?.devices && typeof user.devices === 'object' && !Array.isArray(user.devices))
        ? user.devices as Record<string, unknown>
        : {};

    const devices = Object.values(devicesMap)
        .filter((entry) => typeof entry === 'object' && entry !== null)
        .map((entry) => entry as Record<string, unknown>)
        .map((entry) => ({
            serial: typeof entry.serial === 'string' ? entry.serial : null,
            hw_id: typeof entry.hw_id === 'string' ? entry.hw_id : null,
            thing_name: typeof entry.thing_name === 'string' ? entry.thing_name : null,
            status: typeof entry.status === 'string' ? entry.status : null,
            claimed_at: typeof entry.claimed_at === 'string' ? entry.claimed_at : null
        }))
        .filter((entry) => entry.serial !== null);

    return jsonResponse(200, {
        ok: true,
        owner_uid: auth.uid,
        count: devices.length,
        devices
    });
}

// ── Fleet lifecycle endpoints ───────────────────────────────────────

export async function unclaimDevice(ctx: RequestContext) {
    const auth = await requireAuthenticatedUser(ctx.headers);
    const payload = readJsonBody(ctx);
    const serial = normalizeSerial(payload.serial);

    if (!serial) {
        return sendJsonError(400, 'invalid_serial', 'serial must be exactly 6 digits');
    }

    const record = await getProvisioningRecordBySerial(serial);
    if (!record) {
        return sendJsonError(404, 'device_not_found', 'No provisioned device found for this serial');
    }

    const result = await unclaimProvisioningRecord(
        record.hw_id,
        auth.uid,
        typeof payload.reason === 'string' ? payload.reason.slice(0, 256) : undefined
    );

    if (result === 'not_found') {
        return sendJsonError(404, 'device_not_found', 'Device not found');
    }
    if (result === 'not_owned') {
        return sendJsonError(403, 'not_owned', 'You do not own this device');
    }
    if (result === 'not_active') {
        return sendJsonError(409, 'not_active', 'Device is not in active status');
    }

    // Remove device from user's devices map
    const user = await getUser(auth.uid);
    if (user?.devices && typeof user.devices === 'object' && !Array.isArray(user.devices)) {
        const devicesMap = user.devices as Record<string, unknown>;
        if (devicesMap[serial]) {
            delete devicesMap[serial];
            await mergeUser(auth.uid, {
                devices: devicesMap,
                updatedAt: new Date().toISOString()
            });
        }
    }

    return jsonResponse(200, {
        ok: true,
        unclaimed: true,
        serial,
        hw_id: record.hw_id
    });
}

export async function revokeDevice(ctx: RequestContext) {
    if (!isAuthorized(ctx)) {
        return sendJsonError(401, 'unauthorized', 'Invalid factory token');
    }

    const payload = readJsonBody(ctx);
    const hwId = normalizeHwId(payload.hw_id);
    if (!hwId) {
        return sendJsonError(400, 'invalid_hw_id', 'hw_id must be 8-64 chars [A-F0-9:_-]');
    }

    const result = await revokeProvisioningRecord(
        hwId,
        'admin',
        typeof payload.reason === 'string' ? payload.reason.slice(0, 256) : undefined
    );

    if (result === 'not_found') {
        return sendJsonError(404, 'device_not_found', 'Device not found');
    }
    if (result === 'already_revoked') {
        return sendJsonError(409, 'already_revoked', 'Device is already revoked');
    }

    return jsonResponse(200, { ok: true, revoked: true, hw_id: hwId });
}

export async function reactivateDevice(ctx: RequestContext) {
    if (!isAuthorized(ctx)) {
        return sendJsonError(401, 'unauthorized', 'Invalid factory token');
    }

    const payload = readJsonBody(ctx);
    const hwId = normalizeHwId(payload.hw_id);
    if (!hwId) {
        return sendJsonError(400, 'invalid_hw_id', 'hw_id must be 8-64 chars [A-F0-9:_-]');
    }

    const result = await reactivateProvisioningRecord(
        hwId,
        'admin',
        typeof payload.reason === 'string' ? payload.reason.slice(0, 256) : undefined
    );

    if (result === 'not_found') {
        return sendJsonError(404, 'device_not_found', 'Device not found');
    }
    if (result === 'already_active') {
        return sendJsonError(409, 'already_active', 'Device is already active');
    }

    return jsonResponse(200, { ok: true, reactivated: true, hw_id: hwId });
}

export async function getDeviceAudit(ctx: RequestContext) {
    if (!isAuthorized(ctx)) {
        return sendJsonError(401, 'unauthorized', 'Invalid factory token');
    }

    const hwId = normalizeHwId(ctx.event.queryStringParameters?.hw_id);
    if (!hwId) {
        return sendJsonError(400, 'invalid_hw_id', 'hw_id query param required (8-64 chars [A-F0-9:_-])');
    }

    const trail = await getDeviceAuditTrail(hwId);
    if (trail === null) {
        return sendJsonError(404, 'device_not_found', 'Device not found');
    }

    return jsonResponse(200, {
        ok: true,
        hw_id: hwId,
        count: trail.length,
        audit_trail: trail
    });
}
