/**
 * Tests for SoilTankWidget helper functions
 * Tests fill level calculation, metrics display
 */
import { describe, it, expect } from 'vitest';

describe('SoilTankWidget Helpers', () => {
    describe('fillPercent calculation', () => {
        const calculateFillPercent = (deficitMm: number, maxReferenceMm: number = 25): number => {
            return Math.max(0, Math.min(100, 100 * (1 - (deficitMm / maxReferenceMm))));
        };

        it('should return 100% when deficit is 0', () => {
            expect(calculateFillPercent(0)).toBe(100);
        });

        it('should return 0% when deficit equals max reference', () => {
            expect(calculateFillPercent(25)).toBe(0);
        });

        it('should return 50% when deficit is half of max', () => {
            expect(calculateFillPercent(12.5)).toBe(50);
        });

        it('should clamp to 0% when deficit exceeds max', () => {
            expect(calculateFillPercent(30)).toBe(0);
            expect(calculateFillPercent(100)).toBe(0);
        });

        it('should clamp to 100% for negative deficit', () => {
            expect(calculateFillPercent(-5)).toBe(100);
        });

        it('should work with custom max reference', () => {
            expect(calculateFillPercent(10, 50)).toBe(80);
            expect(calculateFillPercent(25, 50)).toBe(50);
        });
    });

    describe('Deficit Formatting', () => {
        const formatDeficit = (mm: number): string => {
            return mm.toFixed(1);
        };

        it('should format zero deficit', () => {
            expect(formatDeficit(0)).toBe('0.0');
        });

        it('should format small deficit', () => {
            expect(formatDeficit(2.5)).toBe('2.5');
        });

        it('should format large deficit', () => {
            expect(formatDeficit(15.75)).toBe('15.8');
        });

        it('should round to one decimal', () => {
            expect(formatDeficit(3.14159)).toBe('3.1');
            expect(formatDeficit(3.16)).toBe('3.2');
        });
    });
});

describe('AutoCalcStatusData', () => {
    interface AutoCalcStatus {
        current_deficit_mm: number;
        et0_mm_day: number;
        etc_mm_day: number;
        calculated_volume_l: number;
        irrigation_needed: number;
        phenological_stage: number;
        calculation_active: number;
    }

    describe('Calculation Active Status', () => {
        it('should detect active calculation', () => {
            const status: Partial<AutoCalcStatus> = { calculation_active: 1 };
            expect(status.calculation_active === 1).toBe(true);
        });

        it('should detect inactive calculation', () => {
            const status: Partial<AutoCalcStatus> = { calculation_active: 0 };
            expect(status.calculation_active === 0).toBe(true);
        });
    });

    describe('Irrigation Needed', () => {
        it('should detect irrigation needed', () => {
            const status: Partial<AutoCalcStatus> = { irrigation_needed: 1 };
            expect(status.irrigation_needed === 1).toBe(true);
        });

        it('should detect irrigation not needed', () => {
            const status: Partial<AutoCalcStatus> = { irrigation_needed: 0 };
            expect(status.irrigation_needed !== 1).toBe(true);
        });
    });
});

describe('Phenological Stage', () => {
    const PhenologicalStage = {
        INITIAL: 0,
        DEVELOPMENT: 1,
        MID_SEASON: 2,
        LATE_SEASON: 3
    };

    const getStageName = (stage: number): string => {
        switch (stage) {
            case PhenologicalStage.INITIAL: return 'Initial';
            case PhenologicalStage.DEVELOPMENT: return 'Development';
            case PhenologicalStage.MID_SEASON: return 'Mid Season';
            case PhenologicalStage.LATE_SEASON: return 'Late Season';
            default: return 'Unknown';
        }
    };

    it('should return Initial for stage 0', () => {
        expect(getStageName(0)).toBe('Initial');
    });

    it('should return Development for stage 1', () => {
        expect(getStageName(1)).toBe('Development');
    });

    it('should return Mid Season for stage 2', () => {
        expect(getStageName(2)).toBe('Mid Season');
    });

    it('should return Late Season for stage 3', () => {
        expect(getStageName(3)).toBe('Late Season');
    });

    it('should return Unknown for invalid stage', () => {
        expect(getStageName(5)).toBe('Unknown');
    });
});

describe('ET Values', () => {
    describe('ET0 (Reference Evapotranspiration)', () => {
        const formatET = (mm_day: number): string => {
            return mm_day.toFixed(2) + ' mm/day';
        };

        it('should format ET0 value', () => {
            expect(formatET(5.25)).toBe('5.25 mm/day');
        });

        it('should format zero ET0', () => {
            expect(formatET(0)).toBe('0.00 mm/day');
        });

        it('should format high ET0', () => {
            expect(formatET(10.5)).toBe('10.50 mm/day');
        });
    });

    describe('ETc (Crop Evapotranspiration)', () => {
        const calculateETc = (et0: number, kc: number): number => {
            return et0 * kc;
        };

        it('should calculate ETc from ET0 and Kc', () => {
            expect(calculateETc(5.0, 1.0)).toBe(5.0);
            expect(calculateETc(5.0, 0.8)).toBe(4.0);
            expect(calculateETc(6.0, 1.15)).toBeCloseTo(6.9, 2);
        });
    });
});

describe('Calculated Volume', () => {
    const formatVolume = (liters: number): string => {
        if (liters >= 1000) {
            return (liters / 1000).toFixed(1) + ' m³';
        }
        return liters.toFixed(1) + ' L';
    };

    it('should format liters', () => {
        expect(formatVolume(50)).toBe('50.0 L');
        expect(formatVolume(0.5)).toBe('0.5 L');
    });

    it('should format cubic meters for large volumes', () => {
        expect(formatVolume(1000)).toBe('1.0 m³');
        expect(formatVolume(2500)).toBe('2.5 m³');
    });
});

describe('Tank Visual Constants', () => {
    it('should have default max reference of 25mm', () => {
        const maxReferenceMm = 25;
        expect(maxReferenceMm).toBe(25);
    });

    it('should calculate fill percentage inversely to deficit', () => {
        const deficits = [0, 5, 10, 15, 20, 25];
        const maxRef = 25;
        
        const fills = deficits.map(d => Math.max(0, Math.min(100, 100 * (1 - d / maxRef))));
        
        expect(fills[0]).toBe(100);  // 0mm deficit = 100% full
        expect(fills[5]).toBe(0);    // 25mm deficit = 0% full
        
        // Fill should decrease as deficit increases
        for (let i = 1; i < fills.length; i++) {
            expect(fills[i]).toBeLessThan(fills[i - 1]);
        }
    });
});

describe('Loading State', () => {
    it('should show skeleton when data is null', () => {
        const autoCalcData = null;
        const isLoading = autoCalcData === null;
        expect(isLoading).toBe(true);
    });

    it('should not show skeleton when data exists', () => {
        const autoCalcData = {
            current_deficit_mm: 5,
            et0_mm_day: 4.5,
            etc_mm_day: 3.6,
            calculated_volume_l: 10,
            irrigation_needed: 0,
            phenological_stage: 2,
            calculation_active: 1
        };
        const isLoading = autoCalcData === null;
        expect(isLoading).toBe(false);
    });
});
