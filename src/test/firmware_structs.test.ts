import { describe, it, expect } from 'vitest';
import {
    SystemStatus,
    TaskStatus,
    ScheduleType,
    WateringMode,
    AutoMode,
    PhenologicalStage,
    SensorStatus,
    DataQuality,
    AlarmCode,
    CalibrationAction,
    ResetOpcode,
    ResetStatus,
    FactoryWipeStep,
    CalibrationState,
    TaskQueueCommand,
    HistoryCommand,
    RainHistoryCommand,
    EnvHistoryCommand,
    UNIFIED_HEADER_SIZE,
    WRITE_HEADER_SIZE,
    MAX_CHUNK_SIZE,
    RAIN_HISTORY_FRAGMENT_SIZE,
    ENV_HISTORY_FRAGMENT_SIZE,
    RAIN_HISTORY_MAX_FRAGMENTS,
    CHANNEL_FLAG,
    SYSTEM_FLAG,
    CHANNEL_EXT_FLAG,
    hasChannelFlag,
    hasSystemFlag,
    hasSchedule,
    hasChannelExtFlag,
    isChannelFao56Ready,
    isChannelConfigComplete,
    isChannelFao56Complete,
    isChannelBasicComplete,
    hasAnyConfiguredChannel,
    isInitialSetupComplete
} from '../types/firmware_structs';

