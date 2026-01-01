/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryService } from '../services/HistoryService';
import { BleService } from '../services/BleService';
import { useAppStore } from '../store/useAppStore';

// Mock dependencies
vi.mock('../services/BleService');
vi.mock('../store/useAppStore');
vi.mock('localforage', () => {
    return {
        default: {
            createInstance: () => ({
                getItem: vi.fn(),
                setItem: vi.fn(),
                clear: vi.fn(),
            }),
        },
    };
});

describe('HistoryService', () => {
    let service: HistoryService;
    let mockBleService: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mocks
        mockBleService = {
            fetchWateringHistory: vi.fn(),
            fetchEnvHistoryPaged: vi.fn(),
            fetchRainHistory: vi.fn(),
        };
        (BleService.getInstance as any).mockReturnValue(mockBleService);

        service = HistoryService.getInstance();
        // Manually inject the mock because singleton might persist old reference
        (service as any).bleService = mockBleService;
    });

    describe('calculateWateringStats', () => {
        it('should calculate correct stats for empty entries', () => {
            const stats = service.calculateWateringStats([]);
            expect(stats.totalVolumeMl).toBe(0);
            expect(stats.totalSessions).toBe(0);
        });

        it('should calculate correct stats for populated entries', () => {
            const entries = [
                {
                    timestamp: 1000,
                    channel_id: 1,
                    actual_value_ml: 100,
                    success_status: 1,
                    flow_rate_avg: 10,
                    // other required fields
                    index: 0,
                    type: 0,
                    target_value: 100,
                    duration_sec: 10,
                    flow_rate_min: 5,
                    flow_rate_max: 15,
                    current_avg: 0,
                    voltage_start: 0,
                    voltage_end: 0,
                    // missing fields
                    event_type: 0,
                    mode: 0,
                    target_value_ml: 100,
                    total_volume_ml: 100,
                    start_time: 1000,
                    end_time: 1010,
                    trigger_type: 0,
                    error_code: 0
                },
                {
                    timestamp: 2000,
                    channel_id: 1,
                    actual_value_ml: 200,
                    success_status: 0, // failed
                    flow_rate_avg: 20,
                    index: 1,
                    type: 0,
                    target_value: 200,
                    duration_sec: 10,
                    flow_rate_min: 5,
                    flow_rate_max: 25,
                    current_avg: 0,
                    voltage_start: 0,
                    voltage_end: 0,
                    // missing fields
                    event_type: 0,
                    mode: 0,
                    target_value_ml: 200,
                    total_volume_ml: 200,
                    start_time: 2000,
                    end_time: 2010,
                    trigger_type: 0,
                    error_code: 0
                }
            ];

            const stats = service.calculateWateringStats(entries);

            expect(stats.totalVolumeMl).toBe(300);
            expect(stats.totalSessions).toBe(2);
            expect(stats.successRate).toBe(50); // 1 out of 2
            expect(stats.avgVolumePerSession).toBe(150);
            expect(stats.avgFlowRate).toBe(15);
        });
    });

    describe('aggregateWateringByPeriod', () => {
        it('should aggregate by hour', () => {
            // Monday 1st Jan 2024 10:00 AM
            const t1 = new Date('2024-01-01T10:00:00Z').getTime() / 1000;
            // Monday 1st Jan 2024 10:30 AM
            const t2 = new Date('2024-01-01T10:30:00Z').getTime() / 1000;
            // Monday 1st Jan 2024 11:00 AM
            const t3 = new Date('2024-01-01T11:00:00Z').getTime() / 1000;

            const entries = [
                { timestamp: t1, actual_value_ml: 100, channel_id: 1, success_status: 1 } as any,
                { timestamp: t2, actual_value_ml: 50, channel_id: 1, success_status: 1 } as any,
                { timestamp: t3, actual_value_ml: 200, channel_id: 2, success_status: 1 } as any
            ];

            // Note: HistoryService uses local time for aggregation keys 
            // Mocking Date/Timezone might be tricky, so we check general structure match
            const aggregated = service.aggregateWateringByPeriod(entries, 'hour');

            expect(aggregated.length).toBeGreaterThanOrEqual(2);
            // First group should have volume 150
            const group1 = aggregated.find(g => g.totalVolume === 150);
            expect(group1).toBeDefined();
            expect(group1?.sessions).toBe(2);

            // Second group should have volume 200
            const group2 = aggregated.find(g => g.totalVolume === 200);
            expect(group2).toBeDefined();
            expect(group2?.sessions).toBe(1);
        });
    });

    describe('calculateTrend', () => {
        it('should detect rising trend', () => {
            const trend = service.calculateTrend(110, 100, 'Test');
            expect(trend.direction).toBe('up');
            expect(trend.percentage).toBe(10);
        });

        it('should detect falling trend', () => {
            const trend = service.calculateTrend(90, 100, 'Test');
            expect(trend.direction).toBe('down');
            expect(trend.percentage).toBe(10);
        });

        it('should detect stable trend', () => {
            const trend = service.calculateTrend(102, 100, 'Test'); // 2% change
            expect(trend.direction).toBe('stable');
        });
    });

    describe('fetchWateringHistory', () => {
        it('should call ble service and cache results', async () => {
            // Mock store to return dummy data after fetch
            const mockEntries = [{
                id: 1,
                channel_id: 1, // Added channel_id
                actual_value_ml: 100,
                // Add minimum required fields to satisfy type if needed, though 'as any' works for runtime
            }];
            (useAppStore as any).getState = vi.fn().mockReturnValue({
                wateringHistory: mockEntries
            });

            const result = await service.fetchWateringHistory([1]);

            expect(mockBleService.fetchWateringHistory).toHaveBeenCalled();
            expect(result).toEqual(mockEntries);
        });
    });
});
