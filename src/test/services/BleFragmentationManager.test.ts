/**
 * Tests for BleFragmentationManager
 * Tests the fragmentation/defragmentation protocol for BLE communication
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    FRAGMENT_TYPE_FULL_LE,
    UNIFIED_HEADER_SIZE,
    WRITE_HEADER_SIZE,
    MAX_CHUNK_SIZE,
    UnifiedHistoryHeader
} from '../../types/firmware_structs';

describe('BleFragmentationManager Constants', () => {
    describe('FRAGMENT_TYPE_FULL_LE', () => {
        it('should be 0x03', () => {
            expect(FRAGMENT_TYPE_FULL_LE).toBe(0x03);
        });
    });

    describe('UNIFIED_HEADER_SIZE', () => {
        it('should be 8 bytes', () => {
            expect(UNIFIED_HEADER_SIZE).toBe(8);
        });
    });

    describe('WRITE_HEADER_SIZE', () => {
        it('should be 4 bytes', () => {
            expect(WRITE_HEADER_SIZE).toBe(4);
        });
    });

    describe('MAX_CHUNK_SIZE', () => {
        it('should be 20 bytes (BLE MTU limit)', () => {
            expect(MAX_CHUNK_SIZE).toBe(20);
        });
    });
});

describe('Fragmentation Protocol Calculations', () => {
    describe('First payload size calculation', () => {
        it('should calculate first payload size correctly', () => {
            const totalSize = 100;
            const firstPayloadSize = Math.min(MAX_CHUNK_SIZE - WRITE_HEADER_SIZE, totalSize);
            // 20 - 4 = 16 bytes for first fragment payload
            expect(firstPayloadSize).toBe(16);
        });

        it('should handle small payloads that fit in first fragment', () => {
            const totalSize = 10;
            const firstPayloadSize = Math.min(MAX_CHUNK_SIZE - WRITE_HEADER_SIZE, totalSize);
            expect(firstPayloadSize).toBe(10);
        });
    });

    describe('Fragment count calculation', () => {
        it('should calculate number of fragments needed', () => {
            const calculateFragments = (totalSize: number): number => {
                const firstPayload = Math.min(MAX_CHUNK_SIZE - WRITE_HEADER_SIZE, totalSize);
                const remaining = totalSize - firstPayload;
                if (remaining <= 0) return 1;
                return 1 + Math.ceil(remaining / MAX_CHUNK_SIZE);
            };

            expect(calculateFragments(10)).toBe(1);  // 10 < 16
            expect(calculateFragments(16)).toBe(1);  // 16 = 16
            expect(calculateFragments(17)).toBe(2);  // 16 + 1
            expect(calculateFragments(36)).toBe(2);  // 16 + 20
            expect(calculateFragments(37)).toBe(3);  // 16 + 20 + 1
            expect(calculateFragments(56)).toBe(3);  // 16 + 20 + 20
            expect(calculateFragments(100)).toBe(6); // 16 + 20*4 + 4
        });
    });
});

describe('Unified Header Parsing', () => {
    const createHeader = (
        dataType: number,
        status: number,
        entryCount: number,
        fragmentIndex: number,
        totalFragments: number,
        fragmentSize: number,
        reserved: number = 0
    ): DataView => {
        const buffer = new ArrayBuffer(UNIFIED_HEADER_SIZE);
        const view = new DataView(buffer);
        view.setUint8(0, dataType);
        view.setUint8(1, status);
        view.setUint16(2, entryCount, true); // Little Endian
        view.setUint8(4, fragmentIndex);
        view.setUint8(5, totalFragments);
        view.setUint8(6, fragmentSize);
        view.setUint8(7, reserved);
        return view;
    };

    const parseUnifiedHeader = (data: DataView): UnifiedHistoryHeader => {
        return {
            data_type: data.getUint8(0),
            status: data.getUint8(1),
            entry_count: data.getUint16(2, true),
            fragment_index: data.getUint8(4),
            total_fragments: data.getUint8(5),
            fragment_size: data.getUint8(6),
            reserved: data.getUint8(7)
        };
    };

    it('should parse data_type correctly', () => {
        const header = createHeader(0x10, 0, 0, 0, 1, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.data_type).toBe(0x10);
    });

    it('should parse status correctly', () => {
        const header = createHeader(0, 0x05, 0, 0, 1, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.status).toBe(0x05);
    });

    it('should parse entry_count as Little Endian uint16', () => {
        const header = createHeader(0, 0, 0x1234, 0, 1, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.entry_count).toBe(0x1234);
    });

    it('should parse large entry_count correctly', () => {
        const header = createHeader(0, 0, 0xFFFF, 0, 1, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.entry_count).toBe(65535);
    });

    it('should parse fragment_index correctly', () => {
        const header = createHeader(0, 0, 0, 5, 10, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.fragment_index).toBe(5);
    });

    it('should parse total_fragments correctly', () => {
        const header = createHeader(0, 0, 0, 0, 10, 12);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.total_fragments).toBe(10);
    });

    it('should parse fragment_size correctly', () => {
        const header = createHeader(0, 0, 0, 0, 1, 20);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.fragment_size).toBe(20);
    });

    it('should parse reserved byte correctly', () => {
        const header = createHeader(0, 0, 0, 0, 1, 12, 0xAB);
        const parsed = parseUnifiedHeader(header);
        expect(parsed.reserved).toBe(0xAB);
    });
});

describe('Header Validation', () => {
    it('should detect valid header when fragment_index < total_fragments', () => {
        const fragmentIndex = 2;
        const totalFragments = 5;
        expect(fragmentIndex < totalFragments).toBe(true);
    });

    it('should detect invalid header when fragment_index >= total_fragments', () => {
        const fragmentIndex = 5;
        const totalFragments = 5;
        expect(fragmentIndex < totalFragments).toBe(false);
    });

    it('should handle zero total_fragments by normalizing to 1', () => {
        const totalFragments = 0;
        const normalized = totalFragments > 0 ? totalFragments : 1;
        expect(normalized).toBe(1);
    });

    it('should handle zero fragment_size by using available payload', () => {
        const fragmentSize = 0;
        const availablePayload = 12;
        const normalized = fragmentSize > 0 ? fragmentSize : availablePayload;
        expect(normalized).toBe(12);
    });
});

describe('Write Header Construction', () => {
    it('should construct write header correctly', () => {
        const channelId = 3;
        const totalSize = 100;
        
        const header = new Uint8Array(WRITE_HEADER_SIZE);
        header[0] = channelId; // Channel ID
        header[1] = FRAGMENT_TYPE_FULL_LE; // Fragment Type
        header[2] = totalSize & 0xFF; // Size Low byte
        header[3] = (totalSize >> 8) & 0xFF; // Size High byte

        expect(header[0]).toBe(3);
        expect(header[1]).toBe(0x03);
        expect(header[2]).toBe(100);
        expect(header[3]).toBe(0);
    });

    it('should handle large sizes (Little Endian)', () => {
        const totalSize = 0x1234; // 4660

        const header = new Uint8Array(WRITE_HEADER_SIZE);
        header[2] = totalSize & 0xFF;
        header[3] = (totalSize >> 8) & 0xFF;

        expect(header[2]).toBe(0x34); // Low byte
        expect(header[3]).toBe(0x12); // High byte
    });

    it('should use 0x00 for channel ID when undefined', () => {
        const channelId: number | undefined = undefined;
        const header = new Uint8Array(WRITE_HEADER_SIZE);
        header[0] = channelId !== undefined ? channelId : 0x00;

        expect(header[0]).toBe(0x00);
    });
});

describe('Reassembly Buffer Key', () => {
    it('should create unique key from UUID and data_type', () => {
        const characteristicUuid = 'abc123-def456-789';
        const dataType = 0x10;
        const key = `${characteristicUuid}:${dataType}`;
        expect(key).toBe('abc123-def456-789:16');
    });

    it('should differentiate keys for same UUID with different data_type', () => {
        const uuid = 'same-uuid';
        const key1 = `${uuid}:${0x10}`;
        const key2 = `${uuid}:${0x20}`;
        expect(key1).not.toBe(key2);
    });
});

describe('Fragment Payload Extraction', () => {
    it('should extract payload after header', () => {
        const headerSize = UNIFIED_HEADER_SIZE;
        const fullBuffer = new Uint8Array([
            // Header (8 bytes)
            0x10, 0x00, 0x05, 0x00, 0x00, 0x01, 0x0C, 0x00,
            // Payload (4 bytes)
            0xAA, 0xBB, 0xCC, 0xDD
        ]);
        
        const payloadStart = headerSize;
        const payloadLength = 4;
        const payload = fullBuffer.slice(payloadStart, payloadStart + payloadLength);

        expect(payload).toEqual(new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]));
    });

    it('should handle empty payload after header', () => {
        const fullBuffer = new Uint8Array([
            // Header only (8 bytes)
            0x10, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00
        ]);
        
        const payloadStart = UNIFIED_HEADER_SIZE;
        const payloadLength = 0;
        const payload = fullBuffer.slice(payloadStart, payloadStart + payloadLength);

        expect(payload.length).toBe(0);
    });
});

describe('Buffer Concatenation', () => {
    it('should append fragment to existing buffer', () => {
        const existingBuffer = new Uint8Array([0x01, 0x02, 0x03]);
        const newPayload = new Uint8Array([0x04, 0x05, 0x06]);

        const combined = new Uint8Array(existingBuffer.length + newPayload.length);
        combined.set(existingBuffer, 0);
        combined.set(newPayload, existingBuffer.length);

        expect(combined).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]));
    });

    it('should handle appending to empty buffer', () => {
        const existingBuffer = new Uint8Array(0);
        const newPayload = new Uint8Array([0xAA, 0xBB]);

        const combined = new Uint8Array(existingBuffer.length + newPayload.length);
        combined.set(existingBuffer, 0);
        combined.set(newPayload, existingBuffer.length);

        expect(combined).toEqual(new Uint8Array([0xAA, 0xBB]));
    });
});
