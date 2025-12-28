import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { BleService } from '../services/BleService';
import { useAppStore } from '../store/useAppStore';
import { CHAR_UUIDS, SERVICE_UUID } from '../types/uuids';
import {
    TaskQueueCommand,
    AlarmCode,
    CalibrationAction
} from '../types/firmware_structs';

// Helper to create DataView from byte array
function createDataView(bytes: number[]): DataView {
    const arr = new Uint8Array(bytes);
    return new DataView(arr.buffer);
}

describe('BleService', () => {
    let bleService: BleService;

    beforeEach(() => {
        // Get fresh instance
        // @ts-expect-error - accessing private static for testing
        BleService.instance = undefined;
        bleService = BleService.getInstance();
        
        // Reset store
        useAppStore.getState().resetStore();
        
        // Clear all mocks
        vi.clearAllMocks();
    });

    describe('Singleton Pattern', () => {
        it('should return the same instance', () => {
            const instance1 = BleService.getInstance();
            const instance2 = BleService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('Connection Management', () => {
        it('should initialize BLE', async () => {
            await bleService.initialize();
            expect(BleClient.initialize).toHaveBeenCalled();
        });

        it('should handle initialization failure gracefully', async () => {
            vi.mocked(BleClient.initialize).mockRejectedValueOnce(new Error('BLE not supported'));
            
            // Should not throw
            await expect(bleService.initialize()).resolves.not.toThrow();
        });

        it('should throw when reading without connection', async () => {
            await expect(bleService.readValveControl()).rejects.toThrow('Not connected');
        });
    });

    describe('Data Parsing', () => {
        describe('parseFlowSensor', () => {
            it('should parse flow sensor data correctly', () => {
                // 4 bytes: uint32 flow_rate_or_pulses (LE)
                const data = createDataView([0xE8, 0x03, 0x00, 0x00]); // 1000
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseFlowSensor(data);
                
                expect(result.flow_rate_or_pulses).toBe(1000);
            });
        });

        describe('parseTaskQueue', () => {
            it('should parse task queue data correctly', () => {
                // 9 bytes: pending(1), completed(1), currentCh(1), taskType(1), 
                //          value(2), command(1), deleteId(1), activeId(1)
                const data = createDataView([
                    0x03,       // pending_count = 3
                    0x05,       // completed_tasks = 5
                    0x02,       // current_channel = 2
                    0x00,       // current_task_type = 0 (duration)
                    0x0F, 0x00, // current_value = 15 (LE)
                    0x00,       // command
                    0x00,       // task_id_to_delete
                    0x01        // active_task_id = 1
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseTaskQueue(data);
                
                expect(result.pending_count).toBe(3);
                expect(result.completed_tasks).toBe(5);
                expect(result.current_channel).toBe(2);
                expect(result.current_value).toBe(15);
                expect(result.active_task_id).toBe(1);
            });

            it('should handle idle queue (no active task)', () => {
                const data = createDataView([
                    0x00,       // pending_count = 0
                    0x00,       // completed_tasks = 0
                    0xFF,       // current_channel = 0xFF (none)
                    0xFF,       // current_task_type = 0xFF (error/none)
                    0x00, 0x00, // current_value = 0
                    0x00,       // command
                    0x00,       // task_id_to_delete
                    0x00        // active_task_id = 0
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseTaskQueue(data);
                
                expect(result.pending_count).toBe(0);
                expect(result.current_channel).toBe(255);
            });
        });

        describe('parseStatistics', () => {
            it('should parse statistics data correctly', () => {
                // 15 bytes: ch(1), totalVol(4), lastVol(4), lastTime(4), count(2)
                const data = createDataView([
                    0x00,                   // channel_id = 0
                    0x50, 0xC3, 0x00, 0x00, // total_volume = 50000ml (LE)
                    0xC4, 0x09, 0x00, 0x00, // last_volume = 2500ml (LE)
                    0x10, 0x0E, 0x67, 0x66, // last_watering timestamp (LE)
                    0x19, 0x00              // count = 25 (LE)
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseStatistics(data);
                
                expect(result.channel_id).toBe(0);
                expect(result.total_volume).toBe(50000);
                expect(result.last_volume).toBe(2500);
                expect(result.count).toBe(25);
            });
        });

        describe('parseAlarm', () => {
            it('should parse alarm data correctly', () => {
                // 7 bytes: code(1), data(2), timestamp(4)
                const data = createDataView([
                    0x01,                   // alarm_code = NO_FLOW
                    0x01, 0x00,             // alarm_data = 1 (LE)
                    0x90, 0x0E, 0x67, 0x66  // timestamp = 1718452880 (LE)
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseAlarm(data);
                
                expect(result.alarm_code).toBe(AlarmCode.NO_FLOW);
                expect(result.alarm_data).toBe(1);
                // Just verify it's a reasonable Unix timestamp (> 2020)
                expect(result.timestamp).toBeGreaterThan(1577836800);
            });

            it('should parse no alarm correctly', () => {
                const data = createDataView([
                    0x00,                   // alarm_code = NONE
                    0x00, 0x00,             // alarm_data = 0
                    0x00, 0x00, 0x00, 0x00  // timestamp = 0
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseAlarm(data);
                
                expect(result.alarm_code).toBe(AlarmCode.NONE);
            });
        });

        describe('parseDiagnostics', () => {
            it('should parse diagnostics data correctly', () => {
                // 12 bytes: uptime(4), errorCount(2), lastError(1), valveStatus(1), battery(1), reserved(3)
                const data = createDataView([
                    0x40, 0x38, 0x00, 0x00, // uptime = 14400 mins (LE)
                    0x02, 0x00,             // error_count = 2 (LE)
                    0x03,                   // last_error = 3
                    0x05,                   // valve_status = 0b00000101
                    0x55,                   // battery_level = 85
                    0x00, 0x00, 0x00        // reserved
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseDiagnostics(data);
                
                expect(result.uptime).toBe(14400);
                expect(result.error_count).toBe(2);
                expect(result.last_error).toBe(3);
                expect(result.valve_status).toBe(5);
                expect(result.battery_level).toBe(85);
            });

            it('should handle mains-powered device', () => {
                const data = createDataView([
                    0x40, 0x38, 0x00, 0x00,
                    0x00, 0x00,
                    0x00,
                    0x00,
                    0xFF,                   // battery_level = 255 (mains)
                    0x00, 0x00, 0x00
                ]);
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseDiagnostics(data);
                
                expect(result.battery_level).toBe(255);
            });
        });

        describe('parseEnvironmentalData', () => {
            it('should parse environmental data correctly', () => {
                // Create buffer: temp(4), humidity(4), pressure(4), timestamp(4), status(1), interval(2), quality(1) = 20 bytes
                const buffer = new ArrayBuffer(20);
                const view = new DataView(buffer);
                
                view.setFloat32(0, 25.5, true);   // temperature
                view.setFloat32(4, 60.0, true);   // humidity
                view.setFloat32(8, 1013.25, true);// pressure
                view.setUint32(12, 1718451600, true); // timestamp
                view.setUint8(16, 0);             // sensor_status
                view.setUint16(17, 60, true);     // measurement_interval (60s)
                view.setUint8(19, 0);             // data_quality
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseEnvironmentalData(view);
                
                expect(result.temperature).toBeCloseTo(25.5, 1);
                expect(result.humidity).toBeCloseTo(60.0, 1);
                expect(result.pressure).toBeCloseTo(1013.25, 1);
                expect(result.timestamp).toBe(1718451600);
                expect(result.sensor_status).toBe(0);
            });
        });

        describe('parseRainData', () => {
            it('should parse rain data correctly', () => {
                // 24 bytes: current_hour(4), today(4), last24h(4), rate(2), lastPulse(4), pulses(4), status(1), quality(1)
                const buffer = new ArrayBuffer(24);
                const view = new DataView(buffer);
                
                view.setUint32(0, 50, true);      // current_hour_mm = 0.5 (50/100)
                view.setUint32(4, 1230, true);    // today_total_mm = 12.3 (1230/100)
                view.setUint32(8, 2500, true);    // last_24h_mm = 25.0
                view.setUint16(12, 100, true);    // current_rate_mm_h = 1.0
                view.setUint32(14, 1718451000, true); // last_pulse_time
                view.setUint32(18, 500, true);    // total_pulses
                view.setUint8(22, 0);             // sensor_status = OK
                view.setUint8(23, 0);             // data_quality = GOOD
                
                // @ts-expect-error - accessing private method
                const result = bleService.parseRainData(view);
                
                expect(result.current_hour_mm).toBeCloseTo(0.5, 1);
                expect(result.today_total_mm).toBeCloseTo(12.3, 1);
                expect(result.sensor_status).toBe(0);
            });
        });

        describe('parseRainHourlyEntries', () => {
            it('should parse multiple hourly rain entries', () => {
                // 8 bytes per entry: hour_epoch(4), rainfall_mm_x100(2), pulse_count(1), data_quality(1)
                const buffer = new ArrayBuffer(24); // 3 entries
                const view = new DataView(buffer);
                
                // Entry 1
                view.setUint32(0, 1718448000, true);  // hour_epoch
                view.setUint16(4, 50, true);         // rainfall = 0.5mm
                view.setUint8(6, 10);                // pulse_count
                view.setUint8(7, 0);                 // data_quality
                
                // Entry 2
                view.setUint32(8, 1718451600, true);  // hour_epoch
                view.setUint16(12, 120, true);        // rainfall = 1.2mm
                view.setUint8(14, 24);               // pulse_count
                view.setUint8(15, 0);                // data_quality
                
                // Entry 3
                view.setUint32(16, 1718455200, true); // hour_epoch
                view.setUint16(20, 0, true);         // rainfall = 0mm
                view.setUint8(22, 0);                // pulse_count
                view.setUint8(23, 0);                // data_quality
                
                // @ts-ignore - accessing private method
                const result = bleService.parseRainHourlyEntries(view, 3);
                
                expect(result).toHaveLength(3);
                expect(result[0].hour_epoch).toBe(1718448000);
                expect(result[0].rainfall_mm_x100).toBe(50);
                expect(result[1].rainfall_mm_x100).toBe(120);
                expect(result[2].rainfall_mm_x100).toBe(0);
            });
        });

        describe('parseEnvDetailedEntries', () => {
            it('should parse detailed environmental history entries', () => {
                // 12 bytes per entry: timestamp(4), temp_x100(2), hum_x100(2), pressure_pa(4)
                const buffer = new ArrayBuffer(12);
                const view = new DataView(buffer);
                
                view.setUint32(0, 1718451600, true);  // timestamp
                view.setInt16(4, 2250, true);        // temperature = 22.5°C (2250/100)
                view.setUint16(6, 6500, true);       // humidity = 65.0% (6500/100)
                view.setUint32(8, 101500, true);     // pressure = 101500 Pa
                
                // @ts-ignore - accessing private method
                const result = bleService.parseEnvDetailedEntries(view, 1);
                
                expect(result).toHaveLength(1);
                expect(result[0].timestamp).toBe(1718451600);
                expect(result[0].temperature_c_x100).toBe(2250);
                expect(result[0].humidity_pct_x100).toBe(6500);
                expect(result[0].pressure_pa).toBe(101500);
            });
        });

        describe('Auto Calc Status decoding (READ vs NOTIFY)', () => {
            it('should decode next_irrigation_time from READ payload (64 bytes)', () => {
                // Build a minimal 64B auto_calc_status_data payload
                const payload = new Uint8Array(64);
                const view = new DataView(payload.buffer);

                const channelId = 2;
                const nextIrrigationEpoch = 1734739200; // example UTC epoch seconds

                view.setUint8(0, channelId);           // channel_id
                view.setUint8(1, 1);                   // calculation_active
                view.setUint8(2, 1);                   // irrigation_needed
                view.setUint32(31, nextIrrigationEpoch, true); // next_irrigation_time @ 31

                // @ts-expect-error - accessing private method
                bleService.dispatchToStore(CHAR_UUIDS.AUTO_CALC_STATUS, payload);

                const stored = useAppStore.getState().autoCalcStatus.get(channelId);
                expect(stored).toBeTruthy();
                expect(stored?.next_irrigation_time).toBe(nextIrrigationEpoch);
            });

            it('should decode next_irrigation_time from NOTIFY frame (8B header + 64B payload)', () => {
                // Header (history_fragment_header_t / unified header):
                // 00 00 01 00 00 01 40 00
                const header = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x00, 0x01, 0x40, 0x00]);

                const payload = new Uint8Array(64);
                const payloadView = new DataView(payload.buffer);

                const channelId = 3;
                const nextIrrigationEpoch = 1734825600; // another example

                payloadView.setUint8(0, channelId);
                payloadView.setUint8(1, 1);
                payloadView.setUint8(2, 1);
                payloadView.setUint32(31, nextIrrigationEpoch, true);

                const frame = new Uint8Array(72);
                frame.set(header, 0);
                frame.set(payload, 8);

                // Simulate an edge-case path: dispatch receives header+payload.
                // @ts-expect-error - accessing private method
                bleService.dispatchToStore(CHAR_UUIDS.AUTO_CALC_STATUS, frame);

                const stored = useAppStore.getState().autoCalcStatus.get(channelId);
                expect(stored).toBeTruthy();
                expect(stored?.next_irrigation_time).toBe(nextIrrigationEpoch);
            });
        });
    });

    describe('Store Updates from Notifications', () => {
        it('should update store when receiving flow sensor notification', () => {
            // Simulate connected state
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';

            const data = new Uint8Array([0xE8, 0x03, 0x00, 0x00]); // 1000 pulses
            
            // @ts-expect-error - accessing private method
            bleService.dispatchToStore(CHAR_UUIDS.FLOW_SENSOR, data);
            
            expect(useAppStore.getState().flowSensorData?.flow_rate_or_pulses).toBe(1000);
        });

        it('should update store when receiving task queue notification', () => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';

            const data = new Uint8Array([
                0x02, 0x03, 0x01, 0x00, 0x0A, 0x00, 0x00, 0x00, 0x05
            ]);
            
            // @ts-expect-error - accessing private method
            bleService.dispatchToStore(CHAR_UUIDS.TASK_QUEUE, data);
            
            const queue = useAppStore.getState().taskQueue;
            expect(queue?.pending_count).toBe(2);
            expect(queue?.active_task_id).toBe(5);
        });

        it('should update store when receiving statistics notification', () => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';

            const data = new Uint8Array([
                0x01,                   // channel 1
                0x10, 0x27, 0x00, 0x00, // 10000ml
                0xE8, 0x03, 0x00, 0x00, // 1000ml
                0x00, 0x00, 0x00, 0x00, // timestamp
                0x0A, 0x00              // 10 sessions
            ]);
            
            // @ts-expect-error - accessing private method
            bleService.dispatchToStore(CHAR_UUIDS.STATISTICS, data);
            
            const stats = useAppStore.getState().statistics.get(1);
            expect(stats?.total_volume).toBe(10000);
            expect(stats?.count).toBe(10);
        });

        it('should update store when receiving alarm notification', () => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';

            const data = new Uint8Array([
                0x04,                   // HIGH_FLOW
                0x00, 0x00,             // data
                0x00, 0x00, 0x00, 0x00  // timestamp
            ]);
            
            // @ts-expect-error - accessing private method
            bleService.dispatchToStore(CHAR_UUIDS.ALARM_STATUS, data);
            
            expect(useAppStore.getState().alarmStatus?.alarm_code).toBe(AlarmCode.HIGH_FLOW);
        });

        it('should update store when receiving diagnostics notification', () => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';

            const data = new Uint8Array([
                0x60, 0xEA, 0x00, 0x00, // 60000 mins uptime
                0x01, 0x00,             // 1 error
                0x02,                   // last_error
                0x03,                   // valve_status
                0x64,                   // 100% battery
                0x00, 0x00, 0x00        // reserved
            ]);
            
            // @ts-expect-error - accessing private method
            bleService.dispatchToStore(CHAR_UUIDS.DIAGNOSTICS, data);
            
            const diag = useAppStore.getState().diagnosticsData;
            expect(diag?.uptime).toBe(60000);
            expect(diag?.battery_level).toBe(100);
        });
    });

    describe('Command Validation', () => {
        beforeEach(() => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';
        });

        it('should reject invalid task queue commands', async () => {
            await expect(bleService.writeTaskQueueCommand(-1)).rejects.toThrow('Invalid command');
            await expect(bleService.writeTaskQueueCommand(6)).rejects.toThrow('Invalid command');
        });

        it('should reject invalid current task control opcodes', async () => {
            await expect(bleService.writeCurrentTaskControl(-1)).rejects.toThrow('Invalid opcode');
            await expect(bleService.writeCurrentTaskControl(3)).rejects.toThrow('Invalid opcode');
        });

        it('should accept valid task queue commands', async () => {
            for (let cmd = 0; cmd <= 5; cmd++) {
                await expect(bleService.writeTaskQueueCommand(cmd)).resolves.not.toThrow();
            }
        });

        it('should accept valid current task control opcodes', async () => {
            for (let op = 0; op <= 2; op++) {
                await expect(bleService.writeCurrentTaskControl(op)).resolves.not.toThrow();
            }
        });
    });

    describe('Task Queue Commands', () => {
        beforeEach(() => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';
        });

        it('should write start next task command', async () => {
            await bleService.startNextTask();
            
            expect(BleClient.write).toHaveBeenCalledWith(
                'test-device',
                SERVICE_UUID,
                CHAR_UUIDS.TASK_QUEUE,
                expect.any(DataView)
            );
        });

        it('should write pause command', async () => {
            await bleService.pauseCurrentTask();
            expect(BleClient.write).toHaveBeenCalled();
        });

        it('should write resume command', async () => {
            await bleService.resumeCurrentTask();
            expect(BleClient.write).toHaveBeenCalled();
        });

        it('should write cancel command', async () => {
            await bleService.cancelCurrentTask();
            expect(BleClient.write).toHaveBeenCalled();
        });

        it('should write clear all command', async () => {
            await bleService.clearTaskQueue();
            expect(BleClient.write).toHaveBeenCalled();
        });
    });

    describe('Current Task Control', () => {
        beforeEach(() => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';
        });

        it('should write stop current watering command', async () => {
            await bleService.stopCurrentWatering();
            
            expect(BleClient.write).toHaveBeenCalledWith(
                'test-device',
                SERVICE_UUID,
                CHAR_UUIDS.CURRENT_TASK,
                expect.any(DataView)
            );
        });

        it('should write pause current watering command', async () => {
            await bleService.pauseCurrentWatering();
            expect(BleClient.write).toHaveBeenCalled();
        });

        it('should write resume current watering command', async () => {
            await bleService.resumeCurrentWatering();
            expect(BleClient.write).toHaveBeenCalled();
        });
    });

    describe('Alarm Control', () => {
        beforeEach(() => {
            // @ts-expect-error - accessing private property
            bleService.connectedDeviceId = 'test-device';
        });

        it('should clear all alarms', async () => {
            await bleService.clearAlarm();
            
            expect(BleClient.write).toHaveBeenCalledWith(
                'test-device',
                SERVICE_UUID,
                CHAR_UUIDS.ALARM_STATUS,
                expect.any(DataView)
            );
        });

        it('should clear specific alarm', async () => {
            await bleService.clearAlarm(AlarmCode.NO_FLOW);
            expect(BleClient.write).toHaveBeenCalled();
        });
    });
});
