export type CborValue = null | boolean | number | string | Uint8Array | CborValue[] | CborMap;

export interface CborMap {
  [key: string]: CborValue;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function concatChunks(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}

function encodeTypeAndLength(major: number, length: number): Uint8Array {
  if (!Number.isInteger(length) || length < 0) {
    throw new Error(`Invalid CBOR length: ${length}`);
  }

  if (length < 24) {
    return new Uint8Array([(major << 5) | length]);
  }
  if (length <= 0xff) {
    return new Uint8Array([(major << 5) | 24, length]);
  }
  if (length <= 0xffff) {
    const out = new Uint8Array(3);
    out[0] = (major << 5) | 25;
    const view = new DataView(out.buffer);
    view.setUint16(1, length, false);
    return out;
  }
  if (length <= 0xffffffff) {
    const out = new Uint8Array(5);
    out[0] = (major << 5) | 26;
    const view = new DataView(out.buffer);
    view.setUint32(1, length, false);
    return out;
  }

  const out = new Uint8Array(9);
  out[0] = (major << 5) | 27;
  const view = new DataView(out.buffer);
  view.setBigUint64(1, BigInt(length), false);
  return out;
}

function encodeInteger(value: number): Uint8Array {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`CBOR only supports safe integers here: ${value}`);
  }
  if (value >= 0) {
    return encodeTypeAndLength(0, value);
  }
  return encodeTypeAndLength(1, -1 - value);
}

export function encodeCbor(value: CborValue): Uint8Array {
  if (value === null) {
    return new Uint8Array([0xf6]);
  }

  if (typeof value === 'boolean') {
    return new Uint8Array([value ? 0xf5 : 0xf4]);
  }

  if (typeof value === 'number') {
    return encodeInteger(value);
  }

  if (typeof value === 'string') {
    const encoded = textEncoder.encode(value);
    return concatChunks([encodeTypeAndLength(3, encoded.length), encoded]);
  }

  if (value instanceof Uint8Array) {
    return concatChunks([encodeTypeAndLength(2, value.length), value]);
  }

  if (Array.isArray(value)) {
    const parts: Uint8Array[] = [encodeTypeAndLength(4, value.length)];
    for (const entry of value) {
      parts.push(encodeCbor(entry));
    }
    return concatChunks(parts);
  }

  const entries = Object.entries(value);
  const parts: Uint8Array[] = [encodeTypeAndLength(5, entries.length)];
  for (const [key, entryValue] of entries) {
    parts.push(encodeCbor(key));
    parts.push(encodeCbor(entryValue));
  }
  return concatChunks(parts);
}

interface ReadState {
  bytes: Uint8Array;
  view: DataView;
  offset: number;
}

function ensureAvailable(state: ReadState, needed: number): void {
  if (state.offset + needed > state.bytes.length) {
    throw new Error('CBOR decode out of bounds');
  }
}

function readLength(state: ReadState, additionalInfo: number): number {
  if (additionalInfo < 24) return additionalInfo;

  if (additionalInfo === 24) {
    ensureAvailable(state, 1);
    const value = state.view.getUint8(state.offset);
    state.offset += 1;
    return value;
  }

  if (additionalInfo === 25) {
    ensureAvailable(state, 2);
    const value = state.view.getUint16(state.offset, false);
    state.offset += 2;
    return value;
  }

  if (additionalInfo === 26) {
    ensureAvailable(state, 4);
    const value = state.view.getUint32(state.offset, false);
    state.offset += 4;
    return value;
  }

  if (additionalInfo === 27) {
    ensureAvailable(state, 8);
    const raw = state.view.getBigUint64(state.offset, false);
    state.offset += 8;
    const value = Number(raw);
    if (!Number.isSafeInteger(value)) {
      throw new Error('CBOR integer exceeds JS safe range');
    }
    return value;
  }

  throw new Error(`Unsupported CBOR additional info: ${additionalInfo}`);
}

function decodeFloat16(raw: number): number {
  const sign = (raw & 0x8000) ? -1 : 1;
  const exponent = (raw >> 10) & 0x1f;
  const fraction = raw & 0x03ff;

  if (exponent === 0) {
    if (fraction === 0) return sign * 0;
    return sign * Math.pow(2, -14) * (fraction / 1024);
  }
  if (exponent === 0x1f) {
    return fraction === 0 ? sign * Infinity : NaN;
  }
  return sign * Math.pow(2, exponent - 15) * (1 + fraction / 1024);
}

function readValue(state: ReadState): CborValue {
  ensureAvailable(state, 1);
  const initialByte = state.view.getUint8(state.offset);
  state.offset += 1;

  const majorType = initialByte >> 5;
  const additionalInfo = initialByte & 0x1f;

  if (majorType === 0) {
    return readLength(state, additionalInfo);
  }

  if (majorType === 1) {
    const value = readLength(state, additionalInfo);
    return -1 - value;
  }

  if (majorType === 2) {
    const length = readLength(state, additionalInfo);
    ensureAvailable(state, length);
    const value = state.bytes.slice(state.offset, state.offset + length);
    state.offset += length;
    return value;
  }

  if (majorType === 3) {
    const length = readLength(state, additionalInfo);
    ensureAvailable(state, length);
    const value = state.bytes.slice(state.offset, state.offset + length);
    state.offset += length;
    return textDecoder.decode(value);
  }

  if (majorType === 4) {
    const length = readLength(state, additionalInfo);
    const values: CborValue[] = [];
    for (let i = 0; i < length; i += 1) {
      values.push(readValue(state));
    }
    return values;
  }

  if (majorType === 5) {
    const length = readLength(state, additionalInfo);
    const map: CborMap = {};
    for (let i = 0; i < length; i += 1) {
      const key = readValue(state);
      const value = readValue(state);
      map[String(key)] = value;
    }
    return map;
  }

  if (majorType === 7) {
    if (additionalInfo === 20) return false;
    if (additionalInfo === 21) return true;
    if (additionalInfo === 22 || additionalInfo === 23) return null;

    if (additionalInfo === 25) {
      ensureAvailable(state, 2);
      const raw = state.view.getUint16(state.offset, false);
      state.offset += 2;
      return decodeFloat16(raw);
    }

    if (additionalInfo === 26) {
      ensureAvailable(state, 4);
      const value = state.view.getFloat32(state.offset, false);
      state.offset += 4;
      return value;
    }

    if (additionalInfo === 27) {
      ensureAvailable(state, 8);
      const value = state.view.getFloat64(state.offset, false);
      state.offset += 8;
      return value;
    }
  }

  throw new Error(`Unsupported CBOR major type: ${majorType}`);
}

export function decodeCbor(bytes: Uint8Array): CborValue {
  const state: ReadState = {
    bytes,
    view: new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    offset: 0
  };
  const value = readValue(state);
  if (state.offset !== bytes.length) {
    throw new Error('Trailing bytes after CBOR payload');
  }
  return value;
}
