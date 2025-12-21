import { BleClient } from '@capacitor-community/bluetooth-le';
import { 
    FRAGMENT_TYPE_FULL_LE, 
    WRITE_HEADER_SIZE, 
    MAX_CHUNK_SIZE, 
    UnifiedHistoryHeader, 
    UNIFIED_HEADER_SIZE 
} from '../types/firmware_structs';

export class BleFragmentationManager {
    private static instance: BleFragmentationManager;
    private reassemblyBuffers: Map<string, {
        totalFragments: number;
        receivedFragments: number;
        buffer: Uint8Array;
        timestamp: number;
    }> = new Map();

    private constructor() {}

    public static getInstance(): BleFragmentationManager {
        if (!BleFragmentationManager.instance) {
            BleFragmentationManager.instance = new BleFragmentationManager();
        }
        return BleFragmentationManager.instance;
    }

    /**
     * Writes a large payload to a characteristic using the custom fragmentation protocol.
     * @param deviceId The BLE device ID
     * @param serviceUuid The Service UUID
     * @param characteristicUuid The Characteristic UUID
     * @param data The full data payload to send
     * @param channelId Optional channel ID for channel-scoped characteristics (0-7)
     */
    public async writeFragmented(
        deviceId: string,
        serviceUuid: string,
        characteristicUuid: string,
        data: Uint8Array,
        channelId?: number
    ): Promise<void> {
        const totalSize = data.length;
        const header = new Uint8Array(WRITE_HEADER_SIZE);

        // Byte 0: Channel ID or Reserved (0x00)
        header[0] = channelId !== undefined ? channelId : 0x00;
        
        // Byte 1: Fragment Type (Always use 3 - LE for new implementations)
        header[1] = FRAGMENT_TYPE_FULL_LE;

        // Byte 2-3: Size (Little Endian)
        header[2] = totalSize & 0xFF;
        header[3] = (totalSize >> 8) & 0xFF;

        // First fragment: Header + Data
        const firstPayloadSize = Math.min(MAX_CHUNK_SIZE - WRITE_HEADER_SIZE, totalSize);
        const firstFragment = new Uint8Array(WRITE_HEADER_SIZE + firstPayloadSize);
        firstFragment.set(header, 0);
        firstFragment.set(data.slice(0, firstPayloadSize), WRITE_HEADER_SIZE);

        await BleClient.write(deviceId, serviceUuid, characteristicUuid, new DataView(firstFragment.buffer));

        // Remaining fragments
        let offset = firstPayloadSize;
        while (offset < totalSize) {
            // 50ms delay to prevent stack overflow on device
            await new Promise(resolve => setTimeout(resolve, 50));

            const chunkSize = Math.min(MAX_CHUNK_SIZE, totalSize - offset);
            const chunk = data.slice(offset, offset + chunkSize);
            
            await BleClient.write(deviceId, serviceUuid, characteristicUuid, new DataView(chunk.buffer));
            offset += chunkSize;
        }
    }

    /**
     * Handles incoming notifications that might be fragmented (Unified Header).
     * Returns the fully reassembled buffer if complete, or null if still waiting.
     * @param characteristicUuid The UUID of the characteristic sending the notification
     * @param data The raw data received in the notification
     */
    public handleFragmentedNotification(
        characteristicUuid: string,
        data: DataView
    ): { complete: boolean; payload?: Uint8Array; header?: UnifiedHistoryHeader } {
        // Check if it's a unified header (min 8 bytes)
        if (data.byteLength < UNIFIED_HEADER_SIZE) {
            // Not a unified fragmented packet (or too small)
            const payload = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
            return { complete: true, payload };
        }

        const header = this.parseUnifiedHeader(data);
        const availablePayload = Math.max(0, data.byteLength - UNIFIED_HEADER_SIZE);
        const totalFragments = header.total_fragments > 0 ? header.total_fragments : 1;
        const fragmentSize = header.fragment_size > 0 ? header.fragment_size : availablePayload;
        const fragmentIndex = header.fragment_index || 0;
        const normalizedHeader = { ...header, total_fragments: totalFragments, fragment_size: fragmentSize };
        const derivedPayloadLen = Math.min(fragmentSize, availablePayload);
        
        // Validate header - accept status/error frames even if entry_count=0/fragment_size=0
        const isValidHeader = 
            fragmentIndex < Math.max(totalFragments, 1) &&
            derivedPayloadLen <= availablePayload;
        
        if (!isValidHeader) {
            // This doesn't look like a valid fragmented notification
            // It might be raw data without header (e.g., from a read that triggered a notify echo)
            console.warn(`[FRAG] ${characteristicUuid.slice(-4)}: Invalid header detected, treating as raw data. Header:`, header);
            const payload = new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength));
            return { complete: true, payload };
        }
        
        console.log(`[FRAG] ${characteristicUuid.slice(-4)}: idx=${fragmentIndex}/${totalFragments}, size=${fragmentSize}, dataLen=${data.byteLength}`);
        
        // Extract payload correctly using slice to get a clean copy
        const payloadStart = data.byteOffset + UNIFIED_HEADER_SIZE;
        const payloadLength = derivedPayloadLen;
        const payload = new Uint8Array(data.buffer.slice(payloadStart, payloadStart + payloadLength));
        
        if (totalFragments <= 1) {
            return { complete: true, payload, header: normalizedHeader };
        }

        // Multi-fragment reassembly
        // Key by characteristic + data_type to avoid collisions when different query types
        // are in flight on the same characteristic (e.g. rain hourly then rain daily).
        const key = `${characteristicUuid}:${normalizedHeader.data_type}`;
        let state = this.reassemblyBuffers.get(key);

        // If this is the first fragment (index 0) or we don't have state, init state
        if (fragmentIndex === 0 || !state) {
            state = {
                totalFragments,
                receivedFragments: 0,
                buffer: new Uint8Array(0), 
                timestamp: Date.now()
            };
            this.reassemblyBuffers.set(key, state);
        }

        // Append data
        // We assume ordered delivery for BLE notifications
        const newBuffer = new Uint8Array(state.buffer.length + payload.length);
        newBuffer.set(state.buffer, 0);
        newBuffer.set(payload, state.buffer.length);
        state.buffer = newBuffer;
        state.receivedFragments++;

        console.log(`[FRAG] ${characteristicUuid.slice(-4)}: received=${state.receivedFragments}/${state.totalFragments}, bufferLen=${state.buffer.length}`);

        if (state.receivedFragments === state.totalFragments) {
            this.reassemblyBuffers.delete(key);
            return { complete: true, payload: state.buffer, header: normalizedHeader };
        }

        return { complete: false };
    }

    private parseUnifiedHeader(data: DataView): UnifiedHistoryHeader {
        return {
            data_type: data.getUint8(0),
            status: data.getUint8(1),
            entry_count: data.getUint16(2, true), // Little Endian
            fragment_index: data.getUint8(4),
            total_fragments: data.getUint8(5),
            fragment_size: data.getUint8(6),
            reserved: data.getUint8(7)
        };
    }
}
