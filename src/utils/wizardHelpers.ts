// ============================================================================
// Wizard Helper Functions
// Validation, formatting, and utility functions for the channel wizard
// ============================================================================

import type { UnifiedZoneConfig, WateringMode, ScheduleConfig } from '../types/wizard';
import { translations, DEFAULT_LANGUAGE, Language } from '../i18n/translations';

type Translator = (key: string) => string;

const resolveTranslation = (key: string, language: Language = DEFAULT_LANGUAGE): string => {
    const keys = key.split('.');
    let result: unknown = translations[language];

    for (const k of keys) {
        if (result && typeof result === 'object' && k in result) {
            result = (result as Record<string, unknown>)[k];
        } else {
            return key;
        }
    }

    return typeof result === 'string' ? result : key;
};

const getTranslator = (t?: Translator): Translator => t ?? ((key) => resolveTranslation(key));

// ============================================================================
// Validation Helpers
// ============================================================================

/**
 * Validate zone configuration completeness
 */
export function validateZoneConfig(config: UnifiedZoneConfig, t?: Translator): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const translate = getTranslator(t);
    
    // Name is always required
    if (!config.name || config.name.trim().length === 0) {
        errors.push(translate('wizard.validation.zoneNameRequired'));
    }
    
    // Mode-specific validation
    if (config.wateringMode === 'fao56_auto' || config.wateringMode === 'fao56_eco') {
        if (!config.plant) {
            errors.push(translate('wizard.validation.plantRequired'));
        }
        if (!config.soil) {
            errors.push(translate('wizard.validation.soilRequired'));
        }
        if (!config.location) {
            errors.push(translate('wizard.validation.locationRequired'));
        }
        if (config.coverageValue <= 0) {
            errors.push(translate('wizard.validation.coverageRequired'));
        }
    }
    
    if (config.wateringMode === 'duration' || config.wateringMode === 'volume') {
        if (!config.schedule.enabled) {
            errors.push(translate('wizard.validation.scheduleEnabled'));
        }
        if (config.schedule.value <= 0) {
            errors.push(
                config.wateringMode === 'duration'
                    ? translate('wizard.validation.durationRequired')
                    : translate('wizard.validation.volumeRequired')
            );
        }
        if (config.schedule.type === 'auto') {
            errors.push(translate('wizard.validation.manualScheduleType'));
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
export function getDaysFromMask(mask: number, t?: Translator): string {
    const days: string[] = [];
    const translate = getTranslator(t);
    const dayNames = [
        translate('wizard.schedule.days.mon'),
        translate('wizard.schedule.days.tue'),
        translate('wizard.schedule.days.wed'),
        translate('wizard.schedule.days.thu'),
        translate('wizard.schedule.days.fri'),
        translate('wizard.schedule.days.sat'),
        translate('wizard.schedule.days.sun'),
    ];
    
    for (let i = 0; i < 7; i++) {
        if (mask & (1 << i)) {
            days.push(dayNames[i]);
        }
    }
    
    if (days.length === 7) return translate('wizard.schedule.everyDay');
    if (days.length === 0) return translate('wizard.schedule.none');
    
    // Check for weekdays only (Mon-Fri)
    if (mask === 0b0011111) return translate('wizard.schedule.weekdays');
    
    // Check for weekends only (Sat-Sun)
    if (mask === 0b1100000) return translate('wizard.schedule.weekend');
    
    return days.join(', ');
}

/**
 * Format duration for display
 */
export function formatDuration(minutes: number, t?: Translator): string {
    const translate = getTranslator(t);
    const minutesShort = translate('common.minutesShort');
    const hoursShort = translate('common.hoursShort');
    if (minutes < 60) {
        return `${minutes} ${minutesShort}`;
    }
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}${hoursShort} ${m}${minutesShort}` : `${h}${hoursShort}`;
}

/**
 * Format volume for display
 */
export function formatVolume(liters: number, t?: Translator): string {
    const translate = getTranslator(t);
    const mlShort = translate('common.mlShort');
    const litersShort = translate('common.litersShort');
    if (liters < 1) {
        return `${Math.round(liters * 1000)} ${mlShort}`;
    }
    return `${liters.toFixed(1)} ${litersShort}`;
}

// ============================================================================
// Summary Text Generators
// ============================================================================

/**
 * Get mode display text
 */
export function getModeDisplayText(mode: WateringMode, t?: Translator): string {
    const translate = getTranslator(t);
    const labels: Record<WateringMode, string> = {
        'fao56_auto': 'wizard.modes.fao56Auto',
        'fao56_eco': 'wizard.modes.fao56Eco',
        'duration': 'wizard.modes.duration',
        'volume': 'wizard.modes.volume'
    };
    return translate(labels[mode]);
}

interface SummaryOptions {
    t?: Translator;
    language?: Language;
}

/**
 * Generate zone summary for final review
 */
export function generateZoneSummary(config: UnifiedZoneConfig, options: SummaryOptions = {}): string[] {
    const lines: string[] = [];
    const translate = getTranslator(options.t);
    const language = options.language ?? DEFAULT_LANGUAGE;
    const plantName = config.plant
        ? (language === 'ro' && config.plant.common_name_ro ? config.plant.common_name_ro : config.plant.common_name_en)
        : null;
    
    lines.push(`${translate('wizard.summary.mode')}: ${getModeDisplayText(config.wateringMode, translate)}`);
    
    if (config.wateringMode === 'fao56_auto' || config.wateringMode === 'fao56_eco') {
        if (plantName) {
            lines.push(`${translate('wizard.summary.plant')}: ${plantName}`);
        }
        if (config.soil) {
            lines.push(`${translate('wizard.summary.soil')}: ${config.soil.texture}`);
        }
        if (config.irrigationMethod) {
            lines.push(`${translate('wizard.summary.irrigation')}: ${config.irrigationMethod.name}`);
        }
        if (config.location) {
            lines.push(`${translate('wizard.summary.location')}: ${config.location.latitude.toFixed(4)}, ${config.location.longitude.toFixed(4)}`);
        }
        const coverage = config.coverageType === 'area'
            ? `${config.coverageValue} ${translate('common.squareMetersShort')}`
            : `${config.coverageValue} ${translate('wizard.plant.plantsLabel')}`;
        lines.push(`${translate('wizard.summary.coverage')}: ${coverage}`);
    }
    
    if (config.wateringMode === 'duration') {
        lines.push(`${translate('wizard.summary.duration')}: ${formatDuration(config.schedule.value, translate)}`);
    }
    
    if (config.wateringMode === 'volume') {
        lines.push(`${translate('wizard.summary.volume')}: ${formatVolume(config.schedule.value, translate)}`);
    }
    
    // Schedule summary
    if (config.schedule.enabled) {
        const time = formatTime(config.schedule.hour, config.schedule.minute);
        const solarSuffix = config.schedule.useSolarTiming
            ? translate('wizard.schedule.solarSuffix')
                .replace('{event}', config.schedule.solarEvent === 'sunrise' ? translate('wizard.schedule.sunrise') : translate('wizard.schedule.sunset'))
                .replace('{offset}', String(config.schedule.solarOffsetMinutes))
                .replace('{unit}', translate('common.minutesShort'))
            : '';
        if (config.schedule.type === 'auto') {
            const autoSummary = translate('wizard.schedule.summaryAuto')
                .replace('{mode}', translate('wizard.schedule.fao56Smart'))
                .replace('{time}', time)
                .replace('{solar}', solarSuffix);
            lines.push(`${translate('wizard.summary.schedule')}: ${autoSummary}`);
        } else {
            const days = config.schedule.type === 'periodic'
                ? translate('wizard.schedule.everyXDays').replace('{days}', String(config.schedule.daysMask))
                : getDaysFromMask(config.schedule.daysMask, translate);
            const scheduleSummary = translate('wizard.schedule.summaryManual')
                .replace('{time}', time)
                .replace('{days}', days)
                .replace('{solar}', solarSuffix);
            lines.push(`${translate('wizard.summary.schedule')}: ${scheduleSummary}`);
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
