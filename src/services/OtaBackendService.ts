import { getCognitoIdToken } from '../lib/cognitoClient';
import { sha256 as sha256Fallback } from '@noble/hashes/sha2.js';

const env = import.meta.env as Record<string, string | undefined>;

const AI_DOCTOR_URL = env.VITE_AI_DOCTOR_API_URL?.trim() || '';
const OTA_API_BASE_URL = env.VITE_OTA_API_BASE_URL?.trim() || '';
const EXPLICIT_OTA_LATEST_URL = env.VITE_OTA_LATEST_API_URL?.trim() || '';
const EXPLICIT_OTA_DOWNLOAD_URL = env.VITE_OTA_DOWNLOAD_URL_API_URL?.trim() || '';
const OTA_DERIVE_FROM_AI_DOCTOR = String(env.VITE_OTA_DERIVE_FROM_AI_DOCTOR || '').trim().toLowerCase() === 'true';
const OTA_SEND_AUTH = String(env.VITE_OTA_SEND_AUTH || '').trim().toLowerCase() === 'true';
const OTA_DEFAULT_CHANNEL = (env.VITE_OTA_CHANNEL?.trim() || 'stable').toLowerCase();
const OTA_DEFAULT_BOARD = env.VITE_OTA_BOARD?.trim() || 'arduino_nano_33_ble';

export interface OtaArtifactInfo {
  name?: string;
  sizeBytes?: number;
  sha256?: string;
}

export interface OtaDownloadInfo {
  url?: string;
  expiresAt?: string;
}

export interface OtaRelease {
  version: string;
  channel?: string;
  mandatory?: boolean;
  notes?: string;
  artifact?: OtaArtifactInfo;
  download?: OtaDownloadInfo;
}

export interface OtaLatestResult {
  updateAvailable: boolean;
  latest: OtaRelease | null;
  raw: unknown;
}

export interface OtaLookupOptions {
  channel?: string;
  board?: string;
  currentVersion?: string;
}

function stripTrailingSlashes(input: string): string {
  return input.replace(/\/+$/, '');
}

function joinUrl(base: string, path: string): string {
  const normalizedBase = stripTrailingSlashes(base.trim());
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

function rootFromLatestEndpoint(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    if (/\/ota\/latest$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/ota\/latest$/i, '') || '/';
      return stripTrailingSlashes(parsed.toString());
    }
    return stripTrailingSlashes(parsed.origin);
  } catch {
    return '';
  }
}

function rootFromDownloadEndpoint(urlTemplate: string): string {
  if (!urlTemplate) return '';
  try {
    const resolved = urlTemplate.replace('{version}', '0.0.0');
    const parsed = new URL(resolved);
    parsed.search = '';
    parsed.hash = '';
    const normalizedPath = parsed.pathname.replace(/\/+$/, '');
    if (/\/ota\/releases\/[^/]+\/download-url$/i.test(normalizedPath)) {
      parsed.pathname = normalizedPath.replace(/\/ota\/releases\/[^/]+\/download-url$/i, '') || '/';
      return stripTrailingSlashes(parsed.toString());
    }
    return stripTrailingSlashes(parsed.origin);
  } catch {
    return '';
  }
}

function deriveBaseFromAiDoctor(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const suffix = '/aiDoctor';
    if (!parsed.pathname.endsWith(suffix)) return '';
    parsed.pathname = parsed.pathname.slice(0, -suffix.length);
    parsed.search = '';
    parsed.hash = '';
    return stripTrailingSlashes(parsed.toString());
  } catch {
    return '';
  }
}

function toLowerHex(input: string): string {
  return input.toLowerCase().replace(/[^a-f0-9]/g, '');
}

function parseVersionParts(version: string): number[] {
  return version
    .trim()
    .replace(/^v/i, '')
    .split(/[^\d]+/)
    .filter((part) => part.length > 0)
    .map((part) => Number(part))
    .filter((value) => Number.isFinite(value) && value >= 0);
}

