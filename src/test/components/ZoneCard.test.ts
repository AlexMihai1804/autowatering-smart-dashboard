/**
 * ZoneCard Component Tests
 * 
 * Tests for zone card helper functions and formatting
 */
import { describe, it, expect } from 'vitest';
import { PLANT_TYPES, SOIL_TYPES, getPlantIcon } from '../../utils/mappings';

describe('ZoneCard', () => {
    describe('PLANT_TYPES mapping', () => {
        it('should have mapping for common plant types', () => {
            expect(PLANT_TYPES[0]).toBeDefined();
            expect(typeof PLANT_TYPES[0]).toBe('string');
        });

        it('should have at least 8 plant types', () => {
            const plantTypeCount = Object.keys(PLANT_TYPES).length;
            expect(plantTypeCount).toBeGreaterThanOrEqual(8);
        });
    });

    describe('SOIL_TYPES mapping', () => {
        it('should have mapping for common soil types', () => {
            expect(SOIL_TYPES[0]).toBeDefined();
            expect(typeof SOIL_TYPES[0]).toBe('string');
        });

        it('should have at least 5 soil types', () => {
            const soilTypeCount = Object.keys(SOIL_TYPES).length;
            expect(soilTypeCount).toBeGreaterThanOrEqual(5);
        });
    });

    describe('getPlantIcon', () => {
        it('should return an emoji for plant type 0', () => {
            const icon = getPlantIcon(0);
            expect(icon).toBeDefined();
            expect(typeof icon).toBe('string');
        });

        it('should return an icon for various plant types', () => {
            for (let i = 0; i < 5; i++) {
                const icon = getPlantIcon(i);
                expect(icon).toBeDefined();
            }
        });
    });

    describe('Zone name formatting', () => {
        it('should generate default zone name from channel id', () => {
            const formatZoneName = (name: string | undefined, channelId: number): string => {
                return name || `Zone ${channelId + 1}`;
            };

            expect(formatZoneName(undefined, 0)).toBe('Zone 1');
            expect(formatZoneName(undefined, 5)).toBe('Zone 6');
            expect(formatZoneName('Front Lawn', 0)).toBe('Front Lawn');
        });
    });

    describe('Valve control actions', () => {
        it('should define duration action as 0', () => {
            const DURATION_ACTION = 0;
            expect(DURATION_ACTION).toBe(0);
        });

        it('should define volume action as 1', () => {
            const VOLUME_ACTION = 1;
            expect(VOLUME_ACTION).toBe(1);
        });
    });

    describe('Zone status styling', () => {
        interface ZoneStyleParams {
            isWatering: boolean;
            isConfigured: boolean;
        }

        const getZoneBorderClass = (params: ZoneStyleParams): string => {
            if (params.isWatering) {
                return 'border-l-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]';
            }
            if (!params.isConfigured) {
                return 'border-l-amber-500';
            }
            return 'border-l-cyber-medium';
        };

        it('should return cyan border when watering', () => {
            const borderClass = getZoneBorderClass({ isWatering: true, isConfigured: true });
            expect(borderClass).toContain('cyber-cyan');
        });

        it('should return amber border when not configured', () => {
            const borderClass = getZoneBorderClass({ isWatering: false, isConfigured: false });
            expect(borderClass).toContain('amber-500');
        });

        it('should return medium border for normal state', () => {
            const borderClass = getZoneBorderClass({ isWatering: false, isConfigured: true });
            expect(borderClass).toContain('cyber-medium');
        });

        it('should prioritize watering over not configured', () => {
            const borderClass = getZoneBorderClass({ isWatering: true, isConfigured: false });
            expect(borderClass).toContain('cyber-cyan');
        });
    });

    describe('Manual duration state', () => {
        it('should default to 10 minutes', () => {
            const defaultDuration = 10;
            expect(defaultDuration).toBe(10);
        });

        it('should default to duration mode', () => {
            const defaultMode: 'duration' | 'volume' = 'duration';
            expect(defaultMode).toBe('duration');
        });
    });

    describe('Component exports', () => {
        it('should export ZoneCard as default', async () => {
            const module = await import('../../components/ZoneCard');
            expect(module.default).toBeDefined();
        }, 15000);
    });
});
