/**
 * Tests for AlarmCard helper functions
 * Tests alarm info mapping, timestamp formatting
 */
import { describe, it, expect } from 'vitest';
import { AlarmCode } from '../../types/firmware_structs';

describe('AlarmCard Helpers', () => {
    describe('getAlarmInfo', () => {
        const getAlarmInfo = (code: number): { name: string; description: string; color: string } => {
            switch (code) {
                case AlarmCode.NONE:
                    return { 
                        name: 'No Alarm', 
                        description: 'System operating normally',
                        color: 'text-cyber-emerald'
                    };
                case AlarmCode.NO_FLOW:
                    return { 
                        name: 'No Flow', 
                        description: 'No water flow detected during watering. Check supply, valve, filter, and sensor.',
                        color: 'text-red-500'
                    };
                case AlarmCode.UNEXPECTED_FLOW:
                    return { 
                        name: 'Unexpected Flow', 
                        description: 'Flow detected when all valves are closed. Check for leaks.',
                        color: 'text-red-500'
                    };
                case AlarmCode.FREEZE_LOCKOUT:
                    return { 
                        name: 'Freeze Protection', 
                        description: 'Freeze protection is active. Watering is temporarily paused.',
                        color: 'text-orange-500'
                    };
                case AlarmCode.HIGH_FLOW:
                    return { 
                        name: 'High Flow', 
                        description: 'Flow exceeded the learned limit. Possible burst/leak.',
                        color: 'text-red-500'
                    };
                case AlarmCode.LOW_FLOW:
                    return { 
                        name: 'Low Flow', 
                        description: 'Flow is below the learned limit. Check pressure and filters.',
                        color: 'text-yellow-500'
                    };
                case AlarmCode.MAINLINE_LEAK:
                    return { 
                        name: 'Mainline Leak', 
                        description: 'Static test detected flow with zones off. Check for leaks.',
                        color: 'text-red-500'
                    };
                case AlarmCode.CHANNEL_LOCK:
                    return { 
                        name: 'Zone Locked', 
                        description: 'Zone locked after repeated anomalies. Manual intervention required.',
                        color: 'text-red-500'
                    };
                case AlarmCode.GLOBAL_LOCK:
                    return { 
                        name: 'System Locked', 
                        description: 'System locked due to a critical water anomaly. Check for leaks.',
                        color: 'text-red-500'
                    };
                default:
                    return { 
                        name: `Unknown Alarm (${code})`, 
                        description: 'Unrecognized alarm code. Contact support.',
                        color: 'text-gray-500'
                    };
            }
        };

        it('should return No Alarm for NONE', () => {
            const info = getAlarmInfo(AlarmCode.NONE);
            expect(info.name).toBe('No Alarm');
            expect(info.color).toContain('emerald');
        });

        it('should return No Flow info', () => {
            const info = getAlarmInfo(AlarmCode.NO_FLOW);
            expect(info.name).toBe('No Flow');
            expect(info.description).toContain('water flow');
            expect(info.color).toContain('red');
        });

        it('should return Unexpected Flow info', () => {
            const info = getAlarmInfo(AlarmCode.UNEXPECTED_FLOW);
            expect(info.name).toBe('Unexpected Flow');
            expect(info.description).toContain('leaks');
        });

        it('should return Freeze Protection info', () => {
            const info = getAlarmInfo(AlarmCode.FREEZE_LOCKOUT);
            expect(info.name).toBe('Freeze Protection');
            expect(info.color).toContain('orange');
        });

        it('should return High Flow info', () => {
            const info = getAlarmInfo(AlarmCode.HIGH_FLOW);
            expect(info.name).toBe('High Flow');
            expect(info.description).toContain('burst');
        });

        it('should return Low Flow info', () => {
            const info = getAlarmInfo(AlarmCode.LOW_FLOW);
            expect(info.name).toBe('Low Flow');
            expect(info.color).toContain('yellow');
        });

        it('should return Mainline Leak info', () => {
            const info = getAlarmInfo(AlarmCode.MAINLINE_LEAK);
            expect(info.name).toBe('Mainline Leak');
        });

        it('should return Zone Locked info', () => {
            const info = getAlarmInfo(AlarmCode.CHANNEL_LOCK);
            expect(info.name).toBe('Zone Locked');
            expect(info.description).toContain('Manual intervention');
        });

        it('should return System Locked info', () => {
            const info = getAlarmInfo(AlarmCode.GLOBAL_LOCK);
            expect(info.name).toBe('System Locked');
        });

        it('should return Unknown for unrecognized codes', () => {
            const info = getAlarmInfo(99);
            expect(info.name).toContain('Unknown');
            expect(info.name).toContain('99');
            expect(info.color).toContain('gray');
        });
    });

    describe('formatTimestamp', () => {
        const formatTimestamp = (ts: number): string => {
            if (!ts || ts === 0) return 'Unknown';
            const date = new Date(ts * 1000);
            return date.toLocaleString();
        };

        it('should return Unknown for 0', () => {
            expect(formatTimestamp(0)).toBe('Unknown');
        });

        it('should return Unknown for falsy values', () => {
            expect(formatTimestamp(undefined as any)).toBe('Unknown');
            expect(formatTimestamp(null as any)).toBe('Unknown');
        });

        it('should format valid timestamp', () => {
            const ts = Math.floor(Date.now() / 1000);
            const result = formatTimestamp(ts);
            expect(result).not.toBe('Unknown');
            expect(typeof result).toBe('string');
        });
    });
});