export function compareFirmwareVersions(a: string, b: string): number {
  const aParts = parseVersionParts(a);
  const bParts = parseVersionParts(b);
  const length = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < length; i += 1) {
    const aValue = aParts[i] ?? 0;
    const bValue = bParts[i] ?? 0;
    if (aValue > bValue) return 1;
    if (aValue < bValue) return -1;
  }
  return 0;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function booleanOrUndefined(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export class OtaBackendService {
  private static instance: OtaBackendService;

  public static getInstance(): OtaBackendService {
    if (!OtaBackendService.instance) {
      OtaBackendService.instance = new OtaBackendService();
    }
    return OtaBackendService.instance;
  }

  public getDefaultChannel(): string {
    return OTA_DEFAULT_CHANNEL;
  }

  public getDefaultBoard(): string {
    return OTA_DEFAULT_BOARD;
  }

  public getMissingConfigReason(): string {
    return 'Set VITE_OTA_API_BASE_URL or VITE_OTA_LATEST_API_URL.';
  }

  public isConfigured(): boolean {
    try {
      return Boolean(this.getLatestEndpoint());
    } catch {
      return false;
    }
  }

  public async checkLatest(options: OtaLookupOptions): Promise<OtaLatestResult> {
    this.assertSingleBackendConfig();
    const endpoint = this.getLatestEndpoint();
    if (!endpoint) {
      throw new Error(this.getMissingConfigReason());
    }

    const currentVersion = options.currentVersion?.trim();
    const channel = options.channel?.trim() || this.getDefaultChannel();
    const board = options.board?.trim() || this.getDefaultBoard();

    const url = new URL(endpoint);
    if (channel) url.searchParams.set('channel', channel);
    if (board) url.searchParams.set('board', board);
    if (currentVersion && currentVersion !== '?') {
      url.searchParams.set('current_version', currentVersion);
    }

    const payload = await this.fetchJsonWithAuth(url.toString(), 'GET');
    const obj = asObject(payload);
    const latest = this.normalizeRelease(obj?.latest);
    const backendUpdateFlag = typeof obj?.update_available === 'boolean'
      ? obj.update_available
      : null;

    let updateAvailable = backendUpdateFlag === true;
    if (backendUpdateFlag === null && latest && currentVersion && currentVersion !== '?') {
      updateAvailable = compareFirmwareVersions(latest.version, currentVersion) > 0;
    }

    return {
      updateAvailable: Boolean(updateAvailable && latest),
      latest,
      raw: payload
    };
  }

  public async getDownloadUrl(version: string, options: OtaLookupOptions): Promise<string> {
    this.assertSingleBackendConfig();
    const endpoint = this.getDownloadEndpoint(version);
    if (!endpoint) {
      throw new Error(this.getMissingConfigReason());
    }

    const channel = options.channel?.trim() || this.getDefaultChannel();
    const board = options.board?.trim() || this.getDefaultBoard();

    const url = new URL(endpoint);
    if (channel) url.searchParams.set('channel', channel);
    if (board) url.searchParams.set('board', board);

    const payload = await this.fetchJsonWithAuth(url.toString(), 'GET');
    const objectPayload = asObject(payload);
    const directUrl = stringOrUndefined(objectPayload?.url);
    if (directUrl) return directUrl;

    const downloadObj = asObject(objectPayload?.download);
    const nestedUrl = stringOrUndefined(downloadObj?.url);
    if (nestedUrl) return nestedUrl;

    throw new Error('OTA download URL is missing in backend response.');
  }

  public async fetchReleaseBinary(release: OtaRelease, options: OtaLookupOptions): Promise<Uint8Array> {
    this.assertSingleBackendConfig();
    const directUrl = release.download?.url?.trim();
    let binary: Uint8Array;

    if (directUrl) {
      try {
        binary = await this.downloadBinary(directUrl);
      } catch {
        const refreshedUrl = await this.getDownloadUrl(release.version, options);
        binary = await this.downloadBinary(refreshedUrl);
      }
    } else {
      const downloadUrl = await this.getDownloadUrl(release.version, options);
      binary = await this.downloadBinary(downloadUrl);
    }

    if (release.artifact?.sha256) {
      await this.assertChecksum(binary, release.artifact.sha256);
    }

    return binary;
  }

  public async downloadBinary(url: string): Promise<Uint8Array> {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Firmware download failed (HTTP ${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  public async assertChecksum(binary: Uint8Array, expectedSha256: string): Promise<void> {
    const expected = toLowerHex(expectedSha256);
    if (!expected) return;

    const normalizedBinary = new Uint8Array(binary);
    let digestBytes: Uint8Array;
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest(
        'SHA-256',
        normalizedBinary
      );
      digestBytes = new Uint8Array(digest);
    } else {
      // Android WebView can miss WebCrypto in some runtime configurations.
      // Fallback to a pure JS SHA-256 implementation to keep OTA checksum validation enforced.
      digestBytes = Uint8Array.from(sha256Fallback(normalizedBinary));
    }

    const actual = toLowerHex(bytesToHex(digestBytes));

    if (actual !== expected) {
      throw new Error('Firmware checksum mismatch. Update aborted.');
    }
  }

  private getLatestEndpoint(): string {
    this.assertSingleBackendConfig();
    if (EXPLICIT_OTA_LATEST_URL) return EXPLICIT_OTA_LATEST_URL;

    const base = this.getBaseUrl();
    if (!base) return '';
    return joinUrl(base, '/ota/latest');
  }

  private getDownloadEndpoint(version: string): string {
    this.assertSingleBackendConfig();
    if (EXPLICIT_OTA_DOWNLOAD_URL) {
      return EXPLICIT_OTA_DOWNLOAD_URL.replace('{version}', encodeURIComponent(version));
    }

    const base = this.getBaseUrl();
    if (!base) return '';
    return joinUrl(base, `/ota/releases/${encodeURIComponent(version)}/download-url`);
  }

  private getBaseUrl(): string {
    if (OTA_API_BASE_URL) return stripTrailingSlashes(OTA_API_BASE_URL);

    if (OTA_DERIVE_FROM_AI_DOCTOR) {
      const derived = deriveBaseFromAiDoctor(AI_DOCTOR_URL);
      if (derived) return derived;
    }

    if (EXPLICIT_OTA_LATEST_URL) {
      try {
        const parsed = new URL(EXPLICIT_OTA_LATEST_URL);
        parsed.pathname = parsed.pathname.replace(/\/ota\/latest\/?$/, '');
        parsed.search = '';
        parsed.hash = '';
        return stripTrailingSlashes(parsed.toString());
      } catch {
        return '';
      }
    }

    return '';
  }

  private assertSingleBackendConfig(): void {
    const roots: string[] = [];

    if (OTA_API_BASE_URL) {
      roots.push(stripTrailingSlashes(OTA_API_BASE_URL));
    }

    if (OTA_DERIVE_FROM_AI_DOCTOR) {
      const derived = deriveBaseFromAiDoctor(AI_DOCTOR_URL);
      if (derived) roots.push(stripTrailingSlashes(derived));
    }

    const latestRoot = rootFromLatestEndpoint(EXPLICIT_OTA_LATEST_URL);
    if (latestRoot) roots.push(latestRoot);

    const downloadRoot = rootFromDownloadEndpoint(EXPLICIT_OTA_DOWNLOAD_URL);
    if (downloadRoot) roots.push(downloadRoot);

    const normalizedRoots = Array.from(
      new Set(
        roots
          .map((root) => stripTrailingSlashes(root.trim()))
          .filter((root) => root.length > 0)
          .map((root) => root.toLowerCase())
      )
    );

    if (normalizedRoots.length > 1) {
      throw new Error(
        `OTA config mismatch: multiple backends configured (${normalizedRoots.join(', ')}). Use one OTA backend.`
      );
    }
  }

  private normalizeRelease(raw: unknown): OtaRelease | null {
    const obj = asObject(raw);
    if (!obj) return null;

    const version = stringOrUndefined(obj.version);
    if (!version) return null;

    const artifactObj = asObject(obj.artifact);
    const downloadObj = asObject(obj.download);

    return {
      version,
      channel: stringOrUndefined(obj.channel),
      mandatory: booleanOrUndefined(obj.mandatory),
      notes: stringOrUndefined(obj.notes),
      artifact: artifactObj
        ? {
            name: stringOrUndefined(artifactObj.name),
            sizeBytes: numberOrUndefined(artifactObj.size_bytes),
            sha256: stringOrUndefined(artifactObj.sha256)
          }
        : undefined,
      download: downloadObj
        ? {
            url: stringOrUndefined(downloadObj.url),
            expiresAt: stringOrUndefined(downloadObj.expires_at)
          }
        : undefined
    };
  }

  private async fetchJsonWithAuth(url: string, method: 'GET' | 'POST'): Promise<unknown> {
    const request = async (token: string | null) => {
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(url, { method, headers });
      return response;
    };

    let response: Response;
    if (OTA_SEND_AUTH) {
      let token = await this.getAuthIdToken(false);
      response = await request(token);

      if (response.status === 401) {
        const refreshed = await this.getAuthIdToken(true);
        if (refreshed && refreshed !== token) {
          token = refreshed;
          response = await request(token);
        }
      }
    } else {
      response = await request(null);
    }

    if (!response.ok) {
      const text = await response.text();
      let parsedMessage: string | undefined;
      if (text) {
        try {
          const parsed = JSON.parse(text) as Record<string, unknown>;
          const nestedError = asObject(parsed.error);
          parsedMessage = stringOrUndefined(nestedError?.message)
            || stringOrUndefined(parsed.message)
            || undefined;
        } catch {
          // keep raw text
        }
      }

      const message = parsedMessage || text || `OTA backend request failed (HTTP ${response.status}).`;
      throw new Error(message);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error('OTA backend returned a non-JSON response.');
    }

    return response.json();
  }

  private async getAuthIdToken(forceRefresh: boolean): Promise<string | null> {
    try {
      const token = await getCognitoIdToken(forceRefresh);
      return token && token.trim().length > 0 ? token.trim() : null;
    } catch {
      return null;
    }
  }
}

export const otaBackendService = OtaBackendService.getInstance();