describe('firmware_structs - Enums', () => {
    describe('SystemStatus', () => {
        it('should have correct values', () => {
            expect(SystemStatus.OK).toBe(0);
            expect(SystemStatus.NO_FLOW).toBe(1);
            expect(SystemStatus.UNEXPECTED_FLOW).toBe(2);
            expect(SystemStatus.FAULT).toBe(3);
            expect(SystemStatus.RTC_ERROR).toBe(4);
            expect(SystemStatus.LOW_POWER).toBe(5);
        });
    });

    describe('TaskStatus', () => {
        it('should have correct values', () => {
            expect(TaskStatus.IDLE).toBe(0);
            expect(TaskStatus.RUNNING).toBe(1);
            expect(TaskStatus.PAUSED).toBe(2);
            expect(TaskStatus.COMPLETED).toBe(3);
        });
    });

    describe('ScheduleType', () => {
        it('should have correct values', () => {
            expect(ScheduleType.DAILY).toBe(0x00);
            expect(ScheduleType.PERIODIC).toBe(0x01);
            expect(ScheduleType.AUTO).toBe(0x02);
        });
    });

    describe('WateringMode', () => {
        it('should have correct values', () => {
            expect(WateringMode.DURATION_MINUTES).toBe(0x00);
            expect(WateringMode.VOLUME_LITERS).toBe(0x01);
        });
    });

    describe('AutoMode', () => {
        it('should have correct values', () => {
            expect(AutoMode.DISABLED).toBe(0x00);
            expect(AutoMode.FAO56_AREA).toBe(0x01);
            expect(AutoMode.FAO56_PLANT_COUNT).toBe(0x02);
            expect(AutoMode.LEGACY_INTERVAL).toBe(0x03);
            expect(AutoMode.SMART_SOIL).toBe(0x04);
        });
    });

    describe('PhenologicalStage', () => {
        it('should have correct values', () => {
            expect(PhenologicalStage.INITIAL).toBe(0);
            expect(PhenologicalStage.DEVELOPMENT).toBe(1);
            expect(PhenologicalStage.MID_SEASON).toBe(2);
            expect(PhenologicalStage.LATE_SEASON).toBe(3);
        });
    });

    describe('SensorStatus', () => {
        it('should have correct values', () => {
            expect(SensorStatus.OK).toBe(0x00);
            expect(SensorStatus.OFFLINE).toBe(0x01);
            expect(SensorStatus.ERROR).toBe(0x02);
            expect(SensorStatus.CALIBRATING).toBe(0x03);
            expect(SensorStatus.INITIALIZING).toBe(0x04);
        });
    });

    describe('DataQuality', () => {
        it('should have correct values', () => {
            expect(DataQuality.GOOD).toBe(0x00);
            expect(DataQuality.DEGRADED).toBe(0x01);
            expect(DataQuality.STALE).toBe(0x02);
            expect(DataQuality.INVALID).toBe(0x03);
        });
    });

    describe('AlarmCode', () => {
        it('should have correct values for all alarm types', () => {
            expect(AlarmCode.NONE).toBe(0x00);
            expect(AlarmCode.NO_FLOW).toBe(0x01);
            expect(AlarmCode.UNEXPECTED_FLOW).toBe(0x02);
            expect(AlarmCode.FREEZE_LOCKOUT).toBe(0x03);
            expect(AlarmCode.HIGH_FLOW).toBe(0x04);
            expect(AlarmCode.LOW_FLOW).toBe(0x05);
            expect(AlarmCode.MAINLINE_LEAK).toBe(0x06);
            expect(AlarmCode.CHANNEL_LOCK).toBe(0x07);
            expect(AlarmCode.GLOBAL_LOCK).toBe(0x08);
        });
    });

    describe('CalibrationAction', () => {
        it('should have correct values', () => {
            expect(CalibrationAction.STOP).toBe(0x00);
            expect(CalibrationAction.START).toBe(0x01);
            expect(CalibrationAction.IN_PROGRESS).toBe(0x02);
            expect(CalibrationAction.CALCULATED).toBe(0x03);
            expect(CalibrationAction.APPLY).toBe(0x04);
            expect(CalibrationAction.RESET).toBe(0x05);
        });
    });

    describe('ResetOpcode', () => {
        it('should have correct values for channel resets', () => {
            expect(ResetOpcode.RESET_CHANNEL_CONFIG).toBe(0x01);
            expect(ResetOpcode.RESET_CHANNEL_SCHEDULES).toBe(0x02);
        });

        it('should have correct values for global resets', () => {
            expect(ResetOpcode.RESET_ALL_CHANNEL_CONFIGS).toBe(0x10);
            expect(ResetOpcode.RESET_ALL_SCHEDULES).toBe(0x11);
            expect(ResetOpcode.RESET_SYSTEM_CONFIG).toBe(0x12);
            expect(ResetOpcode.RESET_HISTORY).toBe(0x14);
            expect(ResetOpcode.FACTORY_RESET).toBe(0xFF);
        });
    });

    describe('ResetStatus', () => {
        it('should have correct values', () => {
            expect(ResetStatus.IDLE).toBe(0x00);
            expect(ResetStatus.AWAIT_CONFIRM).toBe(0x01);
            expect(ResetStatus.IN_PROGRESS).toBe(0x02);
            expect(ResetStatus.DONE_OK).toBe(0x03);
            expect(ResetStatus.DONE_ERROR).toBe(0x04);
            // Backwards compatibility aliases
            expect(ResetStatus.PENDING).toBe(0x01);
            expect(ResetStatus.LEGACY_IDLE).toBe(0xFF);
        });
    });

    describe('CalibrationState', () => {
        it('should have correct values', () => {
            expect(CalibrationState.IDLE).toBe(0);
            expect(CalibrationState.IN_PROGRESS).toBe(1);
            expect(CalibrationState.COMPLETED).toBe(2);
            expect(CalibrationState.FAILED).toBe(3);
            expect(CalibrationState.CANCELLED).toBe(4);
        });
    });

    describe('TaskQueueCommand', () => {
        it('should have correct values', () => {
            expect(TaskQueueCommand.NONE).toBe(0x00);
            expect(TaskQueueCommand.START_NEXT).toBe(0x01);
            expect(TaskQueueCommand.PAUSE).toBe(0x02);
            expect(TaskQueueCommand.RESUME).toBe(0x03);
            expect(TaskQueueCommand.CANCEL).toBe(0x04);
            expect(TaskQueueCommand.CLEAR_ALL).toBe(0x05);
        });
    });

    describe('HistoryCommand', () => {
        it('should have correct values', () => {
            expect(HistoryCommand.QUERY_COUNT).toBe(0x01);
            expect(HistoryCommand.QUERY_RANGE).toBe(0x02);
            expect(HistoryCommand.EXPORT_RANGE).toBe(0x03);
            expect(HistoryCommand.CLEAR_ALL).toBe(0x04);
            expect(HistoryCommand.CLEAR_CHANNEL).toBe(0x05);
        });
    });

    describe('RainHistoryCommand', () => {
        it('should have correct values', () => {
            expect(RainHistoryCommand.GET_HOURLY).toBe(0x01);
            expect(RainHistoryCommand.GET_DAILY).toBe(0x02);
            expect(RainHistoryCommand.GET_RECENT).toBe(0x03);
            expect(RainHistoryCommand.RESET_DATA).toBe(0x10);
            expect(RainHistoryCommand.CALIBRATE).toBe(0x20);
        });
    });

    describe('EnvHistoryCommand', () => {
        it('should have correct values', () => {
            expect(EnvHistoryCommand.GET_DETAILED).toBe(0x01);
            expect(EnvHistoryCommand.GET_HOURLY).toBe(0x02);
            expect(EnvHistoryCommand.GET_DAILY).toBe(0x03);
            expect(EnvHistoryCommand.GET_TRENDS).toBe(0x04);
            expect(EnvHistoryCommand.CLEAR_HISTORY).toBe(0x05);
        });
    });
});

