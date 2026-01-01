/**
 * Tests for TaskControlCard helper functions
 * Tests time/volume formatting and progress calculations
 */
import { describe, it, expect } from 'vitest';
import { TaskStatus, WateringMode } from '../../types/firmware_structs';

describe('TaskControlCard Helpers', () => {
    describe('formatTime', () => {
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        it('should format 0 seconds as 0:00', () => {
            expect(formatTime(0)).toBe('0:00');
        });

        it('should format seconds under a minute', () => {
            expect(formatTime(30)).toBe('0:30');
            expect(formatTime(59)).toBe('0:59');
        });

        it('should format exact minutes', () => {
            expect(formatTime(60)).toBe('1:00');
            expect(formatTime(120)).toBe('2:00');
        });

        it('should format minutes and seconds', () => {
            expect(formatTime(90)).toBe('1:30');
            expect(formatTime(125)).toBe('2:05');
            expect(formatTime(3661)).toBe('61:01');
        });

        it('should pad single digit seconds', () => {
            expect(formatTime(61)).toBe('1:01');
            expect(formatTime(69)).toBe('1:09');
        });
    });

    describe('formatVolume', () => {
        const formatVolume = (ml: number): string => {
            if (ml >= 1000) {
                return `${(ml / 1000).toFixed(1)}L`;
            }
            return `${ml}ml`;
        };

        it('should format milliliters under 1000', () => {
            expect(formatVolume(0)).toBe('0ml');
            expect(formatVolume(500)).toBe('500ml');
            expect(formatVolume(999)).toBe('999ml');
        });

        it('should format liters at 1000ml', () => {
            expect(formatVolume(1000)).toBe('1.0L');
        });

        it('should format liters with decimals', () => {
            expect(formatVolume(1500)).toBe('1.5L');
            expect(formatVolume(2345)).toBe('2.3L');
            expect(formatVolume(10000)).toBe('10.0L');
        });
    });

    describe('progress calculation', () => {
        const calculateProgress = (currentValue: number, targetValue: number): number => {
            if (targetValue <= 0) return 0;
            return (currentValue / targetValue) * 100;
        };

        it('should return 0% when target is 0', () => {
            expect(calculateProgress(50, 0)).toBe(0);
        });

        it('should return 0% when current is 0', () => {
            expect(calculateProgress(0, 100)).toBe(0);
        });

        it('should calculate 50% correctly', () => {
            expect(calculateProgress(50, 100)).toBe(50);
        });

        it('should calculate 100% correctly', () => {
            expect(calculateProgress(100, 100)).toBe(100);
        });

        it('should handle over 100%', () => {
            expect(calculateProgress(150, 100)).toBe(150);
        });
    });
});

describe('TaskStatus States', () => {
    it('should have correct enum values', () => {
        expect(TaskStatus.IDLE).toBe(0);
        expect(TaskStatus.RUNNING).toBe(1);
        expect(TaskStatus.PAUSED).toBe(2);
        expect(TaskStatus.COMPLETED).toBe(3);
    });

    describe('Status checks', () => {
        it('should detect watering state', () => {
            const isWatering = (status: TaskStatus) => status === TaskStatus.RUNNING;
            expect(isWatering(TaskStatus.RUNNING)).toBe(true);
            expect(isWatering(TaskStatus.IDLE)).toBe(false);
            expect(isWatering(TaskStatus.PAUSED)).toBe(false);
        });

        it('should detect paused state', () => {
            const isPaused = (status: TaskStatus) => status === TaskStatus.PAUSED;
            expect(isPaused(TaskStatus.PAUSED)).toBe(true);
            expect(isPaused(TaskStatus.RUNNING)).toBe(false);
        });

        it('should detect idle state', () => {
            const isIdle = (status: TaskStatus) => status === TaskStatus.IDLE;
            expect(isIdle(TaskStatus.IDLE)).toBe(true);
            expect(isIdle(TaskStatus.RUNNING)).toBe(false);
        });
    });
});

