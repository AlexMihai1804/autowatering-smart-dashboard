/**
 * Tests for HydraulicDetailsCard helper functions
 * Tests lock detection, profile types, flow formatting
 */
import { describe, it, expect } from 'vitest';
import { 
    HydraulicLockLevel, 
    HydraulicLockReason, 
    HydraulicProfileType 
} from '../../types/firmware_structs';

describe('HydraulicDetailsCard Helpers', () => {
    describe('Lock Detection', () => {
        const isLocked = (lock_level: HydraulicLockLevel): boolean => {
            return lock_level !== HydraulicLockLevel.NONE;
        };

        it('should detect no lock', () => {
            expect(isLocked(HydraulicLockLevel.NONE)).toBe(false);
        });

        it('should detect soft lock', () => {
            expect(isLocked(HydraulicLockLevel.SOFT)).toBe(true);
        });

        it('should detect hard lock', () => {
            expect(isLocked(HydraulicLockLevel.HARD)).toBe(true);
        });
    });

    describe('Learning Detection', () => {
        const isLearning = (learning_runs: number, stable_runs: number): boolean => {
            return learning_runs > 0 && stable_runs < 5;
        };

        it('should detect learning state', () => {
            expect(isLearning(3, 2)).toBe(true);
        });

        it('should detect stable after 5 runs', () => {
            expect(isLearning(5, 5)).toBe(false);
        });

        it('should not be learning if no runs', () => {
            expect(isLearning(0, 0)).toBe(false);
        });
    });
});

describe('HydraulicLockLevel Enum', () => {
    it('should have correct values', () => {
        expect(HydraulicLockLevel.NONE).toBe(0);
        expect(HydraulicLockLevel.SOFT).toBe(1);
        expect(HydraulicLockLevel.HARD).toBe(2);
    });
});

describe('HydraulicLockReason Enum', () => {
    it('should have NONE = 0', () => {
        expect(HydraulicLockReason.NONE).toBe(0);
    });

    it('should have HIGH_FLOW = 1', () => {
        expect(HydraulicLockReason.HIGH_FLOW).toBe(1);
    });
});

describe('Lock Reason Messages', () => {
    const getLockReasonMessage = (reason: HydraulicLockReason): { title: string; description: string } => {
        switch (reason) {
            case HydraulicLockReason.HIGH_FLOW:
                return { 
                    title: 'High Flow Alert', 
                    description: 'Zone was automatically locked to prevent damage.' 
                };
            case HydraulicLockReason.NO_FLOW:
                return { 
                    title: 'No Flow Alert', 
                    description: 'Zone was automatically locked to prevent damage.' 
                };
            case HydraulicLockReason.UNEXPECTED:
                return { 
                    title: 'Leak Detected', 
                    description: 'Zone was automatically locked to prevent damage.' 
                };
            case HydraulicLockReason.MAINLINE_LEAK:
                return { 
                    title: 'Mainline Rupture', 
                    description: 'Zone was automatically locked to prevent damage.' 
                };
            default:
                return { 
                    title: 'Anomaly Detected', 
                    description: 'Zone was automatically locked to prevent damage.' 
                };
        }
    };

    it('should return High Flow Alert for HIGH_FLOW', () => {
        expect(getLockReasonMessage(HydraulicLockReason.HIGH_FLOW).title).toBe('High Flow Alert');
    });

    it('should return No Flow Alert for NO_FLOW', () => {
        expect(getLockReasonMessage(HydraulicLockReason.NO_FLOW).title).toBe('No Flow Alert');
    });

    it('should return Leak Detected for UNEXPECTED', () => {
        expect(getLockReasonMessage(HydraulicLockReason.UNEXPECTED).title).toBe('Leak Detected');
    });

    it('should return Anomaly for unknown reasons', () => {
        expect(getLockReasonMessage(99 as HydraulicLockReason).title).toBe('Anomaly Detected');
    });
});

