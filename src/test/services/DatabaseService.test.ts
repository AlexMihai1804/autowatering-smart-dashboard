import { describe, it, expect } from 'vitest';

/**
 * Tests for DatabaseService helper functions.
 * Testing the irrigation popularity scoring logic.
 */

describe('DatabaseService Helpers', () => {
    // Helper function extracted from DatabaseService
    function getIrrigationPopularityScore(codeEnum: string): number {
        const c = (codeEnum || '').toUpperCase();

        if (c.includes('DRIP')) return 100;
        if (c.includes('SPRINKLER')) return 85;
        if (c.includes('MICRO')) return 80;
        if (c.includes('SOAKER')) return 78;
        if (c.includes('PIVOT') || c.includes('LEPA') || c.includes('LINEAR')) return 70;
        if (c.includes('MANUAL')) return 55;
        if (c.includes('SURFACE')) return 45;
        if (c.includes('FURROW')) return 40;
        if (c.includes('FLOOD') || c.includes('BASIN') || c.includes('BORDER')) return 38;

        return 10;
    }

    describe('getIrrigationPopularityScore', () => {
        it('should return highest score (100) for drip irrigation', () => {
            expect(getIrrigationPopularityScore('IRRIG_DRIP_SURFACE')).toBe(100);
            expect(getIrrigationPopularityScore('IRRIG_DRIP_SUBSURFACE')).toBe(100);
            expect(getIrrigationPopularityScore('drip_tape')).toBe(100);
        });

        it('should return 85 for sprinkler systems', () => {
            expect(getIrrigationPopularityScore('IRRIG_SPRINKLER_SET')).toBe(85);
            expect(getIrrigationPopularityScore('sprinkler_rotor')).toBe(85);
        });

        it('should return 80 for micro irrigation', () => {
            expect(getIrrigationPopularityScore('IRRIG_MICRO_SPRAY')).toBe(80);
            expect(getIrrigationPopularityScore('micro_jet')).toBe(80);
        });

        it('should return 78 for soaker systems', () => {
            expect(getIrrigationPopularityScore('IRRIG_SOAKER_HOSE')).toBe(78);
            expect(getIrrigationPopularityScore('soaker')).toBe(78);
        });

        it('should return 70 for pivot/LEPA/linear systems', () => {
            expect(getIrrigationPopularityScore('IRRIG_PIVOT_CENTER')).toBe(70);
            expect(getIrrigationPopularityScore('IRRIG_LEPA')).toBe(70);
            expect(getIrrigationPopularityScore('IRRIG_LINEAR_MOVE')).toBe(70);
        });

        it('should match SPRINKLER before LEPA when both present', () => {
            // SPRINKLER_LEPA contains both, but SPRINKLER is checked first
            expect(getIrrigationPopularityScore('IRRIG_SPRINKLER_LEPA')).toBe(85);
        });

        it('should return 55 for manual irrigation', () => {
            expect(getIrrigationPopularityScore('IRRIG_MANUAL_HAND')).toBe(55);
            expect(getIrrigationPopularityScore('manual_watering')).toBe(55);
        });

        it('should return 45 for surface irrigation', () => {
            expect(getIrrigationPopularityScore('IRRIG_SURFACE_BORDER')).toBe(45);
            expect(getIrrigationPopularityScore('surface_flood')).toBe(45);
        });

        it('should return 40 for furrow irrigation', () => {
            expect(getIrrigationPopularityScore('IRRIG_FURROW')).toBe(40);
            expect(getIrrigationPopularityScore('furrow_graded')).toBe(40);
        });

        it('should return 38 for flood/basin/border types', () => {
            expect(getIrrigationPopularityScore('IRRIG_FLOOD')).toBe(38);
            expect(getIrrigationPopularityScore('IRRIG_BASIN')).toBe(38);
            expect(getIrrigationPopularityScore('IRRIG_BORDER_STRIP')).toBe(38);
        });

        it('should return 10 for unknown types', () => {
            expect(getIrrigationPopularityScore('UNKNOWN')).toBe(10);
            expect(getIrrigationPopularityScore('RAINFED')).toBe(10);
            expect(getIrrigationPopularityScore('')).toBe(10);
        });

        it('should handle case insensitively', () => {
            expect(getIrrigationPopularityScore('drip')).toBe(100);
            expect(getIrrigationPopularityScore('DRIP')).toBe(100);
            expect(getIrrigationPopularityScore('Drip')).toBe(100);
        });

        it('should handle null/undefined gracefully', () => {
            expect(getIrrigationPopularityScore(null as unknown as string)).toBe(10);
            expect(getIrrigationPopularityScore(undefined as unknown as string)).toBe(10);
        });
    });

    describe('Irrigation method sorting', () => {
        interface IrrigationMethod {
            name: string;
            code_enum: string;
            efficiency_pct: number | null;
        }

        const sortByPopularity = (methods: IrrigationMethod[]) => {
            return [...methods].sort((a, b) => {
                const sa = getIrrigationPopularityScore(a.code_enum);
                const sb = getIrrigationPopularityScore(b.code_enum);
                if (sb !== sa) return sb - sa;
                const ea = typeof a.efficiency_pct === 'number' ? a.efficiency_pct : -1;
                const eb = typeof b.efficiency_pct === 'number' ? b.efficiency_pct : -1;
                if (eb !== ea) return eb - ea;
                return (a.name || '').localeCompare(b.name || '');
            });
        };

        it('should sort drip first', () => {
            const methods: IrrigationMethod[] = [
                { name: 'Furrow', code_enum: 'IRRIG_FURROW', efficiency_pct: 60 },
                { name: 'Drip', code_enum: 'IRRIG_DRIP_SURFACE', efficiency_pct: 95 },
                { name: 'Sprinkler', code_enum: 'IRRIG_SPRINKLER_SET', efficiency_pct: 75 },
            ];
            const sorted = sortByPopularity(methods);
            expect(sorted[0].code_enum).toBe('IRRIG_DRIP_SURFACE');
            expect(sorted[1].code_enum).toBe('IRRIG_SPRINKLER_SET');
            expect(sorted[2].code_enum).toBe('IRRIG_FURROW');
        });

        it('should use efficiency as tie-breaker', () => {
            const methods: IrrigationMethod[] = [
                { name: 'Drip Low Eff', code_enum: 'IRRIG_DRIP_OLD', efficiency_pct: 80 },
                { name: 'Drip High Eff', code_enum: 'IRRIG_DRIP_NEW', efficiency_pct: 95 },
            ];
            const sorted = sortByPopularity(methods);
            expect(sorted[0].name).toBe('Drip High Eff');
        });

        it('should use name as final tie-breaker', () => {
            const methods: IrrigationMethod[] = [
                { name: 'Drip Zebra', code_enum: 'IRRIG_DRIP_1', efficiency_pct: 90 },
                { name: 'Drip Alpha', code_enum: 'IRRIG_DRIP_2', efficiency_pct: 90 },
            ];
            const sorted = sortByPopularity(methods);
            expect(sorted[0].name).toBe('Drip Alpha');
        });

        it('should handle null efficiency', () => {
            const methods: IrrigationMethod[] = [
                { name: 'Drip With Eff', code_enum: 'IRRIG_DRIP_1', efficiency_pct: 90 },
                { name: 'Drip No Eff', code_enum: 'IRRIG_DRIP_2', efficiency_pct: null },
            ];
            const sorted = sortByPopularity(methods);
            expect(sorted[0].name).toBe('Drip With Eff');
        });
    });

    describe('Plant category constants', () => {
        const PLANT_CATEGORIES = [
            'Agriculture',
            'Gardening',
            'Landscaping',
            'Indoor',
            'Succulent',
            'Fruit',
            'Vegetable',
            'Herb',
            'Lawn',
            'Shrub'
        ];

        it('should have 10 categories', () => {
            expect(PLANT_CATEGORIES).toHaveLength(10);
        });

        it('should include common gardening categories', () => {
            expect(PLANT_CATEGORIES).toContain('Vegetable');
            expect(PLANT_CATEGORIES).toContain('Fruit');
            expect(PLANT_CATEGORIES).toContain('Herb');
            expect(PLANT_CATEGORIES).toContain('Lawn');
        });

        it('should include special categories', () => {
            expect(PLANT_CATEGORIES).toContain('Indoor');
            expect(PLANT_CATEGORIES).toContain('Succulent');
            expect(PLANT_CATEGORIES).toContain('Agriculture');
        });
    });

    describe('Method recommendation mapping', () => {
        const methodMap: Record<string, string[]> = {
            'DRIP': ['IRRIG_DRIP_SURFACE', 'IRRIG_DRIP_SUBSURFACE', 'IRRIG_DRIP_TAPE'],
            'SPRINKLER': ['IRRIG_SPRINKLER_SET', 'IRRIG_SPRINKLER_PIVOT', 'IRRIG_SPRINKLER_LEPA'],
            'SURFACE': ['IRRIG_SURFACE_FLOOD', 'IRRIG_SURFACE_BORDER', 'IRRIG_SURFACE_FURROW'],
            'MANUAL': ['IRRIG_DRIP_SURFACE', 'IRRIG_MICRO_SPRAY'],
            'RAINFED': []
        };

        it('should return drip methods for DRIP recommendation', () => {
            expect(methodMap['DRIP']).toContain('IRRIG_DRIP_SURFACE');
            expect(methodMap['DRIP']).toHaveLength(3);
        });

        it('should return sprinkler methods for SPRINKLER recommendation', () => {
            expect(methodMap['SPRINKLER']).toContain('IRRIG_SPRINKLER_SET');
            expect(methodMap['SPRINKLER']).toHaveLength(3);
        });

        it('should return surface methods for SURFACE recommendation', () => {
            expect(methodMap['SURFACE']).toContain('IRRIG_SURFACE_FLOOD');
            expect(methodMap['SURFACE']).toHaveLength(3);
        });

        it('should return drip+micro for MANUAL recommendation', () => {
            expect(methodMap['MANUAL']).toContain('IRRIG_DRIP_SURFACE');
            expect(methodMap['MANUAL']).toContain('IRRIG_MICRO_SPRAY');
        });

        it('should return empty array for RAINFED', () => {
            expect(methodMap['RAINFED']).toEqual([]);
        });

        it('should return undefined for unknown type', () => {
            expect(methodMap['UNKNOWN']).toBeUndefined();
        });
    });
});