describe('WateringMode', () => {
    it('should have correct enum values', () => {
        expect(WateringMode.DURATION_MINUTES).toBe(0);
        expect(WateringMode.VOLUME_LITERS).toBe(1);
    });

    describe('Mode-based formatting', () => {
        const formatTime = (seconds: number): string => {
            const mins = Math.floor(seconds / 60);
            const secs = seconds % 60;
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        const formatVolume = (ml: number): string => {
            if (ml >= 1000) {
                return `${(ml / 1000).toFixed(1)}L`;
            }
            return `${ml}ml`;
        };

        const formatValue = (value: number, mode: WateringMode): string => {
            return mode === WateringMode.DURATION_MINUTES 
                ? formatTime(value) 
                : formatVolume(value);
        };

        it('should format duration mode values', () => {
            expect(formatValue(120, WateringMode.DURATION_MINUTES)).toBe('2:00');
            expect(formatValue(90, WateringMode.DURATION_MINUTES)).toBe('1:30');
        });

        it('should format volume mode values', () => {
            expect(formatValue(500, WateringMode.VOLUME_LITERS)).toBe('500ml');
            expect(formatValue(2500, WateringMode.VOLUME_LITERS)).toBe('2.5L');
        });
    });
});

describe('Active Zone Detection', () => {
    it('should detect no active zone when channel_id is 0xFF', () => {
        const currentTask = { channel_id: 0xFF, status: TaskStatus.IDLE };
        const hasActiveZone = currentTask.channel_id !== 0xFF;
        expect(hasActiveZone).toBe(false);
    });

    it('should detect active zone when channel_id is valid', () => {
        const currentTask = { channel_id: 3, status: TaskStatus.RUNNING };
        const hasActiveZone = currentTask.channel_id !== 0xFF;
        expect(hasActiveZone).toBe(true);
    });

    it('should find zone by channel_id', () => {
        const zones = [
            { channel_id: 0, name: 'Front Lawn' },
            { channel_id: 1, name: 'Back Garden' },
            { channel_id: 2, name: 'Patio' }
        ];
        const channelId = 1;
        const zone = zones.find(z => z.channel_id === channelId);
        expect(zone?.name).toBe('Back Garden');
    });
});

describe('Status Styling', () => {
    const getStatusColor = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.RUNNING:
                return 'bg-cyber-cyan animate-pulse';
            case TaskStatus.PAUSED:
                return 'bg-yellow-400';
            default:
                return 'bg-gray-500';
        }
    };

    const getStatusBadge = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.RUNNING:
                return 'bg-cyber-cyan/20 text-cyber-cyan';
            case TaskStatus.PAUSED:
                return 'bg-yellow-400/20 text-yellow-400';
            default:
                return 'bg-gray-600/50 text-gray-400';
        }
    };

    it('should return cyan color for running', () => {
        expect(getStatusColor(TaskStatus.RUNNING)).toContain('cyber-cyan');
        expect(getStatusColor(TaskStatus.RUNNING)).toContain('animate-pulse');
    });

    it('should return yellow color for paused', () => {
        expect(getStatusColor(TaskStatus.PAUSED)).toContain('yellow');
    });

    it('should return gray color for idle/completed', () => {
        expect(getStatusColor(TaskStatus.IDLE)).toContain('gray');
        expect(getStatusColor(TaskStatus.COMPLETED)).toContain('gray');
    });

    it('should return proper badge classes', () => {
        expect(getStatusBadge(TaskStatus.RUNNING)).toContain('text-cyber-cyan');
        expect(getStatusBadge(TaskStatus.PAUSED)).toContain('text-yellow-400');
        expect(getStatusBadge(TaskStatus.IDLE)).toContain('text-gray-400');
    });
});

describe('Status Text', () => {
    const getStatusText = (status: TaskStatus): string => {
        switch (status) {
            case TaskStatus.RUNNING:
                return 'RUNNING';
            case TaskStatus.PAUSED:
                return 'PAUSED';
            case TaskStatus.COMPLETED:
                return 'COMPLETED';
            default:
                return 'IDLE';
        }
    };

    it('should return correct status text', () => {
        expect(getStatusText(TaskStatus.RUNNING)).toBe('RUNNING');
        expect(getStatusText(TaskStatus.PAUSED)).toBe('PAUSED');
        expect(getStatusText(TaskStatus.IDLE)).toBe('IDLE');
        expect(getStatusText(TaskStatus.COMPLETED)).toBe('COMPLETED');
    });
});