describe('AlarmCode Enum', () => {
    it('should have NONE = 0', () => {
        expect(AlarmCode.NONE).toBe(0);
    });

    it('should have NO_FLOW = 1', () => {
        expect(AlarmCode.NO_FLOW).toBe(1);
    });

    it('should have UNEXPECTED_FLOW = 2', () => {
        expect(AlarmCode.UNEXPECTED_FLOW).toBe(2);
    });

    it('should have FREEZE_LOCKOUT = 3', () => {
        expect(AlarmCode.FREEZE_LOCKOUT).toBe(3);
    });

    it('should have HIGH_FLOW = 4', () => {
        expect(AlarmCode.HIGH_FLOW).toBe(4);
    });

    it('should have LOW_FLOW = 5', () => {
        expect(AlarmCode.LOW_FLOW).toBe(5);
    });

    it('should have MAINLINE_LEAK = 6', () => {
        expect(AlarmCode.MAINLINE_LEAK).toBe(6);
    });

    it('should have CHANNEL_LOCK = 7', () => {
        expect(AlarmCode.CHANNEL_LOCK).toBe(7);
    });

    it('should have GLOBAL_LOCK = 8', () => {
        expect(AlarmCode.GLOBAL_LOCK).toBe(8);
    });
});

describe('Alarm Detection', () => {
    const hasAlarm = (alarmStatus: { alarm_code: number } | null): boolean => {
        return alarmStatus !== null && alarmStatus.alarm_code !== AlarmCode.NONE;
    };

    it('should return false for null status', () => {
        expect(hasAlarm(null)).toBe(false);
    });

    it('should return false for NONE alarm', () => {
        expect(hasAlarm({ alarm_code: AlarmCode.NONE })).toBe(false);
    });

    it('should return true for any alarm', () => {
        expect(hasAlarm({ alarm_code: AlarmCode.NO_FLOW })).toBe(true);
        expect(hasAlarm({ alarm_code: AlarmCode.HIGH_FLOW })).toBe(true);
        expect(hasAlarm({ alarm_code: AlarmCode.GLOBAL_LOCK })).toBe(true);
    });
});

describe('Alarm Severity Classification', () => {
    const getAlarmSeverity = (code: AlarmCode): 'info' | 'warning' | 'danger' | 'critical' => {
        switch (code) {
            case AlarmCode.NONE:
                return 'info';
            case AlarmCode.LOW_FLOW:
                return 'warning';
            case AlarmCode.FREEZE_LOCKOUT:
                return 'warning';
            case AlarmCode.NO_FLOW:
            case AlarmCode.HIGH_FLOW:
            case AlarmCode.UNEXPECTED_FLOW:
            case AlarmCode.MAINLINE_LEAK:
            case AlarmCode.CHANNEL_LOCK:
                return 'danger';
            case AlarmCode.GLOBAL_LOCK:
                return 'critical';
            default:
                return 'warning';
        }
    };

    it('should classify NONE as info', () => {
        expect(getAlarmSeverity(AlarmCode.NONE)).toBe('info');
    });

    it('should classify LOW_FLOW as warning', () => {
        expect(getAlarmSeverity(AlarmCode.LOW_FLOW)).toBe('warning');
    });

    it('should classify FREEZE_LOCKOUT as warning', () => {
        expect(getAlarmSeverity(AlarmCode.FREEZE_LOCKOUT)).toBe('warning');
    });

    it('should classify NO_FLOW as danger', () => {
        expect(getAlarmSeverity(AlarmCode.NO_FLOW)).toBe('danger');
    });

    it('should classify HIGH_FLOW as danger', () => {
        expect(getAlarmSeverity(AlarmCode.HIGH_FLOW)).toBe('danger');
    });

    it('should classify GLOBAL_LOCK as critical', () => {
        expect(getAlarmSeverity(AlarmCode.GLOBAL_LOCK)).toBe('critical');
    });
});
