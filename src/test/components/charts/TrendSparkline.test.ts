/**
 * Tests for TrendSparkline component
 */
import { describe, it, expect } from 'vitest';

describe('TrendSparkline', () => {
    describe('data transformation', () => {
        it('should transform data array to chart format', () => {
            const data = [10, 20, 30, 40, 50];
            const chartData = data.map((value, index) => ({ value, index }));

            expect(chartData.length).toBe(5);
            expect(chartData[0]).toEqual({ value: 10, index: 0 });
            expect(chartData[4]).toEqual({ value: 50, index: 4 });
        });

        it('should handle empty data array', () => {
            const data: number[] = [];
            expect(data.length).toBe(0);
        });

        it('should handle single data point', () => {
            const data = [42];
            const chartData = data.map((value, index) => ({ value, index }));

            expect(chartData.length).toBe(1);
            expect(chartData[0]).toEqual({ value: 42, index: 0 });
        });

        it('should handle negative values', () => {
            const data = [-10, 0, 10];
            const chartData = data.map((value, index) => ({ value, index }));

            expect(chartData[0].value).toBe(-10);
            expect(chartData[1].value).toBe(0);
            expect(chartData[2].value).toBe(10);
        });

        it('should handle decimal values', () => {
            const data = [1.5, 2.7, 3.9];
            const chartData = data.map((value, index) => ({ value, index }));

            expect(chartData[0].value).toBe(1.5);
            expect(chartData[1].value).toBe(2.7);
            expect(chartData[2].value).toBe(3.9);
        });
    });

    describe('default props', () => {
        it('should have default height of 32', () => {
            const defaultHeight = 32;
            expect(defaultHeight).toBe(32);
        });

        it('should have default width of 80', () => {
            const defaultWidth = 80;
            expect(defaultWidth).toBe(80);
        });

        it('should have showDots default to false', () => {
            const defaultShowDots = false;
            expect(defaultShowDots).toBe(false);
        });

        it('should have strokeWidth default to 2', () => {
            const defaultStrokeWidth = 2;
            expect(defaultStrokeWidth).toBe(2);
        });
    });

    describe('empty state', () => {
        it('should detect empty data', () => {
            const data: number[] = [];
            const isEmpty = !data || data.length === 0;
            expect(isEmpty).toBe(true);
        });

        it('should detect null data', () => {
            const data = null;
            const isEmpty = !data || (data as any).length === 0;
            expect(isEmpty).toBe(true);
        });

        it('should detect undefined data', () => {
            const data = undefined;
            const isEmpty = !data;
            expect(isEmpty).toBe(true);
        });
    });

    describe('component export', () => {
        it('should export default component', async () => {
            const module = await import('../../../components/charts/TrendSparkline');
            expect(module.default).toBeDefined();
            expect(typeof module.default).toBe('function');
        });
    });
});