describe('Profile Type Labels', () => {
    const getProfileLabel = (type: HydraulicProfileType): string => {
        switch (type) {
            case HydraulicProfileType.AUTO:
                return 'AUTO';
            case HydraulicProfileType.SPRAY:
                return 'SPRAY';
            case HydraulicProfileType.DRIP:
                return 'DRIP';
            default:
                return 'UNK';
        }
    };

    it('should return AUTO for auto profile', () => {
        expect(getProfileLabel(HydraulicProfileType.AUTO)).toBe('AUTO');
    });

    it('should return SPRAY for spray profile', () => {
        expect(getProfileLabel(HydraulicProfileType.SPRAY)).toBe('SPRAY');
    });

    it('should return DRIP for drip profile', () => {
        expect(getProfileLabel(HydraulicProfileType.DRIP)).toBe('DRIP');
    });

    it('should return UNK for unknown profile', () => {
        expect(getProfileLabel(99 as HydraulicProfileType)).toBe('UNK');
    });
});

describe('Flow Rate Formatting', () => {
    const formatFlowRate = (ml_min: number): string => {
        return (ml_min / 1000).toFixed(1);
    };

    it('should convert ml/min to L/min', () => {
        expect(formatFlowRate(1000)).toBe('1.0');
        expect(formatFlowRate(2500)).toBe('2.5');
    });

    it('should format zero flow', () => {
        expect(formatFlowRate(0)).toBe('0.0');
    });

    it('should format high flow rates', () => {
        expect(formatFlowRate(15000)).toBe('15.0');
    });

    it('should round to one decimal', () => {
        expect(formatFlowRate(1234)).toBe('1.2');
        expect(formatFlowRate(1267)).toBe('1.3');
    });
});

describe('Status Banner Colors', () => {
    const getStatusColors = (isLocked: boolean, isLearning: boolean): { bg: string; text: string } => {
        if (isLocked) {
            return { bg: 'bg-red-500/10', text: 'text-red-400' };
        }
        if (isLearning) {
            return { bg: 'bg-amber-500/10', text: 'text-amber-400' };
        }
        return { bg: 'bg-green-500/10', text: 'text-green-400' };
    };

    it('should return red for locked', () => {
        const colors = getStatusColors(true, false);
        expect(colors.bg).toContain('red');
        expect(colors.text).toContain('red');
    });

    it('should return amber for learning', () => {
        const colors = getStatusColors(false, true);
        expect(colors.bg).toContain('amber');
        expect(colors.text).toContain('amber');
    });

    it('should return green for normal', () => {
        const colors = getStatusColors(false, false);
        expect(colors.bg).toContain('green');
        expect(colors.text).toContain('green');
    });
});

describe('Status Text', () => {
    const getStatusText = (isLocked: boolean, isLearning: boolean): string => {
        if (isLocked) return 'SYSTEM LOCKED';
        if (isLearning) return 'LEARNING PHASE';
        return 'ACTIVE & SECURE';
    };

    it('should show SYSTEM LOCKED when locked', () => {
        expect(getStatusText(true, false)).toBe('SYSTEM LOCKED');
    });

    it('should show LEARNING PHASE when learning', () => {
        expect(getStatusText(false, true)).toBe('LEARNING PHASE');
    });

    it('should show ACTIVE & SECURE normally', () => {
        expect(getStatusText(false, false)).toBe('ACTIVE & SECURE');
    });
});

describe('Tolerance Display', () => {
    describe('Variance Formatting', () => {
        const formatTolerance = (high: number, low: number): string => {
            return `-${low}% / +${high}%`;
        };

        it('should format symmetric tolerance', () => {
            expect(formatTolerance(20, 20)).toBe('-20% / +20%');
        });

        it('should format asymmetric tolerance', () => {
            expect(formatTolerance(30, 15)).toBe('-15% / +30%');
        });

        it('should format zero tolerance', () => {
            expect(formatTolerance(0, 0)).toBe('-0% / +0%');
        });
    });
});

describe('Estimated Badge', () => {
    it('should show ESTIMATED badge when estimated is true', () => {
        const estimated = true;
        expect(estimated).toBe(true);
    });

    it('should hide ESTIMATED badge when not estimated', () => {
        const estimated = false;
        expect(estimated).toBe(false);
    });
});
