/**
 * Charts Index Tests
 * 
 * Tests for chart colors and exports
 */
import { describe, it, expect } from 'vitest';
import { CHART_COLORS } from '../../../components/charts';

describe('Charts', () => {
    describe('CHART_COLORS', () => {
        it('should export primary color as cyber-cyan', () => {
            expect(CHART_COLORS.primary).toBe('#06b6d4');
        });

        it('should export secondary color as cyber-emerald', () => {
            expect(CHART_COLORS.secondary).toBe('#10b981');
        });

        it('should export warning color as cyber-amber', () => {
            expect(CHART_COLORS.warning).toBe('#f59e0b');
        });

        it('should export danger color as cyber-rose', () => {
            expect(CHART_COLORS.danger).toBe('#f43f5e');
        });

        it('should export temperature color as orange', () => {
            expect(CHART_COLORS.temperature).toBe('#f97316');
        });

        it('should export humidity color as blue', () => {
            expect(CHART_COLORS.humidity).toBe('#3b82f6');
        });

        it('should export pressure color as purple', () => {
            expect(CHART_COLORS.pressure).toBe('#8b5cf6');
        });

        it('should export rain color as cyan', () => {
            expect(CHART_COLORS.rain).toBe('#06b6d4');
        });

        it('should export volume color as green', () => {
            expect(CHART_COLORS.volume).toBe('#10b981');
        });

        it('should have 8 channel colors', () => {
            expect(CHART_COLORS.channels).toHaveLength(8);
        });

        it('should have distinct channel colors', () => {
            const uniqueColors = new Set(CHART_COLORS.channels);
            expect(uniqueColors.size).toBe(8);
        });

        it('should have channel colors as valid hex', () => {
            CHART_COLORS.channels.forEach(color => {
                expect(color).toMatch(/^#[0-9a-f]{6}$/i);
            });
        });

        it('should export grid color', () => {
            expect(CHART_COLORS.grid).toBe('#374151');
        });

        it('should export axis color', () => {
            expect(CHART_COLORS.axis).toBe('#9ca3af');
        });

        describe('tooltip colors', () => {
            it('should have background color', () => {
                expect(CHART_COLORS.tooltip.bg).toBe('#1f2937');
            });

            it('should have border color', () => {
                expect(CHART_COLORS.tooltip.border).toBe('#374151');
            });

            it('should have text color', () => {
                expect(CHART_COLORS.tooltip.text).toBe('#f9fafb');
            });
        });
    });

    describe('Chart component exports', () => {
        it('should export TemperatureHumidityChart', async () => {
            const module = await import('../../../components/charts');
            expect(module.TemperatureHumidityChart).toBeDefined();
        });

        it('should export WateringVolumeChart', async () => {
            const module = await import('../../../components/charts');
            expect(module.WateringVolumeChart).toBeDefined();
        });

        it('should export RainfallChart', async () => {
            const module = await import('../../../components/charts');
            expect(module.RainfallChart).toBeDefined();
        });

        it('should export ChannelDistributionChart', async () => {
            const module = await import('../../../components/charts');
            expect(module.ChannelDistributionChart).toBeDefined();
        });

        it('should export TrendSparkline', async () => {
            const module = await import('../../../components/charts');
            expect(module.TrendSparkline).toBeDefined();
        });

        it('should export CombinedEnvChart', async () => {
            const module = await import('../../../components/charts');
            expect(module.CombinedEnvChart).toBeDefined();
        });
    });
});
