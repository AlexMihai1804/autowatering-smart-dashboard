import { BleClient } from '@capacitor-community/bluetooth-le';
import { BleService } from './BleService';
import { decodeCbor, encodeCbor, CborMap, CborValue } from './otaCbor';
import { SMP_CHARACTERISTIC_UUID, SMP_SERVICE_UUID } from '../types/uuids';
import { TaskStatus } from '../types/firmware_structs';
import { useAppStore } from '../store/useAppStore';
import { sha256 as sha256Fallback } from '@noble/hashes/sha2.js';

const SMP_OP_READ = 0;
const SMP_OP_READ_RESPONSE = 1;
const SMP_OP_WRITE = 2;
const SMP_OP_WRITE_RESPONSE = 3;

const SMP_GROUP_OS = 0;
const SMP_GROUP_IMAGE = 1;

const SMP_ID_IMAGE_STATE = 0;
const SMP_ID_IMAGE_UPLOAD = 1;
const SMP_ID_OS_RESET = 5;

export type OtaPhase =
  | 'preflight'
  | 'upload'
  | 'test'
  | 'reboot'
  | 'reconnect'
  | 'validate'
  | 'done';

export interface OtaProgress {
  phase: OtaPhase;
  percent: number;
  transferredBytes: number;
  totalBytes: number;
  message: string;
}

export interface OtaInstallOptions {
  binary: Uint8Array;
  targetVersion?: string;
  onProgress?: (progress: OtaProgress) => void;
}

export interface OtaInstallResult {
  uploadedBytes: number;
  targetVersion?: string;
  runningVersion?: string;
  activeHashHex: string;
}

interface SmpPacket {
  op: number;
  flags: number;
  length: number;
  group: number;
  seq: number;
  id: number;
  payload: Uint8Array;
}

interface SmpCharacteristicCapabilities {
  notify: boolean;
  write: boolean;
  writeWithoutResponse: boolean;
}

type SmpWriteMode = 'write' | 'writeWithoutResponse';

interface SmpImageState {
  slot: number | null;
  version?: string;
  hash?: Uint8Array;
  pending?: boolean;
  confirmed?: boolean;
  active?: boolean;
}

type SmpRequestFn = (
  op: number,
  group: number,
  id: number,
  payload: CborMap,
  timeoutMs?: number
) => Promise<CborMap>;

