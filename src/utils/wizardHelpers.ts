// ============================================================================
// Wizard Helper Functions
// Validation, formatting, and utility functions for the channel wizard
// ============================================================================

import type { UnifiedZoneConfig, WateringMode, ScheduleConfig } from '../types/wizard';

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate zone configuration completeness
 */
export function validateZoneConfig(config: UnifiedZoneConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Name is always required
    if (!config.name || config.name.trim().length === 0) {
        errors.push('Numele zonei este obligatoriu');
    }
    
    // Mode-specific validation
    if (config.wateringMode === 'fao56_auto' || config.wateringMode === 'fao56_eco') {
        if (!config.plant) {
            errors.push('Selectează o plantă');
        }
        if (!config.soil) {
            errors.push('Selectează un tip de sol');
        }
        if (!config.location) {
            errors.push('Selectează locația GPS');
        }
        if (config.coverageValue <= 0) {
            errors.push('Introdu suprafața/numărul de plante');
        }
    }
    
    if (config.wateringMode === 'duration' || config.wateringMode === 'volume') {
        if (!config.schedule.enabled) {
            errors.push('Activează programul');
        }
        if (config.schedule.value <= 0) {
            const label = config.wateringMode === 'duration' ? 'durata' : 'volumul';
            errors.push(`Introdu ${label} de irigare`);
        }
        if (config.schedule.type === 'auto') {
            errors.push('Alege program zilnic sau periodic pentru modurile manuale');
        }
    }
    
    return {
        valid: errors.length === 0,
        errors
    };
}
// ============================================================================
// Time & Date Helpers
// ============================================================================

/**
 * Format time from hour/minute to HH:MM string
 */
export function formatTime(hour: number, minute: number): string {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

/**
 * Get day abbreviations from bitmask
 */
export function getDaysFromMask(mask: number): string {
    const days: string[] = [];
    const dayNames = ['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sâ', 'Du'];
    
    for (let i = 0; i < 7; i++) {
        if (mask & (1 << i)) {
            days.push(dayNames[i]);
        }
    }
    
    if (days.length === 7) return 'Zilnic';
    if (days.length === 0) return 'Niciuna';
    
    // Check for weekdays only (Mon-Fri)
    if (mask === 0b0011111) return 'Zile lucrătoare';
    
    // Check for weekends only (Sat-Sun)
    if (mask === 0b1100000) return 'Weekend';
    
    return days.join(', ');
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} min`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

/**
 * Format volume for display
 */
export function formatVolume(liters: number): string {
    if (liters < 1) {
        return `${Math.round(liters * 1000)} ml`;
    }
    return `${liters.toFixed(1)} L`;
}

// ============================================================================
// Summary Text Generators
// ============================================================================

/**
 * Get mode display text
 */
export function getModeDisplayText(mode: WateringMode): string {
    const labels: Record<WateringMode, string> = {
        'fao56_auto': 'FAO-56 Auto',
        'fao56_eco': 'FAO-56 Eco',
        'duration': 'Timp',
        'volume': 'Volum'
    };
    return labels[mode];
}

/**
 * Generate zone summary for final review
 */
export function generateZoneSummary(config: UnifiedZoneConfig): string[] {
    const lines: string[] = [];
    
    lines.push(`Mod: ${getModeDisplayText(config.wateringMode)}`);
    
    if (config.wateringMode === 'fao56_auto' || config.wateringMode === 'fao56_eco') {
        if (config.plant) {
            lines.push(`Plantă: ${config.plant.common_name_en}`);
        }
        if (config.soil) {
            lines.push(`Sol: ${config.soil.texture}`);
        }
        if (config.irrigationMethod) {
            lines.push(`Irigație: ${config.irrigationMethod.name}`);
        }
        if (config.location) {
            lines.push(`Locație: ${config.location.latitude.toFixed(4)}, ${config.location.longitude.toFixed(4)}`);
        }
        const coverage = config.coverageType === 'area' 
            ? `${config.coverageValue} m²` 
            : `${config.coverageValue} plante`;
        lines.push(`Acoperire: ${coverage}`);
    }
    
    if (config.wateringMode === 'duration') {
        lines.push(`Durată: ${formatDuration(config.schedule.value)}`);
    }
    
    if (config.wateringMode === 'volume') {
        lines.push(`Volum: ${formatVolume(config.schedule.value)}`);
    }
    
    // Schedule summary
    if (config.schedule.enabled) {
        const time = formatTime(config.schedule.hour, config.schedule.minute);
        if (config.schedule.type === 'auto') {
            const solar = config.schedule.useSolarTiming 
                ? ` (solar ${config.schedule.solarEvent === 'sunrise' ? 'răsărit' : 'apus'} ${config.schedule.solarOffsetMinutes}min)`
                : '';
            lines.push(`Program: FAO-56 Smart la ${time}${solar}`);
        } else {
            const days = config.schedule.type === 'periodic'
                ? `la ${config.schedule.daysMask} zile`
                : getDaysFromMask(config.schedule.daysMask);
            const solar = config.schedule.useSolarTiming 
                ? ` (solar ${config.schedule.solarEvent === 'sunrise' ? 'răsărit' : 'apus'} ${config.schedule.solarOffsetMinutes}min)`
                : '';
            lines.push(`Program: ${time}, ${days}${solar}`);
        }
    }
    
    return lines;
}
// ============================================================================
// Bitmask Helpers
// ============================================================================

/**
 * Create days bitmask from individual day selections
 */
export function createDaysMask(days: {
    monday?: boolean;
    tuesday?: boolean;
    wednesday?: boolean;
    thursday?: boolean;
    friday?: boolean;
    saturday?: boolean;
    sunday?: boolean;
}): number {
    let mask = 0;
    if (days.monday) mask |= 0b0000001;
    if (days.tuesday) mask |= 0b0000010;
    if (days.wednesday) mask |= 0b0000100;
    if (days.thursday) mask |= 0b0001000;
    if (days.friday) mask |= 0b0010000;
    if (days.saturday) mask |= 0b0100000;
    if (days.sunday) mask |= 0b1000000;
    return mask;
}

/**
 * Parse days bitmask to individual day selections
 */
export function parseDaysMask(mask: number): {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
} {
    return {
        monday: !!(mask & 0b0000001),
        tuesday: !!(mask & 0b0000010),
        wednesday: !!(mask & 0b0000100),
        thursday: !!(mask & 0b0001000),
        friday: !!(mask & 0b0010000),
        saturday: !!(mask & 0b0100000),
        sunday: !!(mask & 0b1000000)
    };
}