describe('firmware_structs - Constants', () => {
    it('should have correct header sizes', () => {
        expect(UNIFIED_HEADER_SIZE).toBe(8);
        expect(WRITE_HEADER_SIZE).toBe(4);
    });

    it('should have correct chunk and fragment sizes', () => {
        expect(MAX_CHUNK_SIZE).toBe(20);
        expect(RAIN_HISTORY_FRAGMENT_SIZE).toBe(232);
        expect(ENV_HISTORY_FRAGMENT_SIZE).toBe(232);
        expect(RAIN_HISTORY_MAX_FRAGMENTS).toBe(255);
    });

    describe('CHANNEL_FLAG constants', () => {
        it('should have correct bit positions', () => {
            expect(CHANNEL_FLAG.PLANT_TYPE).toBe(0);
            expect(CHANNEL_FLAG.SOIL_TYPE).toBe(1);
            expect(CHANNEL_FLAG.IRRIGATION_METHOD).toBe(2);
            expect(CHANNEL_FLAG.COVERAGE).toBe(3);
            expect(CHANNEL_FLAG.SUN_EXPOSURE).toBe(4);
            expect(CHANNEL_FLAG.NAME).toBe(5);
            expect(CHANNEL_FLAG.WATER_FACTOR).toBe(6);
            expect(CHANNEL_FLAG.ENABLED).toBe(7);
        });
    });

    describe('SYSTEM_FLAG constants', () => {
        it('should have correct bit positions', () => {
            expect(SYSTEM_FLAG.TIMEZONE).toBe(0);
            expect(SYSTEM_FLAG.FLOW_CALIBRATION).toBe(1);
            expect(SYSTEM_FLAG.MASTER_VALVE).toBe(2);
            expect(SYSTEM_FLAG.RTC).toBe(3);
            expect(SYSTEM_FLAG.RAIN_SENSOR).toBe(4);
            expect(SYSTEM_FLAG.POWER_MODE).toBe(5);
            expect(SYSTEM_FLAG.LOCATION).toBe(6);
            expect(SYSTEM_FLAG.INITIAL_SETUP).toBe(7);
        });
    });

    describe('CHANNEL_EXT_FLAG constants', () => {
        it('should have correct bit positions', () => {
            expect(CHANNEL_EXT_FLAG.FAO56_READY).toBe(0);
            expect(CHANNEL_EXT_FLAG.RAIN_COMP).toBe(1);
            expect(CHANNEL_EXT_FLAG.TEMP_COMP).toBe(2);
            expect(CHANNEL_EXT_FLAG.CONFIG_COMPLETE).toBe(3);
            expect(CHANNEL_EXT_FLAG.LATITUDE).toBe(4);
            expect(CHANNEL_EXT_FLAG.VOLUME_LIMIT).toBe(5);
            expect(CHANNEL_EXT_FLAG.PLANTING_DATE).toBe(6);
            expect(CHANNEL_EXT_FLAG.CYCLE_SOAK).toBe(7);
        });
    });
});

