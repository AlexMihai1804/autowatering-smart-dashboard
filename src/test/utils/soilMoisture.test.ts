/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import {
    calcSoilMoisturePercentPreferred,
    calcSoilMoisturePercentFromAutoCalc,
    calcAverageSoilMoisturePercent,
    getSoilMoistureLabel
} from '../../utils/soilMoisture';

describe('soilMoisture utils', () => {
    describe('calcSoilMoisturePercentFromAutoCalc', () => {
        it('should return null for missing or invalid input', () => {
            expect(calcSoilMoisturePercentFromAutoCalc(null)).toBeNull();
            expect(calcSoilMoisturePercentFromAutoCalc(undefined)).toBeNull();
            expect(calcSoilMoisturePercentFromAutoCalc({ raw_mm: 0 } as any)).toBeNull();
        });

        it('should calculate correct percentage', () => {
            // raw_mm = 100, deficit = 20 -> 80% moisture
            const autoCalc = {
                raw_mm: 100,
                current_deficit_mm: 20,
                last_calculation_time: Date.now()
            } as any;
            expect(calcSoilMoisturePercentFromAutoCalc(autoCalc)).toBe(80);
        });

        it('should clamp values between 0 and 100', () => {
            const overflow = {
                raw_mm: 100,
                current_deficit_mm: 150, // More deficit than capacity
                last_calculation_time: Date.now()
            } as any;
            expect(calcSoilMoisturePercentFromAutoCalc(overflow)).toBe(0);

            const underflow = {
                raw_mm: 100,
                current_deficit_mm: -10, // Negative deficit
                last_calculation_time: Date.now()
            } as any;
            expect(calcSoilMoisturePercentFromAutoCalc(underflow)).toBeNull();
        });
    });

    describe('calcSoilMoisturePercentPreferred', () => {
        it('should prioritize per-channel config', () => {
            const args = {
                perChannelConfig: { channel_id: 1, enabled: true, moisture_pct: 60 } as any,
                globalConfig: { channel_id: 255, enabled: true, moisture_pct: 40 } as any,
                autoCalc: { raw_mm: 100, current_deficit_mm: 0, last_calculation_time: 123 } as any
            };
            expect(calcSoilMoisturePercentPreferred(args)).toBe(60);
        });

        it('should fallback to global config if per-channel disabled/missing', () => {
            const args = {
                perChannelConfig: null,
                globalConfig: { channel_id: 255, enabled: true, moisture_pct: 40 } as any,
                autoCalc: { raw_mm: 100, current_deficit_mm: 0, last_calculation_time: 123 } as any
            };
            expect(calcSoilMoisturePercentPreferred(args)).toBe(40);
        });

        it('should fallback to autoCalc if configs missing', () => {
            const args = {
                perChannelConfig: null,
                globalConfig: null,
                autoCalc: { raw_mm: 100, current_deficit_mm: 25, last_calculation_time: 123 } as any
            };
            // 100 - 25 = 75%
            expect(calcSoilMoisturePercentPreferred(args)).toBe(75);
        });
    });

    describe('calcAverageSoilMoisturePercent', () => {
        it('should calculate average correctly', () => {
            const inputs = [
                { raw_mm: 100, current_deficit_mm: 0, last_calculation_time: 1 }, // 100%
                { raw_mm: 100, current_deficit_mm: 50, last_calculation_time: 1 }, // 50%
                null
            ] as any[];
            expect(calcAverageSoilMoisturePercent(inputs)).toBe(75);
        });

        it('should return null for empty list', () => {
            expect(calcAverageSoilMoisturePercent([])).toBeNull();
        });
    });

    describe('getSoilMoistureLabel', () => {
        it('should return correct labels', () => {
            expect(getSoilMoistureLabel(80)).toBe('Optimal');
            expect(getSoilMoistureLabel(40)).toBe('Fair');
            expect(getSoilMoistureLabel(20)).toBe('Low');
        });
    });
});
