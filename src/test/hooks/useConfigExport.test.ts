/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfigExport, ExportData } from '../../hooks/useConfigExport';
import type { UnifiedZoneConfig } from '../../types/wizard';

describe('useConfigExport', () => {
    const mockZones: Partial<UnifiedZoneConfig>[] = [
        {
            enabled: true,
            name: 'Zone 1',
            plant: { common_name_en: 'Tomato' } as any,
            soil: { soil_type: 'Loam' } as any
        },
        {
            enabled: false,
            name: 'Zone 2'
        }
    ];

    describe('exportConfig', () => {
        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('should export zones to JSON string', async () => {
            // First render the hook BEFORE mocking document methods
            // This allows React Testing Library to set up its container
            const { result } = renderHook(() => useConfigExport());

            // Now mock the DOM methods that exportConfig uses
            const mockLink = { href: '', download: '', click: vi.fn() };
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
                if (tagName === 'a') {
                    return mockLink as any;
                }
                return originalCreateElement(tagName);
            });
            vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
            vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
            vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
            vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => { });

            let exportedJson: string = '';
            await act(async () => {
                exportedJson = await result.current.exportConfig(mockZones as UnifiedZoneConfig[]);
            });

            const parsed = JSON.parse(exportedJson);
            expect(parsed.version).toBe('1.0');
            expect(parsed.zones.length).toBe(2);
            expect(parsed.exportDate).toBeDefined();
            expect(mockLink.click).toHaveBeenCalled();
        });
    });

    describe('importFromString', () => {
        it('should import valid JSON string', async () => {
            const { result } = renderHook(() => useConfigExport());

            const exportData: ExportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                zones: mockZones as UnifiedZoneConfig[]
            };

            let imported: UnifiedZoneConfig[] = [];
            await act(async () => {
                imported = await result.current.importFromString(JSON.stringify(exportData));
            });

            expect(imported.length).toBe(2);
            expect(imported[0].name).toBe('Zone 1');
        });

        it('should reject invalid JSON', async () => {
            const { result } = renderHook(() => useConfigExport());

            await expect(async () => {
                await act(async () => {
                    await result.current.importFromString('invalid json');
                });
            }).rejects.toThrow();

            expect(result.current.error).toBeDefined();
        });

        it('should reject missing version', async () => {
            const { result } = renderHook(() => useConfigExport());

            await expect(async () => {
                await act(async () => {
                    await result.current.importFromString(JSON.stringify({ zones: [] }));
                });
            }).rejects.toThrow('Invalid config data');
        });
    });
});

