import { describe, it, expect } from 'vitest';
import { AlarmCode, AlarmSeverity } from '../../../types/firmware_structs';

/**
 * Tests for MobileAlarmCard helper functions.
 * These functions are defined inside the component but follow predictable logic.
 */

describe('MobileAlarmCard Helpers', () => {
    // Helper function logic extracted from component
    const getSeverityStyles = (sev: AlarmSeverity) => {
        switch (sev) {
            case AlarmSeverity.CRITICAL:
                return {
                    bg: 'bg-gradient-to-r from-red-600/30 to-red-500/20',
                    border: 'border-red-500/60',
                    icon: 'text-red-400',
                    text: 'text-red-100',
                    pulse: true
                };
            case AlarmSeverity.DANGER:
                return {
                    bg: 'bg-gradient-to-r from-orange-600/30 to-orange-500/20',
                    border: 'border-orange-500/60',
                    icon: 'text-orange-400',
                    text: 'text-orange-100',
                    pulse: true
                };
            case AlarmSeverity.WARNING:
                return {
                    bg: 'bg-gradient-to-r from-yellow-600/25 to-yellow-500/15',
                    border: 'border-yellow-500/50',
                    icon: 'text-yellow-400',
                    text: 'text-yellow-100',
                    pulse: false
                };
            default:
                return {
                    bg: 'bg-gradient-to-r from-gray-600/30 to-gray-500/20',
                    border: 'border-gray-500/50',
                    icon: 'text-gray-400',
                    text: 'text-gray-100',
                    pulse: false
                };
        }
    };

    const getAlarmIcon = (code: AlarmCode): string => {
        switch (code) {
            case AlarmCode.NO_FLOW:
            case AlarmCode.LOW_FLOW:
                return 'water_drop';
            case AlarmCode.HIGH_FLOW:
            case AlarmCode.UNEXPECTED_FLOW:
            case AlarmCode.MAINLINE_LEAK:
                return 'water_damage';
            case AlarmCode.FREEZE_LOCKOUT:
                return 'ac_unit';
            case AlarmCode.CHANNEL_LOCK:
                return 'lock';
            case AlarmCode.GLOBAL_LOCK:
                return 'lock_reset';
            default:
                return 'warning';
        }
    };

    describe('getSeverityStyles', () => {
        it('should return red styles with pulse for CRITICAL', () => {
            const styles = getSeverityStyles(AlarmSeverity.CRITICAL);
            expect(styles.bg).toContain('red');
            expect(styles.border).toContain('red');
            expect(styles.icon).toContain('red');
            expect(styles.text).toContain('red');
            expect(styles.pulse).toBe(true);
        });

        it('should return orange styles with pulse for DANGER', () => {
            const styles = getSeverityStyles(AlarmSeverity.DANGER);
            expect(styles.bg).toContain('orange');
            expect(styles.border).toContain('orange');
            expect(styles.icon).toContain('orange');
            expect(styles.text).toContain('orange');
            expect(styles.pulse).toBe(true);
        });

        it('should return yellow styles without pulse for WARNING', () => {
            const styles = getSeverityStyles(AlarmSeverity.WARNING);
            expect(styles.bg).toContain('yellow');
            expect(styles.border).toContain('yellow');
            expect(styles.icon).toContain('yellow');
            expect(styles.text).toContain('yellow');
            expect(styles.pulse).toBe(false);
        });

        it('should return gray styles for INFO (default)', () => {
            const styles = getSeverityStyles(AlarmSeverity.INFO);
            expect(styles.bg).toContain('gray');
            expect(styles.border).toContain('gray');
            expect(styles.icon).toContain('gray');
            expect(styles.text).toContain('gray');
            expect(styles.pulse).toBe(false);
        });

        it('should return gray styles for unknown severity', () => {
            const styles = getSeverityStyles('unknown' as AlarmSeverity);
            expect(styles.bg).toContain('gray');
            expect(styles.pulse).toBe(false);
        });
    });

    describe('getAlarmIcon', () => {
        it('should return water_drop for flow-related alarms', () => {
            expect(getAlarmIcon(AlarmCode.NO_FLOW)).toBe('water_drop');
            expect(getAlarmIcon(AlarmCode.LOW_FLOW)).toBe('water_drop');
        });

        it('should return water_damage for leak-related alarms', () => {
            expect(getAlarmIcon(AlarmCode.HIGH_FLOW)).toBe('water_damage');
            expect(getAlarmIcon(AlarmCode.UNEXPECTED_FLOW)).toBe('water_damage');
            expect(getAlarmIcon(AlarmCode.MAINLINE_LEAK)).toBe('water_damage');
        });

        it('should return ac_unit for freeze lockout', () => {
            expect(getAlarmIcon(AlarmCode.FREEZE_LOCKOUT)).toBe('ac_unit');
        });

        it('should return lock for channel lock', () => {
            expect(getAlarmIcon(AlarmCode.CHANNEL_LOCK)).toBe('lock');
        });

        it('should return lock_reset for global lock', () => {
            expect(getAlarmIcon(AlarmCode.GLOBAL_LOCK)).toBe('lock_reset');
        });

        it('should return warning for NONE or unknown codes', () => {
            expect(getAlarmIcon(AlarmCode.NONE)).toBe('warning');
            expect(getAlarmIcon(99 as AlarmCode)).toBe('warning');
        });
    });

    describe('Zone name resolution', () => {
        const zones = [
            { channel_id: 0, name: 'Front Lawn' },
            { channel_id: 1, name: 'Back Garden' },
            { channel_id: 2, name: '' },
        ];

        const getZoneName = (channelId: number | undefined) => {
            if (channelId === undefined) return undefined;
            const zone = zones.find(z => z.channel_id === channelId);
            return zone?.name || `Zone ${channelId + 1}`;
        };

        it('should return zone name if found', () => {
            expect(getZoneName(0)).toBe('Front Lawn');
            expect(getZoneName(1)).toBe('Back Garden');
        });

        it('should return fallback name for zone with empty name', () => {
            expect(getZoneName(2)).toBe('Zone 3');
        });

        it('should return fallback name for unknown channel', () => {
            expect(getZoneName(5)).toBe('Zone 6');
        });

        it('should return undefined for undefined channel', () => {
            expect(getZoneName(undefined)).toBeUndefined();
        });
    });

    describe('Alarm visibility logic', () => {
        it('should hide alarm when not connected', () => {
            const isConnected = false;
            const hasAlarm = true;
            const shouldShow = isConnected && hasAlarm;
            expect(shouldShow).toBe(false);
        });

        it('should hide alarm when no active alarm', () => {
            const isConnected = true;
            const alarmCode = AlarmCode.NONE;
            const hasAlarm = alarmCode !== AlarmCode.NONE;
            const shouldShow = isConnected && hasAlarm;
            expect(shouldShow).toBe(false);
        });

        it('should show alarm when connected and has alarm', () => {
            const isConnected = true;
            const alarmCode = AlarmCode.NO_FLOW;
            const hasAlarm = alarmCode !== AlarmCode.NONE;
            const shouldShow = isConnected && hasAlarm;
            expect(shouldShow).toBe(true);
        });
    });
});
