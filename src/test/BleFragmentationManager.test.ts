import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BleFragmentationManager } from '../services/BleFragmentationManager';
import { UNIFIED_HEADER_SIZE } from '../types/firmware_structs';

describe('BleFragmentationManager', () => {
    let fragManager: BleFragmentationManager;

    beforeEach(() => {
        // Get fresh instance by accessing static getInstance
        // @ts-expect-error - accessing private static for testing
        BleFragmentationManager.instance = undefined;
        fragManager = BleFragmentationManager.getInstance();
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = BleFragmentationManager.getInstance();
            const instance2 = BleFragmentationManager.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('handleFragmentedNotification', () => {
        const testCharUuid = '12345678-1234-5678-1234-567812345678';

        describe('single fragment (non-fragmented)', () => {
            it('should handle small payloads without unified header', () => {
                // Data smaller than UNIFIED_HEADER_SIZE (8 bytes)
                const smallData = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
                const dataView = new DataView(smallData.buffer);

                const result = fragManager.handleFragmentedNotification(testCharUuid, dataView);

                expect(result.complete).toBe(true);
                expect(result.payload).toEqual(smallData);
                expect(result.header).toBeUndefined();
            });

            it('should handle single fragment with valid unified header', () => {
                // Create a valid unified header (8 bytes) + payload
                const header = new Uint8Array([
                    0x00,       // data_type
                    0x00,       // status
                    0x01, 0x00, // entry_count (1, LE)
                    0x00,       // fragment_index (0)
                    0x01,       // total_fragments (1)
                    0x04,       // fragment_size (4 bytes)
                    0x00        // reserved
                ]);
                const payload = new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]);
                const fullData = new Uint8Array([...header, ...payload]);
                const dataView = new DataView(fullData.buffer);

                const result = fragManager.handleFragmentedNotification(testCharUuid, dataView);

                expect(result.complete).toBe(true);
                expect(result.payload).toEqual(payload);
                expect(result.header).toBeDefined();
                expect(result.header?.data_type).toBe(0);
                expect(result.header?.entry_count).toBe(1);
                expect(result.header?.total_fragments).toBe(1);
            });

            it('should treat invalid headers as raw data', () => {
                // Create a header with invalid data_type (> 5)
                const invalidHeader = new Uint8Array([
                    0x99,       // data_type (invalid - > 5)
                    0x00,
                    0x01, 0x00,
                    0x00,
                    0x01,
                    0x00,       // fragment_size (0 = invalid)
                    0x00
                ]);
                const dataView = new DataView(invalidHeader.buffer);

                const result = fragManager.handleFragmentedNotification(testCharUuid, dataView);

                expect(result.complete).toBe(true);
                expect(result.payload).toEqual(invalidHeader);
            });
        });

        describe('multi-fragment reassembly', () => {
            it('should reassemble two fragments correctly', () => {
                const charUuid = 'frag-test-uuid';

                // First fragment
                const header1 = new Uint8Array([
                    0x01,       // data_type
                    0x00,       // status
                    0x02, 0x00, // entry_count (2)
                    0x00,       // fragment_index (0)
                    0x02,       // total_fragments (2)
                    0x04,       // fragment_size (4 bytes)
                    0x00
                ]);
                const payload1 = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
                const frag1 = new Uint8Array([...header1, ...payload1]);

                // Second fragment
                const header2 = new Uint8Array([
                    0x01,       // data_type (same)
                    0x00,       // status
                    0x02, 0x00, // entry_count (2)
                    0x01,       // fragment_index (1)
                    0x02,       // total_fragments (2)
                    0x04,       // fragment_size (4 bytes)
                    0x00
                ]);
                const payload2 = new Uint8Array([0x05, 0x06, 0x07, 0x08]);
                const frag2 = new Uint8Array([...header2, ...payload2]);

                // Process first fragment
                const result1 = fragManager.handleFragmentedNotification(
                    charUuid, 
                    new DataView(frag1.buffer)
                );
                expect(result1.complete).toBe(false);

                // Process second fragment
                const result2 = fragManager.handleFragmentedNotification(
                    charUuid, 
                    new DataView(frag2.buffer)
                );
                expect(result2.complete).toBe(true);
                expect(result2.payload).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]));
            });

            it('should reassemble three fragments correctly', () => {
                const charUuid = 'multi-frag-uuid';
                const totalFrags = 3;
                const fragmentPayloads = [
                    new Uint8Array([0x10, 0x11]),
                    new Uint8Array([0x20, 0x21]),
                    new Uint8Array([0x30, 0x31])
                ];

                for (let i = 0; i < totalFrags; i++) {
                    const header = new Uint8Array([
                        0x02,       // data_type
                        0x00,       // status
                        0x03, 0x00, // entry_count
                        i,          // fragment_index
                        totalFrags, // total_fragments
                        0x02,       // fragment_size
                        0x00
                    ]);
                    const fragment = new Uint8Array([...header, ...fragmentPayloads[i]]);
                    const result = fragManager.handleFragmentedNotification(
                        charUuid,
                        new DataView(fragment.buffer)
                    );

                    if (i < totalFrags - 1) {
                        expect(result.complete).toBe(false);
                    } else {
                        expect(result.complete).toBe(true);
                        expect(result.payload).toEqual(new Uint8Array([0x10, 0x11, 0x20, 0x21, 0x30, 0x31]));
                    }
                }
            });

            it('should handle different characteristics separately', () => {
                const charUuid1 = 'char-uuid-1';
                const charUuid2 = 'char-uuid-2';

                // Start fragment for char1
                const frag1 = createFragment(0, 2, [0x01, 0x02]);
                const result1 = fragManager.handleFragmentedNotification(charUuid1, new DataView(frag1.buffer));
                expect(result1.complete).toBe(false);

                // Start fragment for char2
                const frag2 = createFragment(0, 2, [0xAA, 0xBB]);
                const result2 = fragManager.handleFragmentedNotification(charUuid2, new DataView(frag2.buffer));
                expect(result2.complete).toBe(false);

                // Complete char1
                const frag1b = createFragment(1, 2, [0x03, 0x04]);
                const result1b = fragManager.handleFragmentedNotification(charUuid1, new DataView(frag1b.buffer));
                expect(result1b.complete).toBe(true);
                expect(result1b.payload).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04]));

                // Complete char2
                const frag2b = createFragment(1, 2, [0xCC, 0xDD]);
                const result2b = fragManager.handleFragmentedNotification(charUuid2, new DataView(frag2b.buffer));
                expect(result2b.complete).toBe(true);
                expect(result2b.payload).toEqual(new Uint8Array([0xAA, 0xBB, 0xCC, 0xDD]));
            });
        });

        describe('edge cases', () => {
            it('should reset reassembly when receiving fragment_index 0', () => {
                const charUuid = 'reset-test-uuid';

                // Start a 3-fragment sequence
                const frag1 = createFragment(0, 3, [0x01]);
                fragManager.handleFragmentedNotification(charUuid, new DataView(frag1.buffer));

                // Receive fragment 1
                const frag2 = createFragment(1, 3, [0x02]);
                fragManager.handleFragmentedNotification(charUuid, new DataView(frag2.buffer));

                // Now receive a NEW fragment 0 (new sequence starts)
                const newFrag1 = createFragment(0, 2, [0xAA]);
                const result = fragManager.handleFragmentedNotification(charUuid, new DataView(newFrag1.buffer));
                expect(result.complete).toBe(false);

                // Complete new sequence
                const newFrag2 = createFragment(1, 2, [0xBB]);
                const result2 = fragManager.handleFragmentedNotification(charUuid, new DataView(newFrag2.buffer));
                expect(result2.complete).toBe(true);
                expect(result2.payload).toEqual(new Uint8Array([0xAA, 0xBB]));
            });

            it('should handle empty payload in header', () => {
                // Header says fragment_size = 0 - should be treated as invalid
                const invalidData = new Uint8Array([
                    0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00
                ]);
                const result = fragManager.handleFragmentedNotification(
                    'empty-payload-uuid',
                    new DataView(invalidData.buffer)
                );
                // Should treat as raw data since fragment_size is 0
                expect(result.complete).toBe(true);
            });
        });
    });

    describe('writeFragmented', () => {
        beforeEach(() => {
            vi.mocked(BleClient.write).mockClear();
        });

        it('should write small data in a single fragment with header', async () => {
            const fragManager = BleFragmentationManager.getInstance();
            const data = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
            
            await fragManager.writeFragmented(
                'device-id',
                'service-uuid',
                'char-uuid',
                data
            );
            
            // BleClient.write should have been called once
            expect(vi.mocked(BleClient.write)).toHaveBeenCalledTimes(1);
            
            // Check the written data has the correct header
            const writtenData = vi.mocked(BleClient.write).mock.calls[0][3] as DataView;
            expect(writtenData.byteLength).toBe(4 + 4); // 4 byte header + 4 byte payload
            expect(writtenData.getUint8(0)).toBe(0x00); // channelId = 0
            expect(writtenData.getUint8(1)).toBe(0x03); // FRAGMENT_TYPE_FULL_LE = 3
            expect(writtenData.getUint16(2, true)).toBe(4); // size = 4 (little endian)
        });

        it('should include channelId in header when provided', async () => {
            const fragManager = BleFragmentationManager.getInstance();
            const data = new Uint8Array([0x01, 0x02]);
            
            await fragManager.writeFragmented(
                'device-id',
                'service-uuid',
                'char-uuid',
                data,
                5 // channelId = 5
            );
            
            const writtenData = vi.mocked(BleClient.write).mock.calls[0][3] as DataView;
            expect(writtenData.getUint8(0)).toBe(5); // channelId = 5
        });

        it('should split large data into multiple fragments', async () => {
            const fragManager = BleFragmentationManager.getInstance();
            // Create data larger than MAX_CHUNK_SIZE - WRITE_HEADER_SIZE (20 - 4 = 16 bytes)
            // First fragment: 4 byte header + 16 bytes data = 20 bytes
            // Second fragment: 4 bytes more data
            const data = new Uint8Array(20); // Will need 2 fragments
            for (let i = 0; i < 20; i++) {
                data[i] = i;
            }
            
            await fragManager.writeFragmented(
                'device-id',
                'service-uuid',
                'char-uuid',
                data
            );
            
            // First fragment: 4 byte header + 16 bytes data = 20 bytes (max chunk)
            // Second fragment: remaining 4 bytes
            expect(vi.mocked(BleClient.write)).toHaveBeenCalledTimes(2);
            
            // First fragment should have header with total size = 20
            const firstWrite = vi.mocked(BleClient.write).mock.calls[0][3] as DataView;
            expect(firstWrite.byteLength).toBe(20); // MAX_CHUNK_SIZE
            expect(firstWrite.getUint16(2, true)).toBe(20); // total size in header
            
            // Second fragment is just raw data (remaining bytes)
            const secondWrite = vi.mocked(BleClient.write).mock.calls[1][3] as DataView;
            expect(secondWrite.byteLength).toBe(4); // remaining data
        });

        it('should write data to correct device, service and characteristic', async () => {
            const fragManager = BleFragmentationManager.getInstance();
            const data = new Uint8Array([0xFF]);
            
            await fragManager.writeFragmented(
                'my-device',
                'my-service',
                'my-char',
                data
            );
            
            expect(vi.mocked(BleClient.write)).toHaveBeenCalledWith(
                'my-device',
                'my-service',
                'my-char',
                expect.any(DataView)
            );
        });
    });
});

// Helper function to create a valid fragment
function createFragment(fragIndex: number, totalFrags: number, payload: number[]): Uint8Array {
    const header = new Uint8Array([
        0x01,               // data_type
        0x00,               // status  
        0x01, 0x00,         // entry_count
        fragIndex,          // fragment_index
        totalFrags,         // total_fragments
        payload.length,     // fragment_size
        0x00                // reserved
    ]);
    return new Uint8Array([...header, ...payload]);
}
