import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';
import {
    SystemStatus,
    TaskStatus,
    AlarmCode,
    ChannelConfigData,
    ValveControlData,
    RtcData,
    CalibrationData,
    CurrentTaskData,
    EnvironmentalData,
    RainData,
    FlowSensorData,
    TaskQueueData,
    StatisticsData,
    AlarmData,
    DiagnosticsData,
    HistoryDetailedEntry,
    RainHourlyEntry,
    RainDailyEntry,
    EnvDetailedEntry,
    EnvHourlyEntry,
    EnvDailyEntry,
    SystemConfigData,
    RainConfigData,
    TimezoneConfigData,
    RainIntegrationStatusData,
    CompensationStatusData,
    AutoCalcStatusData,
    GrowingEnvData,
    ScheduleConfigData,
    ChannelCompensationConfigData,
    OnboardingStatusData
} from '../types/firmware_structs';

describe('useAppStore', () => {
    beforeEach(() => {
        // Reset store to initial state before each test
        useAppStore.getState().resetStore();
    });

    describe('Connection State Management', () => {
        it('should have initial disconnected state', () => {
            const state = useAppStore.getState();
            expect(state.connectionState).toBe('disconnected');
            expect(state.connectedDeviceId).toBeNull();
            expect(state.discoveredDevices).toEqual([]);
        });

        it('should set connection state', () => {
            useAppStore.getState().setConnectionState('scanning');
            expect(useAppStore.getState().connectionState).toBe('scanning');

            useAppStore.getState().setConnectionState('connecting');
            expect(useAppStore.getState().connectionState).toBe('connecting');

            useAppStore.getState().setConnectionState('connected');
            expect(useAppStore.getState().connectionState).toBe('connected');
        });

        it('should add discovered device', () => {
            const device = { deviceId: 'AA:BB:CC:DD:EE:FF', name: 'AutoWatering_001' };
            useAppStore.getState().addDiscoveredDevice(device);

            const state = useAppStore.getState();
            expect(state.discoveredDevices).toHaveLength(1);
            expect(state.discoveredDevices[0].deviceId).toBe('AA:BB:CC:DD:EE:FF');
        });

        it('should not add duplicate devices', () => {
            const device = { deviceId: 'AA:BB:CC:DD:EE:FF', name: 'AutoWatering_001' };
            useAppStore.getState().addDiscoveredDevice(device);
            useAppStore.getState().addDiscoveredDevice(device);

            expect(useAppStore.getState().discoveredDevices).toHaveLength(1);
        });

        it('should set connected device ID', () => {
            useAppStore.getState().setConnectedDeviceId('device-123');
            expect(useAppStore.getState().connectedDeviceId).toBe('device-123');
        });
    });

    describe('Zone Management', () => {
        it('should have empty zones initially', () => {
            expect(useAppStore.getState().zones).toEqual([]);
        });

        it('should set zones', () => {
            const zones: ChannelConfigData[] = [
                {
                    channel_id: 0,
                    name_len: 4,
                    name: 'Zone',
                    auto_enabled: true,
                    plant_type: 1,
                    soil_type: 2,
                    irrigation_method: 0,
                    coverage_type: 0,
                    coverage: { area_m2: 10.5 },
                    sun_percentage: 80
                }
            ];
            useAppStore.getState().setZones(zones);
            expect(useAppStore.getState().zones).toHaveLength(1);
            expect(useAppStore.getState().zones[0].name).toBe('Zone');
        });

        it('should update individual zone', () => {
            const zones: ChannelConfigData[] = [
                {
                    channel_id: 0,
                    name_len: 5,
                    name: 'Front',
                    auto_enabled: false,
                    plant_type: 0,
                    soil_type: 0,
                    irrigation_method: 0,
                    coverage_type: 0,
                    coverage: { area_m2: 5 },
                    sun_percentage: 50
                }
            ];
            useAppStore.getState().setZones(zones);
            useAppStore.getState().updateZone(0, { name: 'Updated', sun_percentage: 90 });

            const updatedZone = useAppStore.getState().zones[0];
            expect(updatedZone.name).toBe('Updated');
            expect(updatedZone.sun_percentage).toBe(90);
        });

        it('should handle update for non-existent zone gracefully', () => {
            useAppStore.getState().updateZone(99, { name: 'Ghost' });
            // Should not throw, zones remain empty
            expect(useAppStore.getState().zones).toEqual([]);
        });
    });

    describe('Valve Status Management', () => {
        it('should update valve status', () => {
            const valveData: ValveControlData = {
                channel_id: 0,
                task_type: 1,
                value: 100
            };
            useAppStore.getState().updateValveStatus(0, valveData);

            const status = useAppStore.getState().valveStatus.get(0);
            expect(status).toBeDefined();
            expect(status?.task_type).toBe(1);
            expect(status?.value).toBe(100);
        });

        it('should update multiple valve statuses independently', () => {
            useAppStore.getState().updateValveStatus(0, { channel_id: 0, task_type: 1, value: 50 });
            useAppStore.getState().updateValveStatus(1, { channel_id: 1, task_type: 0, value: 10 });

            expect(useAppStore.getState().valveStatus.get(0)?.value).toBe(50);
            expect(useAppStore.getState().valveStatus.get(1)?.value).toBe(10);
        });
    });

    describe('RTC Configuration', () => {
        it('should set RTC config', () => {
            const rtcData: RtcData = {
                year: 24,
                month: 6,
                day: 15,
                hour: 14,
                minute: 30,
                second: 0,
                day_of_week: 6,
                utc_offset_minutes: 120,
                dst_active: true
            };
            useAppStore.getState().setRtcConfig(rtcData);

            const rtc = useAppStore.getState().rtcConfig;
            expect(rtc).toBeDefined();
            expect(rtc?.year).toBe(24);
            expect(rtc?.dst_active).toBe(true);
        });
    });

    describe('Calibration State', () => {
        it('should set calibration state', () => {
            const calData: CalibrationData = {
                action: 2, // IN_PROGRESS
                pulses: 1000,
                volume_ml: 500,
                pulses_per_liter: 2000
            };
            useAppStore.getState().setCalibrationState(calData);

            const cal = useAppStore.getState().calibrationState;
            expect(cal?.action).toBe(2);
            expect(cal?.pulses_per_liter).toBe(2000);
        });
    });

    describe('Reset State', () => {
        it('should set reset state', () => {
            const resetData = {
                reset_type: 2,
                channel_id: 0,
                confirmation_code: 0,
                status: 1,
                timestamp: 1718451600
            };
            useAppStore.getState().setResetState(resetData);

            const resetState = useAppStore.getState().resetState;
            expect(resetState?.reset_type).toBe(2);
            expect(resetState?.status).toBe(1);
        });
    });

    describe('Current Task', () => {
        it('should set current task', () => {
            const task: CurrentTaskData = {
                channel_id: 2,
                start_time: 1718451600,
                mode: 0,
                target_value: 600,
                current_value: 300,
                total_volume: 2500,
                status: TaskStatus.RUNNING,
                reserved: 0
            };
            useAppStore.getState().setCurrentTask(task);

            const currentTask = useAppStore.getState().currentTask;
            expect(currentTask?.channel_id).toBe(2);
            expect(currentTask?.status).toBe(TaskStatus.RUNNING);
        });
    });

    describe('Environmental Data', () => {
        it('should set environmental data', () => {
            const envData: EnvironmentalData = {
                temperature: 25.5,
                humidity: 60.0,
                pressure: 1013.25,
                timestamp: 1718451600,
                sensor_status: 1,
                measurement_interval: 60,
                data_quality: 100
            };
            useAppStore.getState().setEnvData(envData);

            const env = useAppStore.getState().envData;
            expect(env?.temperature).toBe(25.5);
            expect(env?.humidity).toBe(60.0);
        });
    });

    describe('Rain Data', () => {
        it('should set rain data', () => {
            const rainData: RainData = {
                current_hour_mm: 0.5,
                today_total_mm: 12.3,
                last_24h_mm: 25.0,
                current_rate_mm_h: 1.0,
                last_pulse_time: 1718451000,
                total_pulses: 500,
                sensor_status: 1,
                data_quality: 0
            };
            useAppStore.getState().setRainData(rainData);

            const rain = useAppStore.getState().rainData;
            expect(rain?.today_total_mm).toBe(12.3);
            expect(rain?.sensor_status).toBe(1);
        });
    });

    describe('Flow Sensor Data', () => {
        it('should set flow sensor data', () => {
            const flowData: FlowSensorData = {
                flow_rate_or_pulses: 150
            };
            useAppStore.getState().setFlowSensor(flowData);

            expect(useAppStore.getState().flowSensorData?.flow_rate_or_pulses).toBe(150);
        });
    });

    describe('Task Queue Data', () => {
        it('should set task queue data', () => {
            const queueData: TaskQueueData = {
                pending_count: 3,
                completed_tasks: 5,
                current_channel: 1,
                current_task_type: 0,
                current_value: 15,
                command: 0,
                task_id_to_delete: 0,
                active_task_id: 2
            };
            useAppStore.getState().setTaskQueue(queueData);

            const queue = useAppStore.getState().taskQueue;
            expect(queue?.pending_count).toBe(3);
            expect(queue?.active_task_id).toBe(2);
        });
    });

    describe('Statistics Data', () => {
        it('should update channel statistics', () => {
            const stats: StatisticsData = {
                channel_id: 0,
                total_volume: 50000,
                last_volume: 2500,
                last_watering: 1718451600,
                count: 25
            };
            useAppStore.getState().updateStatistics(stats);

            const channelStats = useAppStore.getState().statistics.get(0);
            expect(channelStats?.total_volume).toBe(50000);
            expect(channelStats?.count).toBe(25);
        });

        it('should update multiple channel statistics independently', () => {
            const stats0: StatisticsData = {
                channel_id: 0,
                total_volume: 10000,
                last_volume: 1000,
                last_watering: 1718451600,
                count: 10
            };
            const stats1: StatisticsData = {
                channel_id: 1,
                total_volume: 20000,
                last_volume: 2000,
                last_watering: 1718451700,
                count: 20
            };

            useAppStore.getState().updateStatistics(stats0);
            useAppStore.getState().updateStatistics(stats1);

            expect(useAppStore.getState().statistics.get(0)?.total_volume).toBe(10000);
            expect(useAppStore.getState().statistics.get(1)?.total_volume).toBe(20000);
        });
    });

    describe('Alarm Status', () => {
        it('should set alarm status', () => {
            const alarm: AlarmData = {
                alarm_code: AlarmCode.FLOW_SENSOR_FAULT,
                alarm_data: 1,
                timestamp: 1718451600
            };
            useAppStore.getState().setAlarmStatus(alarm);

            const alarmState = useAppStore.getState().alarmStatus;
            expect(alarmState?.alarm_code).toBe(AlarmCode.FLOW_SENSOR_FAULT);
        });

        it('should clear alarm when alarm_code is NONE', () => {
            // First set an alarm
            useAppStore.getState().setAlarmStatus({
                alarm_code: AlarmCode.LOW_BATTERY,
                alarm_data: 0,
                timestamp: 1718451600
            });

            // Then clear it
            useAppStore.getState().setAlarmStatus({
                alarm_code: AlarmCode.NONE,
                alarm_data: 0,
                timestamp: 1718451700
            });

            expect(useAppStore.getState().alarmStatus?.alarm_code).toBe(AlarmCode.NONE);
        });
    });

    describe('Diagnostics Data', () => {
        it('should set diagnostics data', () => {
            const diag: DiagnosticsData = {
                uptime: 14400, // 10 days in minutes
                error_count: 2,
                last_error: 3,
                valve_status: 0b00000101, // valves 0 and 2 active
                battery_level: 85
            };
            useAppStore.getState().setDiagnostics(diag);

            const diagnostics = useAppStore.getState().diagnosticsData;
            expect(diagnostics?.uptime).toBe(14400);
            expect(diagnostics?.valve_status).toBe(5);
        });
    });

    describe('System Configuration', () => {
        it('should set system config', () => {
            const config: Partial<SystemConfigData> = {
                version: 2,
                power_mode: 0,
                flow_calibration: 1000,
                num_channels: 8
            };
            useAppStore.getState().setSystemConfig(config as SystemConfigData);

            expect(useAppStore.getState().systemConfig?.version).toBe(2);
        });
    });

    describe('Rain Configuration', () => {
        it('should set rain config', () => {
            const config: RainConfigData = {
                mm_per_pulse: 0.25,
                debounce_ms: 50,
                sensor_enabled: true,
                integration_enabled: true,
                rain_sensitivity_pct: 80,
                skip_threshold_mm: 5.0
            };
            useAppStore.getState().setRainConfig(config);

            expect(useAppStore.getState().rainConfig?.mm_per_pulse).toBe(0.25);
            expect(useAppStore.getState().rainConfig?.sensor_enabled).toBe(true);
        });
    });

    describe('Timezone Configuration', () => {
        it('should set timezone config', () => {
            const config: TimezoneConfigData = {
                utc_offset_minutes: 120,
                dst_enabled: true,
                dst_start_month: 3,
                dst_start_week: 5,
                dst_start_dow: 0,
                dst_end_month: 10,
                dst_end_week: 5,
                dst_end_dow: 0,
                dst_offset_minutes: 60
            };
            useAppStore.getState().setTimezoneConfig(config);

            expect(useAppStore.getState().timezoneConfig?.utc_offset_minutes).toBe(120);
            expect(useAppStore.getState().timezoneConfig?.dst_enabled).toBe(true);
        });
    });

    describe('Rain Integration Status', () => {
        it('should set rain integration status', () => {
            const status: Partial<RainIntegrationStatusData> = {
                sensor_active: true,
                integration_enabled: true,
                rainfall_last_hour: 0.5,
                rainfall_last_24h: 12.0
            };
            useAppStore.getState().setRainIntegration(status as RainIntegrationStatusData);

            expect(useAppStore.getState().rainIntegration?.sensor_active).toBe(true);
        });
    });

    describe('Compensation Status', () => {
        it('should update compensation status per channel', () => {
            const status: CompensationStatusData = {
                channel_id: 0,
                rain: {
                    active: true,
                    recent_rainfall_mm: 5.0,
                    reduction_percentage: 20,
                    skip_watering: false,
                    calculation_time: 1718451600
                },
                temperature: {
                    active: true,
                    current_temperature: 28.0,
                    factor: 1.1,
                    adjusted_requirement: 110,
                    calculation_time: 1718451600
                },
                any_compensation_active: true
            };
            useAppStore.getState().updateCompensation(status);

            const comp = useAppStore.getState().compensationStatus.get(0);
            expect(comp?.rain.active).toBe(true);
            expect(comp?.rain.reduction_percentage).toBe(20);
        });
    });

    describe('AutoCalc Status', () => {
        it('should update auto-calc status per channel', () => {
            const status: Partial<AutoCalcStatusData> = {
                channel_id: 1,
                calculation_active: true,
                irrigation_needed: true,
                current_deficit_mm: 2.5,
                et0_mm_day: 4.5
            };
            useAppStore.getState().updateAutoCalc(status as AutoCalcStatusData);

            const calc = useAppStore.getState().autoCalcStatus.get(1);
            expect(calc?.calculation_active).toBe(true);
            expect(calc?.current_deficit_mm).toBe(2.5);
        });
    });

    describe('Growing Environment', () => {
        it('should update growing env per channel', () => {
            const env: Partial<GrowingEnvData> = {
                channel_id: 2,
                plant_db_index: 15,
                soil_db_index: 3,
                auto_mode: 1,
                sun_exposure_pct: 80
            };
            useAppStore.getState().updateGrowingEnv(env as GrowingEnvData);

            const growing = useAppStore.getState().growingEnv.get(2);
            expect(growing?.plant_db_index).toBe(15);
            expect(growing?.sun_exposure_pct).toBe(80);
        });
    });

    describe('Schedule Configuration', () => {
        it('should update schedule per channel', () => {
            const schedule: ScheduleConfigData = {
                channel_id: 0,
                schedule_type: 2,
                days_mask: 0b01010101,
                hour: 6,
                minute: 30,
                watering_mode: 0,
                value: 15,
                auto_enabled: true,
                use_solar_timing: false,
                solar_event: 0,
                solar_offset_minutes: 0
            };
            useAppStore.getState().updateSchedule(schedule);

            const sched = useAppStore.getState().schedules.get(0);
            expect(sched?.hour).toBe(6);
            expect(sched?.auto_enabled).toBe(true);
        });
    });

    describe('Channel Compensation Config', () => {
        it('should update channel compensation config', () => {
            const config: Partial<ChannelCompensationConfigData> = {
                channel_id: 3,
                rain: {
                    enabled: true,
                    sensitivity: 0.8,
                    lookback_hours: 24,
                    skip_threshold_mm: 10,
                    reduction_factor: 0.5
                },
                temp: {
                    enabled: true,
                    base_temperature: 20,
                    sensitivity: 1.0,
                    min_factor: 0.8,
                    max_factor: 1.5
                }
            };
            useAppStore.getState().updateChannelCompensationConfig(config as ChannelCompensationConfigData);

            const cc = useAppStore.getState().channelCompensationConfig.get(3);
            expect(cc?.rain.enabled).toBe(true);
            expect(cc?.temp.base_temperature).toBe(20);
        });
    });

    describe('History Data', () => {
        it('should set watering history', () => {
            const history: HistoryDetailedEntry[] = [
                {
                    timestamp: 1718451600,
                    channel_id: 0,
                    event_type: 1,
                    mode: 0,
                    target_value_ml: 2000,
                    actual_value_ml: 1980,
                    total_volume_ml: 1980,
                    trigger_type: 1,
                    success_status: 1,
                    error_code: 0,
                    flow_rate_avg: 100
                }
            ];
            useAppStore.getState().setWateringHistory(history);

            const wh = useAppStore.getState().wateringHistory;
            expect(wh).toHaveLength(1);
            expect(wh[0].channel_id).toBe(0);
        });

        it('should append to watering history', () => {
            const initial: HistoryDetailedEntry[] = [
                {
                    timestamp: 1718451600,
                    channel_id: 0,
                    event_type: 1,
                    mode: 0,
                    target_value_ml: 2000,
                    actual_value_ml: 1980,
                    total_volume_ml: 1980,
                    trigger_type: 1,
                    success_status: 1,
                    error_code: 0,
                    flow_rate_avg: 100
                }
            ];
            useAppStore.getState().setWateringHistory(initial);

            const additional: HistoryDetailedEntry[] = [
                {
                    timestamp: 1718455200,
                    channel_id: 1,
                    event_type: 1,
                    mode: 1,
                    target_value_ml: 3000,
                    actual_value_ml: 2950,
                    total_volume_ml: 2950,
                    trigger_type: 0,
                    success_status: 1,
                    error_code: 0,
                    flow_rate_avg: 120
                }
            ];
            useAppStore.getState().appendWateringHistory(additional);

            expect(useAppStore.getState().wateringHistory).toHaveLength(2);
        });

        it('should set rain history hourly', () => {
            const rainHourly: RainHourlyEntry[] = [
                { hour_epoch: 1718448000, rainfall_mm_x100: 50, pulse_count: 10, data_quality: 0 },
                { hour_epoch: 1718451600, rainfall_mm_x100: 120, pulse_count: 24, data_quality: 0 }
            ];
            useAppStore.getState().setRainHistoryHourly(rainHourly);

            expect(useAppStore.getState().rainHistoryHourly).toHaveLength(2);
            expect(useAppStore.getState().rainHistoryHourly[0].rainfall_mm_x100).toBe(50);
        });

        it('should set rain history daily', () => {
            const rainDaily: RainDailyEntry[] = [
                { day_epoch: 1718409600, total_rainfall_mm_x100: 500, max_hourly_mm_x100: 120, active_hours: 5, data_completeness: 100 }
            ];
            useAppStore.getState().setRainHistoryDaily(rainDaily);

            expect(useAppStore.getState().rainHistoryDaily).toHaveLength(1);
        });

        it('should set env history detailed', () => {
            const envHistory: EnvDetailedEntry[] = [
                {
                    timestamp: 1718451600,
                    temperature_c_x100: 2250,
                    humidity_pct_x100: 6500,
                    pressure_pa: 101500
                }
            ];
            useAppStore.getState().setEnvHistoryDetailed(envHistory);

            expect(useAppStore.getState().envHistoryDetailed).toHaveLength(1);
            expect(useAppStore.getState().envHistoryDetailed[0].temperature_c_x100).toBe(2250);
        });

        it('should set env history hourly', () => {
            const envHourly: EnvHourlyEntry[] = [
                {
                    timestamp: 1718448000,
                    temp_avg_x100: 2200,
                    temp_min_x100: 2000,
                    temp_max_x100: 2400,
                    humidity_avg_x100: 6000,
                    pressure_avg_pa: 101300
                }
            ];
            useAppStore.getState().setEnvHistoryHourly(envHourly);

            expect(useAppStore.getState().envHistoryHourly).toHaveLength(1);
        });

        it('should set env history daily', () => {
            const envDaily: EnvDailyEntry[] = [
                {
                    date_code: 20241202,
                    temp_avg_x100: 2150,
                    temp_min_x100: 1800,
                    temp_max_x100: 2500,
                    humidity_avg_x100: 5500,
                    humidity_min_x100: 4000,
                    humidity_max_x100: 7000,
                    pressure_avg_pa: 101400,
                    sample_count: 96
                }
            ];
            useAppStore.getState().setEnvHistoryDaily(envDaily);

            expect(useAppStore.getState().envHistoryDaily).toHaveLength(1);
        });

        it('should clear all history cache', () => {
            // Set some history data
            useAppStore.getState().setWateringHistory([{
                timestamp: 1718451600, channel_id: 0, event_type: 1, mode: 0,
                target_value_ml: 1000, actual_value_ml: 1000, total_volume_ml: 1000,
                trigger_type: 0, success_status: 1, error_code: 0, flow_rate_avg: 100
            }]);
            useAppStore.getState().setRainHistoryHourly([{
                hour_epoch: 1718448000, rainfall_mm_x100: 50, pulse_count: 10, data_quality: 0
            }]);

            // Clear all
            useAppStore.getState().clearHistoryCache();

            expect(useAppStore.getState().wateringHistory).toEqual([]);
            expect(useAppStore.getState().rainHistoryHourly).toEqual([]);
            expect(useAppStore.getState().rainHistoryDaily).toEqual([]);
            expect(useAppStore.getState().envHistoryDetailed).toEqual([]);
            expect(useAppStore.getState().envHistoryHourly).toEqual([]);
            expect(useAppStore.getState().envHistoryDaily).toEqual([]);
        });
    });

    describe('System Status', () => {
        it('should update system status', () => {
            useAppStore.getState().updateSystemStatus({ state: SystemStatus.NO_FLOW });
            expect(useAppStore.getState().systemStatus.state).toBe(SystemStatus.NO_FLOW);
        });

        it('should partially update system status', () => {
            useAppStore.getState().updateSystemStatus({ batteryVoltage: 3.7 });
            expect(useAppStore.getState().systemStatus.batteryVoltage).toBe(3.7);
            expect(useAppStore.getState().systemStatus.state).toBe(SystemStatus.OK); // Should retain default
        });
    });

    describe('Database', () => {
        it('should set database entries', () => {
            const plants = [{ id: 1, name: 'Tomato', kc: [0.6, 0.8, 1.0, 0.9] }];
            const soils = [{ id: 1, name: 'Clay', waterRetention: 0.4 }];
            const irrigation = [{ id: 1, name: 'Drip', efficiency: 0.9 }];

            useAppStore.getState().setDatabase(plants as any, soils as any, irrigation as any);

            expect(useAppStore.getState().plantDb).toHaveLength(1);
            expect(useAppStore.getState().soilDb).toHaveLength(1);
            expect(useAppStore.getState().irrigationMethodDb).toHaveLength(1);
        });
    });

    describe('Legacy Wizard State', () => {
        it('should open wizard', () => {
            useAppStore.getState().openWizard(2);
            expect(useAppStore.getState().wizardState.isOpen).toBe(true);
            expect(useAppStore.getState().wizardState.phase).toBe(2);
        });

        it('should close wizard', () => {
            useAppStore.getState().openWizard();
            useAppStore.getState().closeWizard();
            expect(useAppStore.getState().wizardState.isOpen).toBe(false);
        });

        it('should mark zone as configured', () => {
            useAppStore.getState().markZoneConfigured(2);
            expect(useAppStore.getState().wizardState.completedZones).toContain(2);
        });

        it('should not duplicate completed zones', () => {
            useAppStore.getState().markZoneConfigured(2);
            useAppStore.getState().markZoneConfigured(2);
            expect(useAppStore.getState().wizardState.completedZones.filter(z => z === 2)).toHaveLength(1);
        });

        it('should set wizard state', () => {
            useAppStore.getState().setWizardState({ phase: 3, currentZone: 5 });
            expect(useAppStore.getState().wizardState.phase).toBe(3);
            expect(useAppStore.getState().wizardState.currentZone).toBe(5);
        });
    });

    describe('Onboarding State', () => {
        it('should set onboarding state', () => {
            const onboarding: OnboardingStatusData = {
                overall_completion_pct: 50,
                channels_completion_pct: 60,
                system_completion_pct: 80,
                schedules_completion_pct: 20,
                channel_config_flags: BigInt(0xFF),
                system_config_flags: 0b00001111,
                schedule_config_flags: 0b00000011,
                onboarding_start_time: 1718400000,
                last_update_time: 1718451600,
                channel_extended_flags: BigInt(0)
            };
            useAppStore.getState().setOnboardingState(onboarding);

            const state = useAppStore.getState().onboardingState;
            expect(state?.overall_completion_pct).toBe(50);
            expect(state?.system_completion_pct).toBe(80);
        });
    });

    describe('Reset Store', () => {
        it('should reset all data to initial state', () => {
            // Set some data
            useAppStore.getState().setConnectionState('connected');
            useAppStore.getState().setConnectedDeviceId('device-123');
            useAppStore.getState().setEnvData({
                temperature: 25,
                humidity: 50,
                pressure: 1013,
                timestamp: 1718451600,
                sensor_status: 1,
                measurement_interval: 60,
                data_quality: 100
            });
            useAppStore.getState().updateStatistics({
                channel_id: 0,
                total_volume: 10000,
                last_volume: 500,
                last_watering: 1718451600,
                count: 5
            });

            // Reset
            useAppStore.getState().resetStore();

            // Verify reset
            const state = useAppStore.getState();
            expect(state.connectionState).toBe('disconnected');
            expect(state.connectedDeviceId).toBeNull();
            expect(state.envData).toBeNull();
            expect(state.zones).toEqual([]);
            expect(state.statistics.size).toBe(0);
            expect(state.wateringHistory).toEqual([]);
        });

        it('should reset channel wizard state', () => {
            useAppStore.getState().initChannelWizard(8);
            expect(useAppStore.getState().channelWizard.isOpen).toBe(true);

            useAppStore.getState().resetStore();
            expect(useAppStore.getState().channelWizard.isOpen).toBe(false);
        });
    });

    describe('Channel Wizard Actions', () => {
        beforeEach(() => {
            useAppStore.getState().resetStore();
        });

        it('should initialize channel wizard with default 8 channels', () => {
            useAppStore.getState().initChannelWizard();
            const cw = useAppStore.getState().channelWizard;
            
            expect(cw.isOpen).toBe(true);
            expect(cw.zones).toHaveLength(8);
            expect(cw.currentZoneIndex).toBe(0);
            expect(cw.currentStep).toBe('mode');
            expect(cw.phase).toBe('zones');
        });

        it('should initialize channel wizard with custom number of channels', () => {
            useAppStore.getState().initChannelWizard(4);
            const cw = useAppStore.getState().channelWizard;
            
            expect(cw.zones).toHaveLength(4);
            cw.zones.forEach((zone, idx) => {
                expect(zone.channelId).toBe(idx);
                expect(zone.enabled).toBe(false);
                expect(zone.skipped).toBe(false);
            });
        });

        it('should update current zone config', () => {
            useAppStore.getState().initChannelWizard(4);
            useAppStore.getState().updateCurrentZoneConfig({ 
                wateringMode: 'fao56_auto',
                name: 'Garden' 
            });
            
            const zone = useAppStore.getState().channelWizard.zones[0];
            expect(zone.wateringMode).toBe('fao56_auto');
            expect(zone.name).toBe('Garden');
        });

        it('should set wizard step', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().setWizardStep('soil');
            
            expect(useAppStore.getState().channelWizard.currentStep).toBe('soil');
        });

        it('should navigate to next wizard step for FAO56 mode', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'fao56_auto' });
            
            // FAO56 mode: mode -> plant -> location -> soil -> irrigation -> environment -> schedule -> summary
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('plant');
            
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('location');
        });

        it('should navigate to previous wizard step for FAO56 mode', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'fao56_auto' });
            useAppStore.getState().setWizardStep('soil');
            
            useAppStore.getState().prevWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('location');
            
            useAppStore.getState().prevWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('plant');
        });

        it('should skip current zone and move to next', () => {
            useAppStore.getState().initChannelWizard(4);
            
            useAppStore.getState().skipCurrentZone();
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.zones[0].skipped).toBe(true);
            expect(cw.zones[0].enabled).toBe(false);
            expect(cw.currentZoneIndex).toBe(1);
            expect(cw.currentStep).toBe('mode');
        });

        it('should go to final summary when skipping last zone', () => {
            useAppStore.getState().initChannelWizard(2);
            useAppStore.getState().skipCurrentZone(); // Skip zone 0
            useAppStore.getState().skipCurrentZone(); // Skip zone 1 (last)
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.phase).toBe('final_summary');
        });

        it('should skip all remaining zones', () => {
            useAppStore.getState().initChannelWizard(4);
            useAppStore.getState().skipCurrentZone(); // Skip zone 0
            
            useAppStore.getState().skipAllRemainingZones(); // Skip zones 1, 2, 3
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.zones[1].skipped).toBe(true);
            expect(cw.zones[2].skipped).toBe(true);
            expect(cw.zones[3].skipped).toBe(true);
            expect(cw.skipAllRemaining).toBe(true);
            expect(cw.phase).toBe('final_summary');
        });

        it('should save and move to next zone', () => {
            useAppStore.getState().initChannelWizard(4);
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'duration', name: 'Zone 1' });
            
            useAppStore.getState().saveAndNextZone();
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.zones[0].enabled).toBe(true);
            expect(cw.currentZoneIndex).toBe(1);
            expect(cw.currentStep).toBe('mode');
        });

        it('should go to final summary when saving last zone', () => {
            useAppStore.getState().initChannelWizard(2);
            useAppStore.getState().saveAndNextZone(); // Save zone 0
            useAppStore.getState().saveAndNextZone(); // Save zone 1 (last)
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.phase).toBe('final_summary');
        });

        it('should set shared location', () => {
            useAppStore.getState().initChannelWizard();
            const location = { latitude: 44.4268, longitude: 26.1025, source: 'gps' as const };
            
            useAppStore.getState().setSharedLocation(location);
            
            expect(useAppStore.getState().channelWizard.sharedLocation).toEqual(location);
        });

        it('should go to final summary phase', () => {
            useAppStore.getState().initChannelWizard();
            
            useAppStore.getState().goToFinalSummary();
            
            expect(useAppStore.getState().channelWizard.phase).toBe('final_summary');
        });

        it('should finish channel wizard', () => {
            useAppStore.getState().initChannelWizard();
            
            useAppStore.getState().finishChannelWizard();
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.phase).toBe('complete');
            expect(cw.isOpen).toBe(false);
        });

        it('should close channel wizard and reset state', () => {
            useAppStore.getState().initChannelWizard(4);
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'fao56_auto' });
            useAppStore.getState().skipCurrentZone();
            
            useAppStore.getState().closeChannelWizard();
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.isOpen).toBe(false);
            expect(cw.phase).toBe('zones');
            expect(cw.currentZoneIndex).toBe(0);
        });

        it('should set tiles progress', () => {
            useAppStore.getState().initChannelWizard();
            
            useAppStore.getState().setTilesProgress(true, 50);
            
            const cw = useAppStore.getState().channelWizard;
            expect(cw.tilesDownloading).toBe(true);
            expect(cw.tilesProgress).toBe(50);
        });

        it('should handle FAO56 eco mode navigation', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'fao56_eco' });
            
            // FAO56 mode: mode -> plant -> location -> soil -> irrigation -> environment -> schedule -> summary
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('plant');
            
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('location');
        });

        it('should handle manual duration mode navigation', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'duration' });
            
            // Manual mode: mode -> schedule -> summary
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('schedule');
        });

        it('should handle manual volume mode navigation', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'volume' });
            
            // Manual mode: mode -> schedule -> summary
            useAppStore.getState().nextWizardStep();
            expect(useAppStore.getState().channelWizard.currentStep).toBe('schedule');
        });

        it('should not change step when at end of wizard', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'duration' });
            useAppStore.getState().setWizardStep('summary');
            
            useAppStore.getState().nextWizardStep();
            
            // Should stay at summary since there's no next step
            expect(useAppStore.getState().channelWizard.currentStep).toBe('summary');
        });

        it('should not change step when at start of wizard', () => {
            useAppStore.getState().initChannelWizard();
            useAppStore.getState().updateCurrentZoneConfig({ wateringMode: 'duration' });
            // Already at 'mode' which is first step
            
            useAppStore.getState().prevWizardStep();
            
            // Should stay at mode since there's no previous step
            expect(useAppStore.getState().channelWizard.currentStep).toBe('mode');
        });

        it('should open wizard with specific phase', () => {
            useAppStore.getState().openWizard(2);
            
            expect(useAppStore.getState().wizardState.isOpen).toBe(true);
            expect(useAppStore.getState().wizardState.phase).toBe(2);
        });

        it('should close wizard', () => {
            useAppStore.getState().openWizard(1);
            useAppStore.getState().closeWizard();
            
            expect(useAppStore.getState().wizardState.isOpen).toBe(false);
        });

        it('should check isZoneConfigured', () => {
            // isZoneConfigured always returns false in current implementation
            const result = useAppStore.getState().isZoneConfigured(0);
            expect(result).toBe(false);
        });
    });
});