describe('firmware_structs - Helper Functions', () => {
    describe('hasChannelFlag', () => {
        it('should return true when flag is set for channel 0', () => {
            // Set PLANT_TYPE (bit 0) for channel 0
            const flags = BigInt(0b00000001);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.PLANT_TYPE)).toBe(true);
        });

        it('should return false when flag is not set', () => {
            const flags = BigInt(0);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.PLANT_TYPE)).toBe(false);
        });

        it('should check correct bit position for channel 1', () => {
            // Channel 1 starts at bit 8, set SOIL_TYPE (bit 1) -> bit 9
            const flags = BigInt(0b1000000000); // bit 9
            expect(hasChannelFlag(flags, 1, CHANNEL_FLAG.SOIL_TYPE)).toBe(true);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.SOIL_TYPE)).toBe(false);
        });

        it('should check correct bit position for channel 7', () => {
            // Channel 7 starts at bit 56, set ENABLED (bit 7) -> bit 63
            const flags = BigInt(1) << BigInt(63);
            expect(hasChannelFlag(flags, 7, CHANNEL_FLAG.ENABLED)).toBe(true);
        });

        it('should handle multiple flags for same channel', () => {
            // Channel 0: PLANT_TYPE (0) + SOIL_TYPE (1) + IRRIGATION_METHOD (2) = 0b111 = 7
            const flags = BigInt(0b00000111);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.PLANT_TYPE)).toBe(true);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.SOIL_TYPE)).toBe(true);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.IRRIGATION_METHOD)).toBe(true);
            expect(hasChannelFlag(flags, 0, CHANNEL_FLAG.COVERAGE)).toBe(false);
        });
    });

    describe('hasSystemFlag', () => {
        it('should return true when flag is set', () => {
            const flags = 0b00001001; // RTC (bit 3) + TIMEZONE (bit 0)
            expect(hasSystemFlag(flags, SYSTEM_FLAG.RTC)).toBe(true);
            expect(hasSystemFlag(flags, SYSTEM_FLAG.TIMEZONE)).toBe(true);
        });

        it('should return false when flag is not set', () => {
            const flags = 0;
            expect(hasSystemFlag(flags, SYSTEM_FLAG.RTC)).toBe(false);
        });

        it('should check all system flags correctly', () => {
            const allFlags = 0xFF; // All 8 bits set
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.TIMEZONE)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.FLOW_CALIBRATION)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.MASTER_VALVE)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.RTC)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.RAIN_SENSOR)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.POWER_MODE)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.LOCATION)).toBe(true);
            expect(hasSystemFlag(allFlags, SYSTEM_FLAG.INITIAL_SETUP)).toBe(true);
        });
    });

    describe('hasSchedule', () => {
        it('should return true when schedule is configured for channel', () => {
            const scheduleFlags = 0b00000101; // Channels 0 and 2
            expect(hasSchedule(scheduleFlags, 0)).toBe(true);
            expect(hasSchedule(scheduleFlags, 2)).toBe(true);
        });

        it('should return false when schedule is not configured', () => {
            const scheduleFlags = 0b00000101;
            expect(hasSchedule(scheduleFlags, 1)).toBe(false);
            expect(hasSchedule(scheduleFlags, 3)).toBe(false);
        });

        it('should handle all 8 channels', () => {
            const allSchedules = 0xFF;
            for (let ch = 0; ch < 8; ch++) {
                expect(hasSchedule(allSchedules, ch)).toBe(true);
            }
        });
    });

    describe('hasChannelExtFlag', () => {
        it('should check extended flags correctly', () => {
            // Channel 0 with FAO56_READY set
            const flags = BigInt(0b00000001);
            expect(hasChannelExtFlag(flags, 0, CHANNEL_EXT_FLAG.FAO56_READY)).toBe(true);
        });

        it('should check correct bit position for different channels', () => {
            // Channel 2, CONFIG_COMPLETE (bit 3) -> bit position = 2*8 + 3 = 19
            const flags = BigInt(1) << BigInt(19);
            expect(hasChannelExtFlag(flags, 2, CHANNEL_EXT_FLAG.CONFIG_COMPLETE)).toBe(true);
            expect(hasChannelExtFlag(flags, 0, CHANNEL_EXT_FLAG.CONFIG_COMPLETE)).toBe(false);
        });
    });

    describe('isChannelFao56Ready', () => {
        it('should return true when FAO56_READY is set', () => {
            const flags = BigInt(0b00000001); // Channel 0, FAO56_READY
            expect(isChannelFao56Ready(flags, 0)).toBe(true);
        });

        it('should return false when FAO56_READY is not set', () => {
            const flags = BigInt(0);
            expect(isChannelFao56Ready(flags, 0)).toBe(false);
        });
    });

    describe('isChannelConfigComplete', () => {
        it('should return true when CONFIG_COMPLETE is set', () => {
            // CONFIG_COMPLETE is bit 3 for channel 0
            const flags = BigInt(0b00001000);
            expect(isChannelConfigComplete(flags, 0)).toBe(true);
        });

        it('should check correct channel', () => {
            // Channel 1, CONFIG_COMPLETE = bit 8+3 = 11
            const flags = BigInt(1) << BigInt(11);
            expect(isChannelConfigComplete(flags, 1)).toBe(true);
            expect(isChannelConfigComplete(flags, 0)).toBe(false);
        });
    });

    describe('isChannelFao56Complete', () => {
        it('should return true when all FAO-56 fields are set', () => {
            // Need: PLANT_TYPE(0) + SOIL_TYPE(1) + IRRIGATION_METHOD(2) + COVERAGE(3) + SUN_EXPOSURE(4)
            // = 0b00011111 = 31
            const flags = BigInt(0b00011111);
            expect(isChannelFao56Complete(flags, 0)).toBe(true);
        });

        it('should return false when any FAO-56 field is missing', () => {
            // Missing SUN_EXPOSURE
            const flags = BigInt(0b00001111);
            expect(isChannelFao56Complete(flags, 0)).toBe(false);
        });

        it('should return false when most fields are missing', () => {
            const flags = BigInt(0b00000001); // Only PLANT_TYPE
            expect(isChannelFao56Complete(flags, 0)).toBe(false);
        });
    });

    describe('isChannelBasicComplete', () => {
        it('should return true when NAME and ENABLED are set', () => {
            // NAME(5) + ENABLED(7) = 0b10100000 = 160
            const flags = BigInt(0b10100000);
            expect(isChannelBasicComplete(flags, 0)).toBe(true);
        });

        it('should return false when NAME is missing', () => {
            const flags = BigInt(0b10000000); // Only ENABLED
            expect(isChannelBasicComplete(flags, 0)).toBe(false);
        });

        it('should return false when ENABLED is missing', () => {
            const flags = BigInt(0b00100000); // Only NAME
            expect(isChannelBasicComplete(flags, 0)).toBe(false);
        });
    });

    describe('hasAnyConfiguredChannel', () => {
        it('should return true when one channel has minimum config', () => {
            // Channel 0 with bits 0-3 set (plant + soil + irrigation + coverage)
            const flags = BigInt(0b00001111);
            expect(hasAnyConfiguredChannel(flags)).toBe(true);
        });

        it('should return false when no channel is configured', () => {
            const flags = BigInt(0);
            expect(hasAnyConfiguredChannel(flags)).toBe(false);
        });

        it('should return false with partial config', () => {
            // Only PLANT_TYPE and SOIL_TYPE (not enough)
            const flags = BigInt(0b00000011);
            expect(hasAnyConfiguredChannel(flags)).toBe(false);
        });

        it('should detect configured channel in any position', () => {
            // Channel 5 fully configured: bits 40-43 set
            const flags = BigInt(0b00001111) << BigInt(40);
            expect(hasAnyConfiguredChannel(flags)).toBe(true);
        });
    });

    describe('isInitialSetupComplete', () => {
        it('should return true when RTC, timezone, and a channel are configured', () => {
            const systemFlags = 0b00001001; // RTC (3) + TIMEZONE (0)
            const channelFlags = BigInt(0b00001111); // Channel 0 configured
            expect(isInitialSetupComplete(systemFlags, channelFlags)).toBe(true);
        });

        it('should return false when RTC is missing', () => {
            const systemFlags = 0b00000001; // Only TIMEZONE
            const channelFlags = BigInt(0b00001111);
            expect(isInitialSetupComplete(systemFlags, channelFlags)).toBe(false);
        });

        it('should return false when timezone is missing', () => {
            const systemFlags = 0b00001000; // Only RTC
            const channelFlags = BigInt(0b00001111);
            expect(isInitialSetupComplete(systemFlags, channelFlags)).toBe(false);
        });

        it('should return false when no channel is configured', () => {
            const systemFlags = 0b00001001; // RTC + TIMEZONE
            const channelFlags = BigInt(0);
            expect(isInitialSetupComplete(systemFlags, channelFlags)).toBe(false);
        });
    });
});

describe('firmware_structs - Type Guards', () => {
    describe('AlarmCode validation', () => {
        it('should recognize valid alarm codes', () => {
            const validCodes = [0, 1, 2, 3, 4, 5, 6, 7];
            validCodes.forEach(code => {
                expect(code in AlarmCode || Object.values(AlarmCode).includes(code)).toBe(true);
            });
        });
    });

    describe('TaskQueueCommand validation', () => {
        it('should recognize valid commands', () => {
            const validCommands = [0, 1, 2, 3, 4, 5];
            validCommands.forEach(cmd => {
                expect(Object.values(TaskQueueCommand).includes(cmd)).toBe(true);
            });
        });
    });
});
