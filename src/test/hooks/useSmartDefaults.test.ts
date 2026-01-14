/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartDefaults, getCloneableProperties, getSuggestedZoneName } from '../../hooks/useSmartDefaults';
import type { UnifiedZoneConfig } from '../../types/wizard';

describe('useSmartDefaults', () => {
    describe('with no previous zones', () => {
        it('should return common defaults', () => {
            const { result } = renderHook(() => useSmartDefaults({
                currentZoneIndex: 0,
                zoneConfigs: [],
                detectedLocation: null,
                detectedSoil: null,
            }));

            expect(result.current.source).toBe('common_defaults');
            expect(result.current.coverageValue).toBe(10);
            expect(result.current.coverageType).toBe('area');
            expect(result.current.sunExposure).toBe(80);
        });

        it('should use detected location if available', () => {
            const location = { latitude: 45.0, longitude: 25.0 };
            const { result } = renderHook(() => useSmartDefaults({
                currentZoneIndex: 0,
                zoneConfigs: [],
                detectedLocation: location as any,
                detectedSoil: null,
            }));

            expect(result.current.location).toEqual(location);
        });
    });

    describe('with previous zones', () => {
        it('should inherit settings from previous zone', () => {
            const previousZone: Partial<UnifiedZoneConfig> = {
                enabled: true,
                plant: { common_name_en: 'Tomato' } as any,
                soil: { soil_type: 'Loam' } as any,
                location: { latitude: 45.0, longitude: 25.0 } as any,
                sunExposure: 70,
                enableCycleSoak: true,
            };

            const { result } = renderHook(() => useSmartDefaults({
                currentZoneIndex: 1,
                zoneConfigs: [previousZone as UnifiedZoneConfig],
                detectedLocation: null,
                detectedSoil: null,
            }));

            expect(result.current.source).toBe('previous_zone');
            expect(result.current.soil).toEqual(previousZone.soil);
            expect(result.current.location).toEqual(previousZone.location);
            expect(result.current.sunExposure).toBe(70);
            expect(result.current.enableCycleSoak).toBe(true);
            // Plant should NOT be inherited
            expect(result.current.plant).toBeNull();
        });
    });
});

describe('getCloneableProperties', () => {
    it('should return cloneable properties from a zone', () => {
        const sourceZone: Partial<UnifiedZoneConfig> = {
            location: { latitude: 45, longitude: 25 } as any,
            soil: { soil_type: 'Clay' } as any,
            sunExposure: 60,
            enableCycleSoak: true,
            cycleMinutes: 5,
            soakMinutes: 10,
        };

        const cloneable = getCloneableProperties(sourceZone as UnifiedZoneConfig);

        expect(cloneable.location).toEqual(sourceZone.location);
        expect(cloneable.soil).toEqual(sourceZone.soil);
        expect(cloneable.sunExposure).toBe(60);
        expect(cloneable.enableCycleSoak).toBe(true);
    });
});

describe('getSuggestedZoneName', () => {
    it('should return English zone names', () => {
        expect(getSuggestedZoneName(0, 'en')).toBe('Zone 1');
        expect(getSuggestedZoneName(2, 'en')).toBe('Zone 3');
    });

    it('should return Romanian zone names', () => {
        expect(getSuggestedZoneName(0, 'ro')).toBe('Zonă 1');
        expect(getSuggestedZoneName(2, 'ro')).toBe('Zonă 3');
    });

    it('should handle out of bounds gracefully', () => {
        expect(getSuggestedZoneName(100, 'en')).toBe('Zone 101');
    });
});
