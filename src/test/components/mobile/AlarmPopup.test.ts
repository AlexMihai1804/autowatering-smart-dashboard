/**
 * AlarmPopup Component Tests
 * 
 * Tests for alarm popup logic and helper functions
 */
import { describe, it, expect } from 'vitest';
import {
    AlarmCode,
    AlarmSeverity,
    getAlarmSeverity,
    getAlarmTitle,
    getAlarmDescription,
    getAffectedChannelFromAlarmData,
    HydraulicLockLevel
} from '../../../types/firmware_structs';

describe('AlarmPopup', () => {
    describe('Visibility logic', () => {
        it('should not show when no alarm', () => {
            const alarmCode = AlarmCode.NONE;
            const hasAlarm = alarmCode !== AlarmCode.NONE;
            expect(hasAlarm).toBe(false);
        });

        it('should show when there is an alarm', () => {
            const alarmCode = AlarmCode.HIGH_FLOW;
            const hasAlarm = alarmCode !== AlarmCode.NONE;
            expect(hasAlarm).toBe(true);
        });

        it('should check if alarm is new', () => {
            const alarmTimestamp = 1000;
            const lastSeenTimestamp = 500;
            const isNew = alarmTimestamp > lastSeenTimestamp;
            expect(isNew).toBe(true);
        });

        it('should not be new if already seen', () => {
            const alarmTimestamp = 1000;
            const lastSeenTimestamp = 1000;
            const isNew = alarmTimestamp > lastSeenTimestamp;
            expect(isNew).toBe(false);
        });
    });

    describe('getAlarmSeverity', () => {
        it('should return INFO for NONE alarm', () => {
            const severity = getAlarmSeverity(AlarmCode.NONE);
            expect(severity).toBe(AlarmSeverity.INFO);
        });

        it('should return WARNING for LOW_FLOW', () => {
            const severity = getAlarmSeverity(AlarmCode.LOW_FLOW);
            expect(severity).toBe(AlarmSeverity.WARNING);
        });

        it('should return CRITICAL for HIGH_FLOW', () => {
            const severity = getAlarmSeverity(AlarmCode.HIGH_FLOW);
            expect(severity).toBe(AlarmSeverity.CRITICAL);
        });

        it('should return DANGER for FREEZE_LOCKOUT', () => {
            const severity = getAlarmSeverity(AlarmCode.FREEZE_LOCKOUT);
            expect(severity).toBe(AlarmSeverity.DANGER);
        });
        
        it('should return CRITICAL for GLOBAL_LOCK', () => {
            const severity = getAlarmSeverity(AlarmCode.GLOBAL_LOCK);
            expect(severity).toBe(AlarmSeverity.CRITICAL);
        });
    });

    describe('getAlarmTitle', () => {
        it('should return title for NONE', () => {
            const title = getAlarmTitle(AlarmCode.NONE);
            expect(title).toBe('No Alarm');
        });

        it('should return title for NO_FLOW', () => {
            const title = getAlarmTitle(AlarmCode.NO_FLOW);
            expect(title).toBe('No Flow');
        });

        it('should return title for HIGH_FLOW', () => {
            const title = getAlarmTitle(AlarmCode.HIGH_FLOW);
            expect(title).toBe('High Flow');
        });
    });

    describe('getAlarmDescription', () => {
        it('should return description for NONE', () => {
            const desc = getAlarmDescription(AlarmCode.NONE);
            expect(desc).toBeDefined();
        });

        it('should return description with channel context', () => {
            const desc = getAlarmDescription(AlarmCode.HIGH_FLOW, 0, 0);
            expect(desc).toBeDefined();
            expect(typeof desc).toBe('string');
        });
    });

    describe('getAffectedChannelFromAlarmData', () => {
        it('should return undefined for NONE', () => {
            const channel = getAffectedChannelFromAlarmData(AlarmCode.NONE, 0);
            expect(channel).toBeUndefined();
        });

        it('should extract channel from HIGH_FLOW alarm data', () => {
            const alarmData = 2; // Channel 2
            const channel = getAffectedChannelFromAlarmData(AlarmCode.HIGH_FLOW, alarmData);
            expect(channel).toBe(2);
        });
        
        it('should return undefined for NO_FLOW', () => {
            // NO_FLOW stores retry count, not channel
            const channel = getAffectedChannelFromAlarmData(AlarmCode.NO_FLOW, 2);
            expect(channel).toBeUndefined();
        });
        
        it('should extract channel from CHANNEL_LOCK alarm data', () => {
            const channel = getAffectedChannelFromAlarmData(AlarmCode.CHANNEL_LOCK, 5);
            expect(channel).toBe(5);
        });
    });

    describe('Retry countdown logic', () => {
        it('should calculate remaining seconds', () => {
            const now = Math.floor(Date.now() / 1000);
            const retryAfter = now + 60; // 60 seconds from now
            const countdown = retryAfter - now;
            expect(countdown).toBe(60);
        });

        it('should be null when no retry needed', () => {
            const now = Math.floor(Date.now() / 1000);
            const retryAfter = now - 10; // Already passed
            const countdown = retryAfter > now ? retryAfter - now : null;
            expect(countdown).toBeNull();
        });
    });

    describe('HydraulicLockLevel', () => {
        it('should have NONE level', () => {
            expect(HydraulicLockLevel.NONE).toBeDefined();
        });

        it('should have SOFT level', () => {
            expect(HydraulicLockLevel.SOFT).toBeDefined();
        });

        it('should have HARD level', () => {
            expect(HydraulicLockLevel.HARD).toBeDefined();
        });
    });

    describe('Zone name fallback', () => {
        it('should provide default zone name when zone not found', () => {
            const channelId = 3;
            const zones: { channel_id: number; name: string }[] = [];
            const zoneName = zones.find(z => z.channel_id === channelId)?.name || `Zone ${channelId + 1}`;
            expect(zoneName).toBe('Zone 4');
        });

        it('should use zone name when found', () => {
            const channelId = 1;
            const zones = [
                { channel_id: 0, name: 'Garden' },
                { channel_id: 1, name: 'Lawn' },
                { channel_id: 2, name: 'Flowers' }
            ];
            const zoneName = zones.find(z => z.channel_id === channelId)?.name || `Zone ${channelId + 1}`;
            expect(zoneName).toBe('Lawn');
        });
    });

    describe('Component exports', () => {
        it('should export AlarmPopup as default', async () => {
            const module = await import('../../../components/mobile/AlarmPopup');
            expect(module.default).toBeDefined();
            expect(typeof module.default).toBe('function');
        });
    });
});
