/**
 * Zone Configuration Export/Import
 * 
 * 4.7: Save and restore zone configurations
 */

import { useState, useCallback } from 'react';
import type { UnifiedZoneConfig as ZoneConfig } from '../types/wizard';

const EXPORT_VERSION = '1.0';

export interface ExportData {
    version: string;
    exportDate: string;
    zones: ZoneConfig[];
    metadata?: {
        deviceName?: string;
        appVersion?: string;
    };
}

export const useConfigExport = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const exportConfig = useCallback(async (zones: ZoneConfig[], metadata?: ExportData['metadata']): Promise<string> => {
        setIsExporting(true);
        setError(null);
        
        try {
            const exportData: ExportData = {
                version: EXPORT_VERSION,
                exportDate: new Date().toISOString(),
                zones: zones.map(zone => ({
                    ...zone,
                    // Clean up any non-serializable data
                    plant: zone.plant ? { ...zone.plant } : null,
                    soil: zone.soil ? { ...zone.soil } : null,
                    irrigationMethod: zone.irrigationMethod ? { ...zone.irrigationMethod } : null,
                })),
                metadata,
            };
            
            const json = JSON.stringify(exportData, null, 2);
            
            // Create downloadable file
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `irrigation-config-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            return json;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Export failed';
            setError(message);
            throw e;
        } finally {
            setIsExporting(false);
        }
    }, []);
    
    const importConfig = useCallback(async (file: File): Promise<ZoneConfig[]> => {
        setIsImporting(true);
        setError(null);
        
        try {
            const text = await file.text();
            const data: ExportData = JSON.parse(text);
            
            // Validate version
            if (!data.version) {
                throw new Error('Invalid config file: missing version');
            }
            
            // Validate zones
            if (!Array.isArray(data.zones)) {
                throw new Error('Invalid config file: missing zones array');
            }
            
            // Basic validation of zone structure
            data.zones.forEach((zone, i) => {
                if (typeof zone.enabled !== 'boolean') {
                    throw new Error(`Invalid zone at index ${i}: missing enabled flag`);
                }
                if (typeof zone.name !== 'string') {
                    throw new Error(`Invalid zone at index ${i}: missing name`);
                }
            });
            
            console.log(`[ConfigExport] Imported ${data.zones.length} zones from ${data.exportDate}`);
            return data.zones;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Import failed';
            setError(message);
            throw e;
        } finally {
            setIsImporting(false);
        }
    }, []);
    
    const importFromString = useCallback(async (jsonString: string): Promise<ZoneConfig[]> => {
        setIsImporting(true);
        setError(null);
        
        try {
            const data: ExportData = JSON.parse(jsonString);
            
            if (!data.version || !Array.isArray(data.zones)) {
                throw new Error('Invalid config data');
            }
            
            return data.zones;
        } catch (e) {
            const message = e instanceof Error ? e.message : 'Import failed';
            setError(message);
            throw e;
        } finally {
            setIsImporting(false);
        }
    }, []);
    
    // Copy to clipboard
    const copyToClipboard = useCallback(async (zones: ZoneConfig[]): Promise<boolean> => {
        try {
            const exportData: ExportData = {
                version: EXPORT_VERSION,
                exportDate: new Date().toISOString(),
                zones,
            };
            
            await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
            return true;
        } catch (e) {
            console.error('[ConfigExport] Failed to copy to clipboard:', e);
            return false;
        }
    }, []);
    
    // Read from clipboard
    const readFromClipboard = useCallback(async (): Promise<ZoneConfig[] | null> => {
        try {
            const text = await navigator.clipboard.readText();
            const data: ExportData = JSON.parse(text);
            
            if (data.version && Array.isArray(data.zones)) {
                return data.zones;
            }
            return null;
        } catch (e) {
            console.error('[ConfigExport] Failed to read from clipboard:', e);
            return null;
        }
    }, []);
    
    return {
        exportConfig,
        importConfig,
        importFromString,
        copyToClipboard,
        readFromClipboard,
        isExporting,
        isImporting,
        error,
    };
};

export default useConfigExport;