function isCborMap(value: CborValue | undefined): value is CborMap {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Uint8Array);
}

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function concatBytes(left: Uint8Array, right: Uint8Array): Uint8Array {
  if (left.length === 0) return right;
  if (right.length === 0) return left;
  const merged = new Uint8Array(left.length + right.length);
  merged.set(left);
  merged.set(right, left.length);
  return merged;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export class OtaBleService {
  private static instance: OtaBleService;
  private sequence = 0;

  public static getInstance(): OtaBleService {
    if (!OtaBleService.instance) {
      OtaBleService.instance = new OtaBleService();
    }
    return OtaBleService.instance;
  }

  public async isSmpServiceAvailable(): Promise<boolean> {
    const deviceId = useAppStore.getState().connectedDeviceId;
    if (!deviceId) return false;

    try {
      const capabilities = await this.readSmpCharacteristicCapabilities(deviceId);
      return Boolean(capabilities && capabilities.notify && (capabilities.write || capabilities.writeWithoutResponse));
    } catch {
      return false;
    }
  }

  public async installUpdate(options: OtaInstallOptions): Promise<OtaInstallResult> {
    const { binary, targetVersion, onProgress } = options;
    if (!binary || binary.length === 0) {
      throw new Error('Firmware binary is empty.');
    }

    const snapshot = useAppStore.getState();
    const currentStatus = snapshot.currentTask?.status;
    if (currentStatus === TaskStatus.RUNNING || currentStatus === TaskStatus.PAUSED) {
      throw new Error('Stop active watering before running a firmware update.');
    }

    const initialDeviceId = snapshot.connectedDeviceId;
    if (!initialDeviceId) {
      throw new Error('No connected device.');
    }

    const bleService = BleService.getInstance();

    if (!(await this.isSmpServiceAvailable())) {
      throw new Error('SMP OTA service is not available on this device.');
    }

    const report = (phase: OtaPhase, percent: number, transferredBytes: number, totalBytes: number, message: string) => {
      onProgress?.({
        phase,
        percent: Math.max(0, Math.min(100, Math.round(percent))),
        transferredBytes,
        totalBytes,
        message
      });
    };

    report('preflight', 2, 0, binary.length, 'Preparing OTA session...');

    await bleService.beginOtaSession();
    try {
      const imageSha = await this.computeSha256(binary);
      let activeHashBefore: Uint8Array | null = null;
      let newImageHash: Uint8Array | null = null;

      await this.withSmpSession(initialDeviceId, async (request) => {
        const beforeImages = await this.fetchImageStates(request);
        activeHashBefore = this.pickActiveHash(beforeImages);

        report('upload', 5, 0, binary.length, 'Uploading firmware...');
        let offset = 0;
        const chunkSize = 128;

        while (offset < binary.length) {
          const nextChunkLength = Math.min(chunkSize, binary.length - offset);
          const payload: CborMap = {
            off: offset,
            data: binary.slice(offset, offset + nextChunkLength)
          };

          if (offset === 0) {
            payload.len = binary.length;
            payload.sha = imageSha;
          }

          const response = await this.withRetry(3, async () => {
            return request(SMP_OP_WRITE, SMP_GROUP_IMAGE, SMP_ID_IMAGE_UPLOAD, payload, 45000);
          });

          const responseOffset = this.readInt(response.off);
          if (responseOffset !== null && responseOffset > offset) {
            offset = Math.min(responseOffset, binary.length);
          } else {
            offset += nextChunkLength;
          }

          const uploadPercent = 5 + (offset / binary.length) * 70;
          report('upload', uploadPercent, offset, binary.length, 'Uploading firmware...');
        }

        report('test', 78, binary.length, binary.length, 'Finalizing upload...');
        const afterUploadImages = await this.fetchImageStates(request);
        newImageHash = this.pickUpdatedHash(afterUploadImages, activeHashBefore);

        if (!newImageHash) {
          throw new Error('Could not find uploaded image hash after transfer.');
        }

        await request(
          SMP_OP_WRITE,
          SMP_GROUP_IMAGE,
          SMP_ID_IMAGE_STATE,
          { hash: newImageHash, confirm: false },
          12000
        );

        report('reboot', 85, binary.length, binary.length, 'Rebooting device...');

        try {
          await request(SMP_OP_WRITE, SMP_GROUP_OS, SMP_ID_OS_RESET, {}, 5000);
        } catch {
          // Device may reset before responding.
        }
      });

      report('reconnect', 90, binary.length, binary.length, 'Reconnecting to device...');
      await this.reconnectAfterReset(initialDeviceId, report, binary.length);

      report('validate', 96, binary.length, binary.length, 'Validating new firmware...');

      const deviceIdAfterReconnect = useAppStore.getState().connectedDeviceId;
      if (!deviceIdAfterReconnect) {
        throw new Error('Reconnect succeeded but no active device was found.');
      }

      let activeHashAfter: Uint8Array | null = null;
      await this.withSmpSession(deviceIdAfterReconnect, async (request) => {
        const images = await this.fetchImageStates(request);
        activeHashAfter = this.pickActiveHash(images);

        if (newImageHash && activeHashAfter && !arraysEqual(newImageHash, activeHashAfter)) {
          throw new Error('Device booted into a different image after reboot.');
        }

        if (newImageHash) {
          try {
            await request(
              SMP_OP_WRITE,
              SMP_GROUP_IMAGE,
              SMP_ID_IMAGE_STATE,
              { hash: newImageHash, confirm: true },
              12000
            );
          } catch {
            // Some firmware builds auto-confirm; ignore explicit confirm failures.
          }
        }
      });

      let runningVersion: string | undefined;
      try {
        runningVersion = (await BleService.getInstance().readFirmwareRevision()) ?? undefined;
      } catch {
        // Best-effort only.
      }

      report('done', 100, binary.length, binary.length, 'Firmware update complete.');

      return {
        uploadedBytes: binary.length,
        targetVersion,
        runningVersion,
        activeHashHex: activeHashAfter ? bytesToHex(activeHashAfter) : ''
      };
    } finally {
      await bleService.endOtaSession();
    }
  }

  private async withSmpSession<T>(deviceId: string, callback: (request: SmpRequestFn) => Promise<T>): Promise<T> {
    const mtu = await this.readMtu(deviceId);
    const writeChunkSize = Math.max(20, Math.min(244, mtu - 3));
    const capabilities = await this.readSmpCharacteristicCapabilities(deviceId);
    if (!capabilities || !capabilities.notify || (!capabilities.write && !capabilities.writeWithoutResponse)) {
      throw new Error('SMP characteristic is missing notify/write capabilities.');
    }

    const writeMode: SmpWriteMode = capabilities.writeWithoutResponse ? 'writeWithoutResponse' : 'write';

    let rxBuffer: Uint8Array<ArrayBufferLike> = new Uint8Array(0);
    const responses = new Map<number, SmpPacket>();
    const pending = new Map<number, { resolve: (packet: SmpPacket) => void; reject: (error: Error) => void; timeoutId: ReturnType<typeof setTimeout> }>();

    const cleanupPending = () => {
      for (const [, item] of pending) {
        clearTimeout(item.timeoutId);
        item.reject(new Error('SMP session closed.'));
      }
      pending.clear();
      responses.clear();
      rxBuffer = new Uint8Array(0);
    };

    const onNotification = (value: DataView) => {
      const incoming = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      const bytes = Uint8Array.from(incoming);
      rxBuffer = concatBytes(rxBuffer as Uint8Array, bytes as Uint8Array) as Uint8Array<ArrayBufferLike>;

      while (rxBuffer.length >= 8) {
        const payloadLength = (rxBuffer[2] << 8) | rxBuffer[3];
        const totalLength = 8 + payloadLength;

        if (totalLength <= 8 || totalLength > 8192) {
          rxBuffer = rxBuffer.slice(1);
          continue;
        }

        if (rxBuffer.length < totalLength) {
          break;
        }

        const frame = rxBuffer.slice(0, totalLength);
        rxBuffer = rxBuffer.slice(totalLength);

        let packet: SmpPacket;
        try {
          packet = this.parseSmpPacket(frame);
        } catch {
          continue;
        }

        const resolver = pending.get(packet.seq);
        if (resolver) {
          clearTimeout(resolver.timeoutId);
          pending.delete(packet.seq);
          resolver.resolve(packet);
        } else {
          responses.set(packet.seq, packet);
        }
      }
    };

    const awaitResponse = (seq: number, timeoutMs: number): Promise<SmpPacket> => {
      const immediate = responses.get(seq);
      if (immediate) {
        responses.delete(seq);
        return Promise.resolve(immediate);
      }

      return new Promise<SmpPacket>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          pending.delete(seq);
          reject(new Error('SMP response timeout.'));
        }, timeoutMs);

        pending.set(seq, { resolve, reject, timeoutId });
      });
    };

    const writeFrame = async (frame: Uint8Array): Promise<void> => {
      for (let offset = 0; offset < frame.length; offset += writeChunkSize) {
        const end = Math.min(frame.length, offset + writeChunkSize);
        const chunk = frame.slice(offset, end);
        const view = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        await this.writeSmpChunk(deviceId, view, writeMode);
      }
    };

    const request: SmpRequestFn = async (op, group, id, payload, timeoutMs = 15000) => {
      const encodedPayload = encodeCbor(payload);
      const seq = this.nextSequence();
      responses.delete(seq);
      const frame = this.buildSmpPacket(op, group, id, seq, encodedPayload);

      await writeFrame(frame);

      const responsePacket = await awaitResponse(seq, timeoutMs);
      const expectedOp = op === SMP_OP_READ ? SMP_OP_READ_RESPONSE : SMP_OP_WRITE_RESPONSE;
      if ((responsePacket.op & 0x07) !== expectedOp) {
        throw new Error(`Unexpected SMP response opcode: ${responsePacket.op}`);
      }
      if (responsePacket.group !== group || responsePacket.id !== id) {
        throw new Error(`Unexpected SMP response route: group=${responsePacket.group} id=${responsePacket.id}`);
      }

      const decoded = decodeCbor(responsePacket.payload);
      if (!isCborMap(decoded)) {
        throw new Error('SMP response payload is not a CBOR map.');
      }

      const rc = this.extractRc(decoded);
      if (rc !== 0) {
        throw new Error(`SMP command failed with rc=${rc}.`);
      }

      return decoded;
    };

    try {
      try {
        await this.withTimeout(
          BleClient.stopNotifications(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID),
          9000,
          'SMP stopNotifications'
        );
      } catch {
        // Ignore stale subscriptions.
      }

      await this.startSmpNotificationsWithRetry(deviceId, onNotification);
      return await callback(request);
    } finally {
      cleanupPending();
      try {
        await this.withTimeout(
          BleClient.stopNotifications(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID),
          9000,
          'SMP stopNotifications'
        );
      } catch {
        // Ignore disconnect race on reset.
      }
    }
  }

  private async fetchImageStates(request: SmpRequestFn): Promise<SmpImageState[]> {
    const response = await request(SMP_OP_READ, SMP_GROUP_IMAGE, SMP_ID_IMAGE_STATE, {}, 12000);
    const imagesValue = response.images;
    if (!Array.isArray(imagesValue)) return [];

    const images: SmpImageState[] = [];
    for (const entry of imagesValue) {
      if (!isCborMap(entry)) continue;
      const slot = this.readInt(entry.slot);
      const version = this.readString(entry.version);
      const hash = this.readBytes(entry.hash);
      const pending = this.readBool(entry.pending);
      const confirmed = this.readBool(entry.confirmed);
      const active = this.readBool(entry.active);

      images.push({
        slot,
        version: version || undefined,
        hash: hash || undefined,
        pending: pending ?? undefined,
        confirmed: confirmed ?? undefined,
        active: active ?? undefined
      });
    }
    return images;
  }

  private pickActiveHash(images: SmpImageState[]): Uint8Array | null {
    const active = images.find((image) => image.active && image.hash);
    if (active?.hash) return active.hash;

    const confirmed = images.find((image) => image.confirmed && image.hash);
    if (confirmed?.hash) return confirmed.hash;

    const slot0 = images.find((image) => image.slot === 0 && image.hash);
    if (slot0?.hash) return slot0.hash;

    return null;
  }

  private pickUpdatedHash(images: SmpImageState[], previousActive: Uint8Array | null): Uint8Array | null {
    const candidates = images.filter((image) => {
      if (!image.hash) return false;
      if (!previousActive) return true;
      return !arraysEqual(image.hash, previousActive);
    });

    if (candidates.length === 0) return null;

    const pending = candidates.find((image) => image.pending && image.hash);
    if (pending?.hash) return pending.hash;

    const slot1 = candidates.find((image) => image.slot === 1 && image.hash);
    if (slot1?.hash) return slot1.hash;

    return candidates[0].hash || null;
  }

  private extractRc(payload: CborMap): number {
    const direct = this.readInt(payload.rc);
    if (direct !== null) return direct;

    if (isCborMap(payload.err)) {
      const nested = this.readInt(payload.err.rc);
      if (nested !== null) return nested;
    }

    return 0;
  }

  private buildSmpPacket(op: number, group: number, id: number, seq: number, payload: Uint8Array): Uint8Array {
    const frame = new Uint8Array(8 + payload.length);
    frame[0] = op & 0x07;
    frame[1] = 0;
    frame[2] = (payload.length >> 8) & 0xff;
    frame[3] = payload.length & 0xff;
    frame[4] = (group >> 8) & 0xff;
    frame[5] = group & 0xff;
    frame[6] = seq & 0xff;
    frame[7] = id & 0xff;
    frame.set(payload, 8);
    return frame;
  }

  private parseSmpPacket(frame: Uint8Array): SmpPacket {
    if (frame.length < 8) {
      throw new Error('SMP frame too short.');
    }

    const payloadLength = (frame[2] << 8) | frame[3];
    if (frame.length !== payloadLength + 8) {
      throw new Error('SMP payload length mismatch.');
    }

    return {
      op: frame[0] & 0x07,
      flags: frame[1],
      length: payloadLength,
      group: (frame[4] << 8) | frame[5],
      seq: frame[6],
      id: frame[7],
      payload: new Uint8Array(frame.slice(8))
    };
  }

  private nextSequence(): number {
    const current = this.sequence & 0xff;
    this.sequence = (this.sequence + 1) & 0xff;
    return current;
  }

  private async withRetry<T>(attempts: number, action: () => Promise<T>): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await action();
      } catch (error) {
        lastError = error;
        if (!this.isTransientError(error) || attempt === attempts) {
          throw error;
        }
        await this.delay(200 * attempt);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private isTransientError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      message.includes('timeout')
      || message.includes('disconnected')
      || message.includes('status code 201')
      || message.includes('writing characteristic failed')
      || message.includes('reading characteristic failed')
    );
  }

  private async reconnectAfterReset(
    deviceId: string,
    report: (phase: OtaPhase, percent: number, transferredBytes: number, totalBytes: number, message: string) => void,
    totalBytes: number
  ): Promise<void> {
    const bleService = BleService.getInstance();

    await this.delay(2500);

    const maxAttempts = 20;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await bleService.connect(deviceId, true);
        return;
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Failed to reconnect after OTA reset: ${error instanceof Error ? error.message : String(error)}`);
        }

        report(
          'reconnect',
          90 + (attempt / maxAttempts) * 6,
          totalBytes,
          totalBytes,
          `Reconnecting to device (${attempt}/${maxAttempts})...`
        );

        await this.delay(Math.min(6000, 1400 + attempt * 300));
      }
    }
  }

  private async computeSha256(data: Uint8Array): Promise<Uint8Array> {
    const normalized = new Uint8Array(data);
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        normalized
      );
      return new Uint8Array(digest);
    }

    // WebView fallback: keep OTA working even if WebCrypto is missing.
    return Uint8Array.from(sha256Fallback(normalized));
  }

  private async readMtu(deviceId: string): Promise<number> {
    try {
      const mtu = await this.withTimeout(
        BleClient.getMtu(deviceId),
        8000,
        'BLE getMtu'
      );
      if (!Number.isFinite(mtu) || mtu < 23) return 23;
      return mtu;
    } catch {
      return 23;
    }
  }

  private async writeSmpChunk(deviceId: string, view: DataView, mode: SmpWriteMode): Promise<void> {
    if (mode === 'writeWithoutResponse') {
      await this.withTimeout(
        BleClient.writeWithoutResponse(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID, view, { timeout: 12000 }),
        12000,
        'SMP writeWithoutResponse'
      );
      return;
    }

    await this.withTimeout(
      BleClient.write(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID, view),
      12000,
      'SMP write'
    );
  }

  private async readSmpCharacteristicCapabilities(deviceId: string): Promise<SmpCharacteristicCapabilities | null> {
    let services = await this.withTimeout(
      BleClient.getServices(deviceId),
      12000,
      'BLE getServices'
    );
    let smpService = services.find((service) => service.uuid.toLowerCase() === SMP_SERVICE_UUID.toLowerCase());

    if (!smpService) {
      await this.withTimeout(
        BleClient.discoverServices(deviceId),
        12000,
        'BLE discoverServices'
      );
      services = await this.withTimeout(
        BleClient.getServices(deviceId),
        12000,
        'BLE getServices'
      );
      smpService = services.find((service) => service.uuid.toLowerCase() === SMP_SERVICE_UUID.toLowerCase());
    }

    if (!smpService) return null;

    const smpCharacteristic = smpService.characteristics.find(
      (characteristic) => characteristic.uuid.toLowerCase() === SMP_CHARACTERISTIC_UUID.toLowerCase()
    );
    if (!smpCharacteristic) return null;

    return {
      notify: Boolean(smpCharacteristic.properties.notify),
      write: Boolean(smpCharacteristic.properties.write),
      writeWithoutResponse: Boolean(smpCharacteristic.properties.writeWithoutResponse)
    };
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return promise;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out.`));
      }, timeoutMs);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async startSmpNotificationsWithRetry(
    deviceId: string,
    onNotification: (value: DataView) => void
  ): Promise<void> {
    let lastError: unknown = null;
    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        try {
          await this.withTimeout(
            BleClient.stopNotifications(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID),
            6000,
            'SMP stopNotifications'
          );
        } catch {
          // best effort
        }

        await this.withTimeout(
          BleClient.startNotifications(deviceId, SMP_SERVICE_UUID, SMP_CHARACTERISTIC_UUID, onNotification),
          22000,
          'SMP startNotifications'
        );
        return;
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          try {
            await this.withTimeout(
              BleClient.discoverServices(deviceId),
              10000,
              'BLE discoverServices'
            );
          } catch {
            // best effort
          }
          await this.delay(500 * attempt);
          continue;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  private readInt(value: CborValue | undefined): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    return null;
  }

  private readBool(value: CborValue | undefined): boolean | null {
    if (typeof value === 'boolean') return value;
    return null;
  }

  private readString(value: CborValue | undefined): string | null {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
    return null;
  }

  private readBytes(value: CborValue | undefined): Uint8Array | null {
    if (value instanceof Uint8Array) return value;
    return null;
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const otaBleService = OtaBleService.getInstance();
