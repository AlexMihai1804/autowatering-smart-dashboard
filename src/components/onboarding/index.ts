/**
 * Onboarding Components - Barrel Export
 * 
 * Smart onboarding components for FAO-56 zone configuration
 */

// Tooltip and Help Components
export { 
    WhatsThisTooltip, 
    WhatsThisInline, 
    LabelWithHelp 
} from './WhatsThisTooltip';

// Selection Components
export { SoilSelector } from './SoilSelector';
export { PlantSelector } from './PlantSelector';
export { IrrigationMethodSelector } from './IrrigationMethodSelector';
export { IrrigationMethodSelectorCompact } from './IrrigationMethodSelectorCompact';

// Configuration Components
export { CycleSoakConfig } from './CycleSoakConfig';
export { CycleSoakAuto } from './CycleSoakAuto';
export { MaxVolumeConfig } from './MaxVolumeConfig';

// Re-export types for convenience
export type { 
    PlantCategoryId,
    PlantCategoryInfo,
    IrrigationMethodVisual,
} from '../../utils/onboardingHelpers';
