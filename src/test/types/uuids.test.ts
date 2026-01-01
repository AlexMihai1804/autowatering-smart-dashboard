import { describe, it, expect } from 'vitest';
import { SERVICE_UUID, CUSTOM_CONFIG_SERVICE_UUID, CHAR_UUIDS } from '../../types/uuids';

describe('UUIDs', () => {
    describe('SERVICE_UUID', () => {
        it('should be a valid UUID format', () => {
            expect(SERVICE_UUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should be the expected value', () => {
            expect(SERVICE_UUID).toBe('12345678-1234-5678-1234-56789abcdef0');
        });
    });

    describe('CUSTOM_CONFIG_SERVICE_UUID', () => {
        it('should be a valid UUID format', () => {
            expect(CUSTOM_CONFIG_SERVICE_UUID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('should be different from SERVICE_UUID', () => {
            expect(CUSTOM_CONFIG_SERVICE_UUID).not.toBe(SERVICE_UUID);
        });
    });

    describe('CHAR_UUIDS', () => {
        it('should contain all required characteristic UUIDs', () => {
            const expectedCharacteristics = [
                'VALVE_CONTROL',
                'FLOW_SENSOR',
                'SYSTEM_STATUS',
                'CHANNEL_CONFIG',
                'SCHEDULE_CONFIG',
                'SYSTEM_CONFIG',
                'TASK_QUEUE',
                'STATISTICS',
                'RTC_CONFIG',
                'ALARM_STATUS',
                'CALIBRATION',
                'HISTORY_MGMT',
                'DIAGNOSTICS',
                'GROWING_ENV',
                'AUTO_CALC_STATUS',
                'CURRENT_TASK',
                'TIMEZONE_CONFIG',
                'RAIN_SENSOR_CONFIG',
                'RAIN_SENSOR_DATA',
                'RAIN_HISTORY',
                'ENV_DATA',
                'ENV_HISTORY',
                'COMPENSATION_STATUS',
                'RAIN_INTEGRATION',
                'ONBOARDING_STATUS',
                'RESET_CONTROL',
                'HYDRAULIC_STATUS',
                'CHANNEL_COMP_CONFIG',
                'BULK_SYNC_SNAPSHOT',
                'CUSTOM_SOIL_CONFIG',
                'SOIL_MOISTURE_CONFIG',
                'INTERVAL_MODE_CONFIG',
            ];

            expectedCharacteristics.forEach(char => {
                expect(CHAR_UUIDS).toHaveProperty(char);
            });
        });

        it('should have unique UUIDs for each characteristic', () => {
            const uuids = Object.values(CHAR_UUIDS);
            const uniqueUuids = new Set(uuids);
            expect(uniqueUuids.size).toBe(uuids.length);
        });

        it('should have valid UUID format for all characteristics', () => {
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

            Object.entries(CHAR_UUIDS).forEach(([key, value]) => {
                expect(value, `${key} should be a valid UUID`).toMatch(uuidRegex);
            });
        });

        it('should have VALVE_CONTROL characteristic', () => {
            expect(CHAR_UUIDS.VALVE_CONTROL).toBe('12345678-1234-5678-1234-56789abcdef1');
        });

        it('should have FLOW_SENSOR characteristic', () => {
            expect(CHAR_UUIDS.FLOW_SENSOR).toBe('12345678-1234-5678-1234-56789abcdef2');
        });

        it('should have SYSTEM_STATUS characteristic', () => {
            expect(CHAR_UUIDS.SYSTEM_STATUS).toBe('12345678-1234-5678-1234-56789abcdef3');
        });

        it('should have CALIBRATION characteristic', () => {
            expect(CHAR_UUIDS.CALIBRATION).toBe('12345678-1234-5678-1234-56789abcdefb');
        });

        it('should have RESET_CONTROL characteristic', () => {
            expect(CHAR_UUIDS.RESET_CONTROL).toBe('12345678-1234-5678-1234-56789abcde21');
        });

        it('should have Custom Configuration characteristics', () => {
            expect(CHAR_UUIDS.CUSTOM_SOIL_CONFIG).toBeDefined();
            expect(CHAR_UUIDS.SOIL_MOISTURE_CONFIG).toBeDefined();
            expect(CHAR_UUIDS.INTERVAL_MODE_CONFIG).toBeDefined();
        });
    });
});
