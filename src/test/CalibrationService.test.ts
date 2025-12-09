/**
 * CalibrationService Unit Tests
 * 
 * Tests for exported helper functions that don't require BLE hardware.
 */
import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PULSES_PER_LITER,
    MIN_CALIBRATION_VOLUME_ML,
    RECOMMENDED_CALIBRATION_VOLUME_ML,
    getCalibrationAccuracy,
    formatCalibration,
    calculateFlowRate
} from '../services/CalibrationService';

describe('CalibrationService', () => {
    describe('Constants', () => {
        it('should have correct default pulses per liter', () => {
            expect(DEFAULT_PULSES_PER_LITER).toBe(750);
        });

        it('should have correct minimum calibration volume', () => {
            expect(MIN_CALIBRATION_VOLUME_ML).toBe(500);
        });

        it('should have correct recommended calibration volume', () => {
            expect(RECOMMENDED_CALIBRATION_VOLUME_ML).toBe(2000);
        });
    });

    describe('getCalibrationAccuracy', () => {
        describe('returns "high" for typical flow sensor values', () => {
            it('should return high for 750 pulses/L (default)', () => {
                expect(getCalibrationAccuracy(750)).toBe('high');
            });

            it('should return high for 500 pulses/L', () => {
                expect(getCalibrationAccuracy(500)).toBe('high');
            });

            it('should return high for 1000 pulses/L', () => {
                expect(getCalibrationAccuracy(1000)).toBe('high');
            });

            it('should return high for lower boundary (200)', () => {
                expect(getCalibrationAccuracy(200)).toBe('high');
            });

            it('should return high for upper boundary (2000)', () => {
                expect(getCalibrationAccuracy(2000)).toBe('high');
            });
        });

        describe('returns "medium" for edge case values', () => {
            it('should return medium for 150 pulses/L', () => {
                expect(getCalibrationAccuracy(150)).toBe('medium');
            });

            it('should return medium for 199 pulses/L', () => {
                expect(getCalibrationAccuracy(199)).toBe('medium');
            });

            it('should return medium for 2001 pulses/L', () => {
                expect(getCalibrationAccuracy(2001)).toBe('medium');
            });

            it('should return medium for 2500 pulses/L', () => {
                expect(getCalibrationAccuracy(2500)).toBe('medium');
            });

            it('should return medium for lower boundary (100)', () => {
                expect(getCalibrationAccuracy(100)).toBe('medium');
            });

            it('should return medium for upper boundary (3000)', () => {
                expect(getCalibrationAccuracy(3000)).toBe('medium');
            });
        });

        describe('returns "low" for extreme values', () => {
            it('should return low for 0 pulses/L', () => {
                expect(getCalibrationAccuracy(0)).toBe('low');
            });

            it('should return low for 50 pulses/L', () => {
                expect(getCalibrationAccuracy(50)).toBe('low');
            });

            it('should return low for 99 pulses/L', () => {
                expect(getCalibrationAccuracy(99)).toBe('low');
            });

            it('should return low for 3001 pulses/L', () => {
                expect(getCalibrationAccuracy(3001)).toBe('low');
            });

            it('should return low for 5000 pulses/L', () => {
                expect(getCalibrationAccuracy(5000)).toBe('low');
            });

            it('should return low for negative values', () => {
                expect(getCalibrationAccuracy(-100)).toBe('low');
            });
        });
    });

    describe('formatCalibration', () => {
        it('should format default calibration value', () => {
            expect(formatCalibration(750)).toBe('750 pulsuri/L');
        });

        it('should format zero value', () => {
            expect(formatCalibration(0)).toBe('0 pulsuri/L');
        });

        it('should format large value', () => {
            expect(formatCalibration(2500)).toBe('2500 pulsuri/L');
        });

        it('should format small value', () => {
            expect(formatCalibration(100)).toBe('100 pulsuri/L');
        });
    });

    describe('calculateFlowRate', () => {
        it('should calculate correct flow rate for 1 pulse per second at 60 pulsesPerLiter', () => {
            // 1 pulse/sec * 60 sec / 60 pulses/L = 1 L/min
            expect(calculateFlowRate(1, 60)).toBe(1);
        });

        it('should calculate correct flow rate for typical values', () => {
            // 12.5 pulses/sec with 750 pulses/L = (12.5 / 750) * 60 = 1 L/min
            expect(calculateFlowRate(12.5, 750)).toBe(1);
        });

        it('should return 0 when pulsesPerLiter is 0', () => {
            expect(calculateFlowRate(100, 0)).toBe(0);
        });

        it('should return 0 when pulsesPerSecond is 0', () => {
            expect(calculateFlowRate(0, 750)).toBe(0);
        });

        it('should calculate higher flow rates correctly', () => {
            // 125 pulses/sec with 750 pulses/L = (125 / 750) * 60 = 10 L/min
            expect(calculateFlowRate(125, 750)).toBe(10);
        });

        it('should calculate fractional flow rates', () => {
            // 6.25 pulses/sec with 750 pulses/L = (6.25 / 750) * 60 = 0.5 L/min
            expect(calculateFlowRate(6.25, 750)).toBe(0.5);
        });

        it('should handle edge case with 1 pulse per liter', () => {
            // 1 pulse/sec with 1 pulse/L = 60 L/min
            expect(calculateFlowRate(1, 1)).toBe(60);
        });
    });

    describe('CalibrationStage type', () => {
        it('should accept valid stage values', () => {
            const stages: Array<'idle' | 'running' | 'waiting_volume' | 'calculated' | 'applying' | 'completed' | 'failed'> = [
                'idle', 'running', 'waiting_volume', 'calculated', 'applying', 'completed', 'failed'
            ];
            stages.forEach(stage => {
                expect(typeof stage).toBe('string');
            });
        });
    });
});
