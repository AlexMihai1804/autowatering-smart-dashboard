import React, { useState, useMemo, useEffect } from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonSearchbar,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonInput,
    IonRange,
    IonToggle,
    IonSelect,
    IonSelectOption,
    IonChip,
    IonProgressBar,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonNote,
    IonSpinner,
    IonAlert,
    IonDatetime,
    IonPopover,
    IonBadge
} from '@ionic/react';
import {
    close,
    checkmarkCircle,
    chevronForward,
    chevronBack,
    leafOutline,
    waterOutline,
    sunnyOutline,
    settingsOutline,
    timeOutline,
    cloudOutline,
    flashOutline,
    layersOutline,
    gitBranchOutline,
    appsOutline,
    timerOutline,
    speedometerOutline,
    locationOutline,
    calendarOutline,
    checkmarkCircleOutline,
    warningOutline,
    alertCircleOutline,
    rainyOutline,
    thermometerOutline,
    pauseCircleOutline,
    copyOutline
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry, PLANT_CATEGORIES, PlantCategory } from '../services/DatabaseService';
import { 
    ChannelConfigData, 
    ScheduleConfigData, 
    GrowingEnvData, 
    AutoMode, 
    ScheduleType as FirmwareScheduleType, 
    WateringMode as FirmwareWateringMode,
    CHANNEL_FLAG,
    CHANNEL_EXT_FLAG,
    SYSTEM_FLAG,
    hasChannelFlag,
    hasChannelExtFlag,
    hasSystemFlag,
    hasSchedule,
    isChannelFao56Complete,
    isChannelFao56Ready,
    isChannelConfigComplete,
    hasAnyConfiguredChannel
} from '../types/firmware_structs';
import { LocationPicker } from './LocationPicker';
import { TimePicker } from './TimePicker';
import { LocationData } from '../types/wizard';
// New onboarding components
import {
    IrrigationMethodSelectorCompact,
    PlantSelector,
    CycleSoakAuto,
    MaxVolumeConfig,
    WhatsThisTooltip
} from './onboarding';
import { SoilSelector } from './onboarding/SoilSelectorSimple';
import { SoilGridsService, SoilGridsResult, shouldEnableCycleSoak, calculateCycleSoakTiming } from '../services/SoilGridsService';
import { WIZARD_TOOLTIPS } from '../utils/onboardingHelpers';
// i18n and enhancements
import { useI18n } from '../i18n';
import { LanguageSelector } from './LanguageSelector';
import { 
    useKeyboardNavigation,
    ValidationFeedback,
    zoneNameRules,
    useValidation,
    SkipStepButton,
    SkeletonCard,
    HelpTooltip,
    HELP_CONTENT,
} from './onboarding/WizardEnhancements';

// ============================================================================
// Types
// ============================================================================

type WateringModeType = 'fao56_auto' | 'fao56_eco' | 'duration' | 'volume';

interface ZoneConfig {
    channel_id: number;
    name: string;
    enabled: boolean;
    // Watering mode selection (NEW)
    wateringMode: WateringModeType;
    // FAO-56 fields
    plant: PlantDBEntry | null;
    soil: SoilDBEntry | null;
    irrigationMethod: IrrigationMethodEntry | null;
    coverageType: 'area' | 'plants';
    coverageValue: number;
    sunExposure: number;  // 0-100%
    location: LocationData | null;
    plantingDate: Date | null;
    // Soil auto-detection (NEW)
    soilAutoDetected: boolean;
    soilDetectionConfidence: number | null;
    // Custom Soil from SoilGrids detection
    customSoilFromDetection: {
        enabled: boolean;
        clay: number;
        sand: number;
        silt: number;
        field_capacity: number;
        wilting_point: number;
        infiltration_rate: number;
        bulk_density: number;
        organic_matter: number;
        name: string;
    } | null;
    // Cycle & Soak (for slow-draining soils) - with timing settings
    enableCycleSoak: boolean;
    cycleSoakAutoEnabled: boolean;  // NEW: auto-enabled based on soil
    cycleSoakWateringMin: number;  // Watering phase duration (minutes)
    cycleSoakPauseMin: number;     // Pause/soak phase duration (minutes)
    maxVolumeLimit: number;        // Max volume per watering session (L)
    // Rain compensation (per-channel, TIME/VOLUME modes only)
    rainCompEnabled: boolean;
    rainCompSensitivity: number;   // 0-100%
    rainCompSkipThreshold: number; // mm - skip watering if rain exceeds this
    rainCompLookbackHours: number; // hours to look back
    // Temperature compensation (per-channel, TIME/VOLUME modes only)
    tempCompEnabled: boolean;
    tempCompBaseTemp: number;      // Base temperature (°C)
    tempCompSensitivity: number;   // 0-100%
    // Simple mode fields
    durationMinutes: number;
    volumeLiters: number;
}

interface ScheduleConfig {
    channel_id: number;
    enabled: boolean;
    scheduleType: 'daily' | 'periodic' | 'auto';
    daysMask: number;  // Bitmask for days (0=Sun, 1=Mon, etc.) or interval days
    hour: number;
    minute: number;
    wateringMode: 'duration' | 'volume';
    value: number;  // Minutes or Liters
    autoCalcEnabled: boolean;
    useSolarTiming: boolean;
    solarEvent: 'sunrise' | 'sunset';
    solarOffsetMinutes: number;
}

interface SystemSetup {
    masterValveEnabled: boolean;
    masterValvePreDelay: number;
    masterValvePostDelay: number;
    // Rain sensor hardware config (global)
    rainSensorEnabled: boolean;
    rainMmPerPulse: number;
    // Power and flow (global)
    powerMode: number;
    flowCalibration: number;
}

interface OnboardingWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

// ============================================================================
// Main Component
// ============================================================================

const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ isOpen, onClose }) => {
    const { systemConfig, rainConfig, zones, onboardingState } = useAppStore();
    const { plantDb, soilDb, irrigationMethodDb } = useAppStore();
    const bleService = BleService.getInstance();

    // ========================================================================
    // State
    // ========================================================================
    
    // Current phase (0=welcome, 1=system, 2=zones, 3=schedules, 4=complete)
    const [phase, setPhase] = useState(0);
    
    // Phase 1: System Config (global settings only - compensations are per-channel)
    const [systemSetup, setSystemSetup] = useState<SystemSetup>({
        masterValveEnabled: false,
        masterValvePreDelay: 0,
        masterValvePostDelay: 0,
        rainSensorEnabled: false,
        rainMmPerPulse: 0.25,
        powerMode: 0,
        flowCalibration: 750
    });

    // Phase 2: Zone Configs (includes per-channel compensation settings)
    const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>(() => 
        Array.from({ length: 8 }, (_, i) => ({
            channel_id: i,
            name: zones[i]?.name || `Zone ${i + 1}`,
            enabled: true, // Enable all 8 zones by default
            wateringMode: 'fao56_auto' as WateringModeType,
            plant: null,
            soil: null,
            irrigationMethod: null,
            coverageType: 'area',
            coverageValue: 10,
            sunExposure: 80,
            location: null,
            plantingDate: null,
            // NEW: Soil auto-detection
            soilAutoDetected: false,
            soilDetectionConfidence: null,
            customSoilFromDetection: null, // NEW: Custom soil from GPS detection
            // Cycle & Soak settings
            enableCycleSoak: false,
            cycleSoakAutoEnabled: false,  // NEW: auto-enabled based on soil
            cycleSoakWateringMin: 5,   // 5 min watering
            cycleSoakPauseMin: 10,     // 10 min pause/soak
            maxVolumeLimit: 50,        // 50L max per session
            // Per-channel Rain Compensation (for TIME/VOLUME modes)
            rainCompEnabled: false,
            rainCompSensitivity: 50,   // 50%
            rainCompSkipThreshold: 5,  // 5mm
            rainCompLookbackHours: 24, // 24 hours
            // Per-channel Temperature Compensation (for TIME/VOLUME modes)
            tempCompEnabled: false,
            tempCompBaseTemp: 20,      // 20°C
            tempCompSensitivity: 50,   // 50%
            // Simple mode fields
            durationMinutes: 15,
            volumeLiters: 10
        }))
    );
    
    // Phase 2 sub-step:
    // FAO-56 modes: 0=mode, 1=plant, 2=soil&irrigation, 3=coverage&sun, 4=location&date, 5=schedule
    // Duration/Volume: 0=mode, 1=settings, 5=schedule
    const [zoneSubStep, setZoneSubStep] = useState(0);
    
    // NEW: Zone Grid Selection State
    const [showZoneGrid, setShowZoneGrid] = useState(true);
    const [showCopyPopover, setShowCopyPopover] = useState(false);
    const [isTestingValve, setIsTestingValve] = useState(false);

    // Date picker modal state
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Phase 3: Schedule Configs
    const [scheduleConfigs, setScheduleConfigs] = useState<ScheduleConfig[]>(() =>
        Array.from({ length: 8 }, (_, i) => ({
            channel_id: i,
            enabled: true,
            scheduleType: 'auto',
            daysMask: 0b1111111, // default all days; ignored for auto
            hour: 6,
            minute: 0,
            wateringMode: 'duration',
            value: 15,
            autoCalcEnabled: true,
            useSolarTiming: true,  // Default ON for FAO-56 Auto
            solarEvent: 'sunrise',
            solarOffsetMinutes: 0
        }))
    );

    useEffect(() => {
        setScheduleConfigs(prev => prev.map((sched, idx) => {
            const mode = zoneConfigs[idx]?.wateringMode;
            const isFao = mode === 'fao56_auto' || mode === 'fao56_eco';
            if (isFao && sched.scheduleType !== 'auto') {
                // FAO-56: Auto schedule + Solar Time ON by default
                return { ...sched, scheduleType: 'auto', useSolarTiming: true };
            }
            if (!isFao && sched.scheduleType === 'auto') {
                return { ...sched, scheduleType: 'daily' };
            }
            return sched;
        }));
    }, [zoneConfigs]);

    // UI State
    const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all');
    const [saving, setSaving] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [showZoneCompleteAlert, setShowZoneCompleteAlert] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);  // 1.4: Exit confirmation
    const [showScheduleOptions, setShowScheduleOptions] = useState(false);
    
    // Soil detection state
    const [soilDetectionResult, setSoilDetectionResult] = useState<SoilGridsResult | null>(null);
    const [isDetectingSoil, setIsDetectingSoil] = useState(false);
    
    // i18n - 4.1
    const { t, language } = useI18n();
    
    // Zone name validation - 3.1
    const zoneNameValidation = useValidation(zoneNameRules);

    // ========================================================================
    // Initialize from device data
    // ========================================================================
    
    useEffect(() => {
        if (systemConfig) {
            setSystemSetup(prev => ({
                ...prev,
                masterValveEnabled: systemConfig.master_valve?.enabled || false,
                masterValvePreDelay: systemConfig.master_valve?.pre_delay || 0,
                masterValvePostDelay: systemConfig.master_valve?.post_delay || 0,
                powerMode: systemConfig.power_mode || 0,
                flowCalibration: systemConfig.flow_calibration || 750
            }));
        }
        if (rainConfig) {
            setSystemSetup(prev => ({
                ...prev,
                rainSensorEnabled: rainConfig.sensor_enabled || false,
                rainMmPerPulse: rainConfig.mm_per_pulse || 0.25,
                rainSkipThreshold: rainConfig.skip_threshold_mm || 5.0
            }));
        }
    }, [systemConfig, rainConfig]);

    // ========================================================================
    // Onboarding Flag Helpers - Determine what needs configuration
    // ========================================================================
    
    /**
     * Check if system setup phase should be skipped (all system flags set)
     */
    const isSystemSetupComplete = useMemo(() => {
        if (!onboardingState) return false;
        const flags = onboardingState.system_config_flags;
        return hasSystemFlag(flags, SYSTEM_FLAG.MASTER_VALVE) &&
               hasSystemFlag(flags, SYSTEM_FLAG.RAIN_SENSOR) &&
               hasSystemFlag(flags, SYSTEM_FLAG.POWER_MODE) &&
               hasSystemFlag(flags, SYSTEM_FLAG.FLOW_CALIBRATION);
    }, [onboardingState]);

    /**
     * Check what's configured for a specific channel
     * Includes both basic flags and extended flags from firmware
     */
    const getChannelStatus = (channelIndex: number) => {
        if (!onboardingState) {
            return {
                // Basic flags
                hasPlant: false,
                hasSoil: false,
                hasIrrigation: false,
                hasCoverage: false,
                hasSunExposure: false,
                hasName: false,
                hasWaterFactor: false,
                isEnabled: false,
                hasSchedule: false,
                isFao56Complete: false,
                // Extended flags (auto-set by firmware)
                isFao56Ready: false,
                hasRainComp: false,
                hasTempComp: false,
                hasConfigComplete: false,
                hasLatitude: false,
                hasVolumeLimit: false,
                hasPlantingDate: false,
                hasCycleSoak: false
            };
        }
        const flags = onboardingState.channel_config_flags;
        const extFlags = onboardingState.channel_extended_flags || BigInt(0);
        return {
            // Basic flags
            hasPlant: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.PLANT_TYPE),
            hasSoil: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.SOIL_TYPE),
            hasIrrigation: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.IRRIGATION_METHOD),
            hasCoverage: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.COVERAGE),
            hasSunExposure: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.SUN_EXPOSURE),
            hasName: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.NAME),
            hasWaterFactor: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.WATER_FACTOR),
            isEnabled: hasChannelFlag(flags, channelIndex, CHANNEL_FLAG.ENABLED),
            hasSchedule: hasSchedule(onboardingState.schedule_config_flags, channelIndex),
            isFao56Complete: isChannelFao56Complete(flags, channelIndex),
            // Extended flags (auto-set by firmware when conditions met)
            isFao56Ready: isChannelFao56Ready(extFlags, channelIndex),
            hasRainComp: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.RAIN_COMP),
            hasTempComp: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.TEMP_COMP),
            hasConfigComplete: isChannelConfigComplete(extFlags, channelIndex),
            hasLatitude: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.LATITUDE),
            hasVolumeLimit: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.VOLUME_LIMIT),
            hasPlantingDate: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.PLANTING_DATE),
            hasCycleSoak: hasChannelExtFlag(extFlags, channelIndex, CHANNEL_EXT_FLAG.CYCLE_SOAK)
        };
    };

    /**
     * Determine the next unconfigured sub-step for FAO-56 mode
     * Returns the sub-step to navigate to, or null if all complete
     */
    const getNextFao56SubStep = (channelIndex: number, currentSubStep: number): number | null => {
        const status = getChannelStatus(channelIndex);
        
        // Check each step in order, starting from current
        if (currentSubStep <= 1 && !status.hasPlant) return 1;       // Plant selection
        if (currentSubStep <= 2 && (!status.hasSoil || !status.hasIrrigation)) return 2; // Soil & Irrigation
        if (currentSubStep <= 3 && (!status.hasCoverage || !status.hasSunExposure)) return 3; // Coverage & Sun
        if (currentSubStep <= 4) return 4;  // Location always shown (location flag not in channel flags)
        if (currentSubStep <= 5) return 5;  // Summary always shown
        if (currentSubStep <= 6 && !status.hasSchedule) return 6;   // Schedule
        
        return null; // All complete
    };

    /**
     * Determine the next unconfigured sub-step for Duration/Volume mode
     * Returns the sub-step to navigate to, or null if all complete
     */
    const getNextSimpleSubStep = (channelIndex: number, currentSubStep: number): number | null => {
        const status = getChannelStatus(channelIndex);
        
        if (currentSubStep <= 1 && !status.hasWaterFactor) return 1;  // Duration/Volume settings
        if (currentSubStep <= 5) return 5;  // Summary always shown
        if (currentSubStep <= 6 && !status.hasSchedule) return 6;    // Schedule
        
        return null; // All complete
    };

    /**
     * Check if a channel is fully configured and can be skipped
     */
    const isChannelComplete = (channelIndex: number): boolean => {
        const status = getChannelStatus(channelIndex);
        const zone = zoneConfigs[channelIndex];
        const isFao56 = zone?.wateringMode === 'fao56_auto' || zone?.wateringMode === 'fao56_eco';
        
        // If firmware exposes CONFIG_COMPLETE, trust that first
        if (status.hasConfigComplete) return true;

        if (isFao56) {
            return status.isFao56Complete && status.hasSchedule;
        } else {
            return status.hasWaterFactor && status.hasSchedule;
        }
    };

    /**
     * Check if at least one channel has been configured (plant + soil + irrigation + coverage)
     * Uses the imported hasAnyConfiguredChannel from firmware_structs
     */
    const hasAnyChannelConfiguredFlag = useMemo(() => {
        if (!onboardingState) return false;
        return hasAnyConfiguredChannel(onboardingState.channel_config_flags);
    }, [onboardingState]);

    /**
     * Check if ANY configuration exists (system or channel)
     * Used to show "Continue" vs "Get Started"
     */
    const hasAnyConfiguration = useMemo(() => {
        if (!onboardingState) return false;
        
        // Check system flags - any of them set?
        const sysFlags = onboardingState.system_config_flags;
        const hasAnySystemConfig = sysFlags !== 0;
        
        // Check channel flags - any bit set?
        const chanFlags = onboardingState.channel_config_flags;
        const hasAnyChannelConfig = chanFlags !== BigInt(0);
        
        // Check schedule flags
        const schedFlags = onboardingState.schedule_config_flags;
        const hasAnySchedule = schedFlags !== 0;
        
        return hasAnySystemConfig || hasAnyChannelConfig || hasAnySchedule;
    }, [onboardingState]);

    /**
     * Find the first channel that needs configuration
     */
    const findFirstIncompleteChannel = (): number => {
        for (let i = 0; i < 8; i++) {
            if (!isChannelComplete(i)) {
                return i;
            }
        }
        return 0; // All complete, start from beginning
    };

    // ========================================================================
    // Plant filtering
    // ========================================================================
    
    const filteredPlants = useMemo(() => {
        let plants = plantDb;
        
        if (selectedCategory !== 'all') {
            plants = plants.filter(p => p.category === selectedCategory);
        }
        
        if (searchText) {
            const query = searchText.toLowerCase();
            plants = plants.filter(p =>
                p.common_name_en.toLowerCase().includes(query) ||
                p.common_name_ro.toLowerCase().includes(query) ||
                p.scientific_name.toLowerCase().includes(query)
            );
        }
        
        return plants; // Show all plants
    }, [plantDb, selectedCategory, searchText]);

    // ========================================================================
    // Zone counting for progress
    // ========================================================================
    
    const enabledZonesCount = zoneConfigs.filter(z => z.enabled).length;
    const currentEnabledIndex = zoneConfigs.slice(0, currentZoneIndex + 1).filter(z => z.enabled).length;

    // ========================================================================
    // Progress calculation
    // ========================================================================
    
    // 1.3 Fix: FAO-56 has 7 sub-steps, manual mode has 3
    const currentZoneMode = zoneConfigs[currentZoneIndex]?.wateringMode;
    const isFao56Progress = currentZoneMode === 'fao56_auto' || currentZoneMode === 'fao56_eco';
    const stepsPerZone = isFao56Progress ? 7 : 3;
    
    const progress = useMemo(() => {
        if (phase === 0) return 0;
        if (phase === 1) return 0.1;
        if (phase === 2) {
            // Progress from 0.1 to 0.95
            const totalSteps = Math.max(enabledZonesCount * stepsPerZone, 1);
            const completedSteps = Math.max((currentEnabledIndex - 1) * stepsPerZone + zoneSubStep, 0);
            return 0.1 + (completedSteps / totalSteps) * 0.85;
        }
        if (phase === 4) return 1;
        return 0;
    }, [phase, zoneSubStep, enabledZonesCount, currentEnabledIndex, stepsPerZone]);

    // ========================================================================
    // Save handlers
    // ========================================================================
    
    const handleTimeSync = async () => {
        setSaving(true);
        try {
            const now = new Date();
            const offset = now.getTimezoneOffset() * -1;
            const isDst = false;
            
            await bleService.writeRtcConfig(now, offset, isDst);
            setSyncStatus('success');
            setTimeout(() => setPhase(1), 1000);
        } catch (error) {
            console.error('[Wizard] Time sync failed:', error);
            setSyncStatus('error');
        } finally {
            setSaving(false);
        }
    };

    const saveSystemConfig = async () => {
        setSaving(true);
        try {
            // Save System Config (global settings only)
            // Note: Rain/Temp compensation is now per-channel via Growing Environment
            await bleService.writeSystemConfigObject({
                power_mode: systemSetup.powerMode,
                flow_calibration: systemSetup.flowCalibration,
                master_valve: {
                    enabled: systemSetup.masterValveEnabled,
                    pre_delay: systemSetup.masterValvePreDelay,
                    post_delay: systemSetup.masterValvePostDelay,
                    overlap_grace: 0,
                    auto_management: true,
                    current_state: false
                },
                bme280: systemConfig?.bme280 || { enabled: true, measurement_interval: 60, status: 0 },
                // Compensation fields are RESERVED in system config (per-channel only via char #27)
                // These values are ignored by firmware v2.x
                compensation: {
                    _reserved_rain_enabled: false,  // RESERVED - use Channel Compensation Config
                    temp_enabled: true,  // BME280 enable, not temp compensation
                    _reserved_rain_sensitivity: 0,  // RESERVED - ignored
                    temp_sensitivity: 0.5,  // Reserved/ignored
                    _reserved_rain_lookback_hours: 0,  // RESERVED - ignored
                    _reserved_rain_skip_threshold: 0,  // RESERVED - ignored
                    temp_base_temperature: 20  // Reserved/ignored
                }
            });

            // Save Rain Sensor Hardware Config if enabled
            if (systemSetup.rainSensorEnabled) {
                await bleService.writeRainConfig({
                    mm_per_pulse: systemSetup.rainMmPerPulse,
                    debounce_ms: 50,
                    sensor_enabled: true,
                    integration_enabled: true,
                    rain_sensitivity_pct: 0.5,  // Default - per-channel settings apply later
                    skip_threshold_mm: 5.0  // Default - per-channel settings apply later
                });
            }

            console.log('[Wizard] System config saved');
            // Move to zone config, find first enabled zone
            setCurrentZoneIndex(0);
            setPhase(2);
        } catch (error) {
            console.error('[Wizard] Failed to save system config:', error);
        } finally {
            setSaving(false);
        }
    };

    // Helper: retry BLE write with delay
    const retryBleWrite = async <T,>(
        operation: () => Promise<T>, 
        name: string, 
        maxRetries: number = 3, 
        delayMs: number = 500
    ): Promise<{ success: boolean; error?: Error }> => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await operation();
                return { success: true };
            } catch (error) {
                console.warn(`[Wizard] ${name} attempt ${attempt}/${maxRetries} failed:`, error);
                if (attempt < maxRetries) {
                    await new Promise(r => setTimeout(r, delayMs * attempt)); // Increasing delay
                } else {
                    return { success: false, error: error as Error };
                }
            }
        }
        return { success: false };
    };

    const saveZoneConfig = async (zoneIndex: number) => {
        const zone = zoneConfigs[zoneIndex];
        if (!zone.enabled) return;

        setSaving(true);
        const errors: string[] = [];
        
        try {
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            const irrigationId = Math.min(zone.irrigationMethod?.id ?? 0, 5); // clamp per docs (0-5)
            
            // 1. Save Channel Config (basic 76B struct) with retry
            // NOTE: plant_type/soil_type/irrigation_method are LEGACY fields (0-7 enum, NOT db indices!)
            // Real db indices go in Growing Environment. For ChannelConfig, use 0 as placeholder.
            const config: ChannelConfigData = {
                channel_id: zone.channel_id,
                name_len: zone.name.length,
                name: zone.name,
                auto_enabled: isFao56,
                plant_type: 0,  // Legacy field - actual plant is in GrowingEnv.plant_db_index
                soil_type: 0,   // Legacy field - actual soil is in GrowingEnv.soil_db_index  
                irrigation_method: Math.min(irrigationId, 5), // Clamp to 0-5
                coverage_type: zone.coverageType === 'area' ? 0 : 1,
                coverage: zone.coverageType === 'area' 
                    ? { area_m2: zone.coverageValue }
                    : { plant_count: zone.coverageValue },
                sun_percentage: zone.sunExposure
            };
            
            const configResult = await retryBleWrite(
                () => bleService.writeChannelConfigObject(config),
                'writeChannelConfig'
            );
            if (!configResult.success) {
                errors.push('Channel config');
            }
            
            // Small delay between BLE writes
            await new Promise(r => setTimeout(r, 200));
            
            // 2. Save Growing Environment (71B struct) with retry
            console.log(`[Wizard] Zone ${zoneIndex} GrowingEnv: cycle_soak=${zone.enableCycleSoak}, ` +
                        `soil_id=${zone.soil?.id}, soil_infiltration=${zone.soil?.infiltration_rate_mm_h}mm/h`);
            const growingEnv: GrowingEnvData = {
                channel_id: zone.channel_id,
                plant_db_index: zone.plant?.id || 0,
                soil_db_index: zone.soil?.id || 0,
                irrigation_method_index: irrigationId,
                use_area_based: zone.coverageType === 'area',
                coverage: zone.coverageType === 'area'
                    ? { area_m2: zone.coverageValue }
                    : { plant_count: zone.coverageValue },
                auto_mode: isFao56 
                    ? (zone.wateringMode === 'fao56_eco' ? 2 : 1)
                    : AutoMode.DISABLED,
                latitude_deg: zone.location?.latitude || 45.0,
                sun_exposure_pct: zone.sunExposure,
                planting_date_unix: zone.plantingDate 
                    ? Math.floor(zone.plantingDate.getTime() / 1000)
                    : Math.floor(Date.now() / 1000),
                max_volume_limit_l: zone.maxVolumeLimit,
                water_need_factor: zone.wateringMode === 'fao56_eco' ? 0.7 : 1.0,
                enable_cycle_soak: zone.enableCycleSoak,
                days_after_planting: 0,
                plant_type: zone.plant?.id || 0,
                specific_plant: 0,
                soil_type: zone.soil?.id || 0,
                irrigation_method: zone.irrigationMethod?.id || 7,
                sun_percentage: zone.sunExposure,
                custom_name: zone.name,
                irrigation_freq_days: 2,
                prefer_area_based: zone.coverageType === 'area'
            };
            
            const envResult = await retryBleWrite(
                () => bleService.writeGrowingEnvironment(growingEnv),
                'writeGrowingEnvironment'
            );
            if (!envResult.success) {
                errors.push('Growing environment');
            }
            
            // 3. Save Custom Soil if detected from GPS (uses exact parameters from pedotransfer functions)
            if (zone.customSoilFromDetection?.enabled) {
                console.log('[Wizard] Saving custom soil from GPS detection:', zone.customSoilFromDetection);
                await new Promise(r => setTimeout(r, 200));
                
                try {
                    await bleService.createCustomSoilConfig({
                        channel_id: zone.channel_id,
                        name: zone.customSoilFromDetection.name,
                        field_capacity: zone.customSoilFromDetection.field_capacity,
                        wilting_point: zone.customSoilFromDetection.wilting_point,
                        infiltration_rate: zone.customSoilFromDetection.infiltration_rate,
                        bulk_density: zone.customSoilFromDetection.bulk_density,
                        organic_matter: zone.customSoilFromDetection.organic_matter
                    });
                    console.log(`[Wizard] Custom soil saved for channel ${zone.channel_id}`);
                } catch (customSoilErr) {
                    console.warn('[Wizard] Failed to save custom soil:', customSoilErr);
                    errors.push('Custom soil');
                }
            }
            
            if (errors.length > 0) {
                console.warn(`[Wizard] Zone ${zoneIndex} partial save - failed: ${errors.join(', ')}`);
            } else {
                console.log(`[Wizard] Zone ${zoneIndex} config saved (mode: ${zone.wateringMode}, cycle_soak: ${zone.enableCycleSoak})`);
            }
        } catch (error) {
            console.error(`[Wizard] Failed to save zone ${zoneIndex}:`, error);
        } finally {
            setSaving(false);
        }
    };

    const saveScheduleConfig = async (zoneIndex: number) => {
        const schedule = scheduleConfigs[zoneIndex];
        const zone = zoneConfigs[zoneIndex];
        if (!schedule.enabled) return;

        setSaving(true);
        try {
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            const normalizedScheduleType = !isFao56 && schedule.scheduleType === 'auto' ? 'daily' : schedule.scheduleType;
            
            // Determine watering mode and value based on zone mode
            let wateringMode: FirmwareWateringMode;
            let value: number;
            
            if (isFao56) {
                wateringMode = FirmwareWateringMode.DURATION_MINUTES;
                value = 0; // ignored in AUTO schedule
            } else if (zone.wateringMode === 'duration') {
                wateringMode = FirmwareWateringMode.DURATION_MINUTES;
                value = zone.durationMinutes;
            } else {
                wateringMode = FirmwareWateringMode.VOLUME_LITERS;
                value = zone.volumeLiters;
            }

            const scheduleType = isFao56 || normalizedScheduleType === 'auto'
                ? FirmwareScheduleType.AUTO
                : normalizedScheduleType === 'daily'
                    ? FirmwareScheduleType.DAILY
                    : FirmwareScheduleType.PERIODIC;
            const daysMask = scheduleType === FirmwareScheduleType.AUTO
                ? 0x7f
                : Math.max(1, schedule.daysMask || 1);
            
            const config: ScheduleConfigData = {
                channel_id: schedule.channel_id,
                schedule_type: scheduleType,
                days_mask: daysMask,
                hour: schedule.hour,
                minute: schedule.minute,
                watering_mode: wateringMode,
                value: value,
                auto_enabled: isFao56 || scheduleType === FirmwareScheduleType.AUTO,
                use_solar_timing: schedule.useSolarTiming,
                solar_event: schedule.solarEvent === 'sunrise' ? 1 : 0,
                solar_offset_minutes: schedule.solarOffsetMinutes
            };

            await bleService.writeScheduleConfig(config);
            console.log(`[Wizard] Schedule ${zoneIndex} saved (auto: ${isFao56})`);
        } catch (error) {
            console.error(`[Wizard] Failed to save schedule ${zoneIndex}:`, error);
        } finally {
            setSaving(false);
        }
    };

    // ========================================================================
    // Navigation with Smart Skip Logic
    // ========================================================================
    
    const handleNext = async () => {
        if (phase === 0) {
            // Welcome -> Check what's already configured
            setSaving(true);
            try {
                await handleTimeSync();
            } catch (e) {
                console.warn('Time sync failed, continuing anyway');
            }
            setSaving(false);
            
            // If at least one channel is configured, user has done onboarding before
            // Skip directly to complete - they can add more zones from main UI if needed
            if (hasAnyChannelConfiguredFlag) {
                console.log('[Wizard] At least one channel configured, skipping to complete');
                setPhase(4);
                return;
            }
            
            // No channels configured - this is first-time setup
            // Skip system setup if already complete
            if (isSystemSetupComplete) {
                console.log('[Wizard] System setup already complete, skipping to zones');
                setCurrentZoneIndex(0);
                setPhase(2);
            } else {
                setPhase(1);
            }
            return;
        }
        
        if (phase === 1) {
            await saveSystemConfig();
            // After system config, show zone grid selection
            setCurrentZoneIndex(0);
            setPhase(2);
            setShowZoneGrid(true);
            return;
        }
        
        if (phase === 2) {
            const zone = zoneConfigs[currentZoneIndex];
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            const channelStatus = getChannelStatus(currentZoneIndex);
            
            // Sub-step 0: Mode selection -> next step (with skip logic)
            if (zoneSubStep === 0 && zone.enabled) {
                if (isFao56) {
                    // Find next unconfigured FAO-56 sub-step
                    const nextStep = getNextFao56SubStep(currentZoneIndex, 1);
                    if (nextStep !== null) {
                        setZoneSubStep(nextStep);
                    } else {
                        // All complete, show summary
                        setZoneSubStep(5);
                    }
                } else {
                    // Find next unconfigured simple mode sub-step
                    const nextStep = getNextSimpleSubStep(currentZoneIndex, 1);
                    if (nextStep !== null) {
                        setZoneSubStep(nextStep);
                    } else {
                        // All complete, show summary
                        setZoneSubStep(5);
                    }
                }
                return;
            }
            
            // For FAO-56 modes: multi-step flow
            // ORDER: 0=mode, 1=plant, 2=location, 3=soil&irrigation, 4=coverage&sun, 5=summary, 6=schedule
            // ALWAYS show location step - don't skip even if previously configured
            if (isFao56) {
                if (zoneSubStep === 1) { // Plant -> Location (ALWAYS)
                    setZoneSubStep(2); // Always go to location
                    return;
                }
                if (zoneSubStep === 2) { // Location -> Soil & Irrigation
                    setZoneSubStep(3); // Always go to soil
                    return;
                }
                if (zoneSubStep === 3) { // Soil -> Coverage & Sun
                    setZoneSubStep(4); // Always go to coverage
                    return;
                }
                if (zoneSubStep === 4) { // Coverage -> Summary
                    setZoneSubStep(5);
                    return;
                }
                if (zoneSubStep === 5) { // Summary -> Schedule (save zone config)
                    await saveZoneConfig(currentZoneIndex);
                    setZoneSubStep(6); // Always go to schedule
                    return;
                }
            } else {
                // Duration/Volume: settings -> summary -> schedule
                if (zoneSubStep === 1) {
                    setZoneSubStep(5); // Go to summary
                    return;
                }
                if (zoneSubStep === 5) { // Summary -> Schedule
                    await saveZoneConfig(currentZoneIndex);
                    // Check if schedule already exists
                    if (channelStatus.hasSchedule) {
                        // Skip schedule, go to next zone
                        setShowZoneCompleteAlert(true);
                    } else {
                        setZoneSubStep(6);
                    }
                    return;
                }
            }
            
            // Sub-step 6: Schedule -> Show popup to ask for next zone
            if (zoneSubStep === 6 || !zone.enabled) {
                if (zone.enabled) {
                    await saveScheduleConfig(currentZoneIndex);
                }
                
                // Show popup asking if user wants another zone
                setShowZoneCompleteAlert(true);
            }
        }
    };
    
    // Handle "Add another zone" from popup
    const handleAddAnotherZone = () => {
        setShowZoneCompleteAlert(false);
        setShowZoneGrid(true); // Return to grid to show progress
        
        setSearchText('');
        setSelectedCategory('all');
        setShowScheduleOptions(false);
    };
    
    // Handle "Finish" from popup
    const handleFinishSetup = () => {
        setShowZoneCompleteAlert(false);
        
        // Disable remaining zones that weren't configured
        setZoneConfigs(prev => prev.map((z, i) => 
            i > currentZoneIndex ? { ...z, enabled: false } : z
        ));
        
        setPhase(4);
    };

    const handleBack = () => {
        if (phase === 1) {
            setPhase(0);
        } else if (phase === 2) {
            // NEW: Handle Grid Back Navigation
            if (showZoneGrid) {
                setPhase(1);
                return;
            }
            
            // If at start of zone config, go back to grid
            if (zoneSubStep === 0) {
                setShowZoneGrid(true);
                return;
            }

            const zone = zoneConfigs[currentZoneIndex];
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            
            // Navigate back through sub-steps 
            // NEW ORDER: 0=mode, 1=plant, 2=location, 3=soil, 4=coverage, 5=summary, 6=schedule
            if (zoneSubStep === 6) { // Schedule -> Summary
                setZoneSubStep(5);
                return;
            }
            
            if (zoneSubStep === 5) { // Summary -> previous
                if (isFao56) {
                    setZoneSubStep(4); // Back to coverage
                } else {
                    setZoneSubStep(1); // Back to settings
                }
                return;
            }
            
            if (isFao56) {
                if (zoneSubStep === 4) { setZoneSubStep(3); return; } // Coverage -> Soil
                if (zoneSubStep === 3) { setZoneSubStep(2); return; } // Soil -> Location
                if (zoneSubStep === 2) { setZoneSubStep(1); return; } // Location -> Plant
                if (zoneSubStep === 1) { setZoneSubStep(0); return; } // Plant -> Mode
            } else {
                if (zoneSubStep === 1) { setZoneSubStep(0); return; }
            }
            
            // At mode selection (sub-step 0)
            if (currentZoneIndex > 0) {
                // Go to previous zone's schedule
                let prevIndex = currentZoneIndex - 1;
                while (prevIndex >= 0 && !zoneConfigs[prevIndex].enabled) {
                    prevIndex--;
                }
                if (prevIndex >= 0) {
                    setCurrentZoneIndex(prevIndex);
                    setZoneSubStep(6); // Go to schedule of previous zone
                } else {
                    setPhase(1);
                }
            } else {
                setPhase(1);
            }
        }
    };

    // ========================================================================
    // Zone Config Helpers
    // ========================================================================
    
    const updateCurrentZone = (updates: Partial<ZoneConfig>) => {
        setZoneConfigs(prev => {
            const newConfigs = [...prev];
            newConfigs[currentZoneIndex] = { ...newConfigs[currentZoneIndex], ...updates };
            return newConfigs;
        });
    };

    const updateCurrentSchedule = (updates: Partial<ScheduleConfig>) => {
        setScheduleConfigs(prev => {
            const newConfigs = [...prev];
            newConfigs[currentZoneIndex] = { ...newConfigs[currentZoneIndex], ...updates };
            return newConfigs;
        });
    };

    const toggleDay = (dayBit: number) => {
        const current = scheduleConfigs[currentZoneIndex].daysMask;
        updateCurrentSchedule({ daysMask: current ^ (1 << dayBit) });
    };

    // NEW: Helper functions for new features
    const handleTestValve = async () => {
        setIsTestingValve(true);
        try {
            // Turn ON (Manual mode, 1 minute safety timeout)
            await bleService.writeValveControl(currentZoneIndex, 1, 1); 
            
            // Turn OFF after 5 seconds
            setTimeout(async () => {
                try {
                    await bleService.writeValveControl(currentZoneIndex, 0, 0);
                } catch (e) {
                    console.error('Failed to stop valve after test:', e);
                } finally {
                    setIsTestingValve(false);
                }
            }, 5000);
        } catch (e) {
            console.error('Failed to start valve test:', e);
            setIsTestingValve(false);
        }
    };

    const handleCopyConfig = (sourceIndex: number) => {
        const source = zoneConfigs[sourceIndex];
        updateCurrentZone({
            wateringMode: source.wateringMode,
            plant: source.plant,
            soil: source.soil,
            irrigationMethod: source.irrigationMethod,
            location: source.location,
            coverageType: source.coverageType,
            coverageValue: source.coverageValue,
            sunExposure: source.sunExposure,
            enableCycleSoak: source.enableCycleSoak,
            cycleSoakWateringMin: source.cycleSoakWateringMin,
            cycleSoakPauseMin: source.cycleSoakPauseMin,
            maxVolumeLimit: source.maxVolumeLimit,
            rainCompEnabled: source.rainCompEnabled,
            rainCompSensitivity: source.rainCompSensitivity,
            rainCompSkipThreshold: source.rainCompSkipThreshold,
            rainCompLookbackHours: source.rainCompLookbackHours,
            tempCompEnabled: source.tempCompEnabled,
            tempCompBaseTemp: source.tempCompBaseTemp,
            tempCompSensitivity: source.tempCompSensitivity,
            durationMinutes: source.durationMinutes,
            volumeLiters: source.volumeLiters
        });
        setShowCopyPopover(false);
    };

    // ========================================================================
    // Render Phase 0: Welcome
    // ========================================================================
    
    const renderWelcome = () => {
        // Check overall completion percentage
        const completionPct = onboardingState?.overall_completion_pct || 0;
        const channelsPct = onboardingState?.channels_completion_pct || 0;
        
        // Different message if user has already configured channels
        if (hasAnyChannelConfiguredFlag) {
            return (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                    <div className="w-20 h-20 bg-cyber-emerald/20 rounded-full flex items-center justify-center mb-6">
                        <IonIcon icon={checkmarkCircle} className="text-4xl text-cyber-emerald" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{t('wizard.welcome.alreadyConfigured')}</h2>
                    <p className="text-gray-400 mb-4">
                        {t('wizard.welcome.zonesConfiguredMsg')}
                    </p>
                    
                    {/* Show completion stats */}
                    <div className="w-full max-w-xs mb-6">
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">{t('wizard.welcome.overallProgress')}</span>
                            <span className="text-cyber-emerald font-medium">{completionPct}%</span>
                        </div>
                        <IonProgressBar value={completionPct / 100} color="success" />
                    </div>
                    
                    <p className="text-gray-500 text-sm mb-4">
                        {t('wizard.welcome.continueToClose')}
                    </p>
                    
                    <IonNote className="text-xs text-gray-500">
                        {t('wizard.welcome.factoryResetNote')}
                    </IonNote>
                </div>
            );
        }
        
        // First-time setup message
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
                <div className="w-20 h-20 bg-cyber-emerald/20 rounded-full flex items-center justify-center mb-6">
                    <IonIcon icon={settingsOutline} className="text-4xl text-cyber-emerald" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">{t('wizard.welcome.title')}</h2>
                <p className="text-gray-400 mb-4">
                    {t('wizard.welcome.subtitle')}
                </p>
                <p className="text-gray-500 text-sm">
                    {t('wizard.welcome.description')}
                </p>
            </div>
        );
    };

    // ========================================================================
    // Render Phase 1: System Configuration (only unconfigured settings)
    // ========================================================================
    
    const renderPhase1 = () => {
        // Get flags to determine what's already configured
        const flags = onboardingState?.system_config_flags || 0;
        const hasMasterValve = hasSystemFlag(flags, SYSTEM_FLAG.MASTER_VALVE);
        const hasRainSensor = hasSystemFlag(flags, SYSTEM_FLAG.RAIN_SENSOR);
        const hasPowerMode = hasSystemFlag(flags, SYSTEM_FLAG.POWER_MODE);
        const hasFlowCal = hasSystemFlag(flags, SYSTEM_FLAG.FLOW_CALIBRATION);
        
        // Count what needs configuration
        const unconfiguredCount = [!hasMasterValve, !hasRainSensor, !hasPowerMode, !hasFlowCal].filter(Boolean).length;
        const configuredCount = 4 - unconfiguredCount;
        
        return (
        <div className="p-4 space-y-6">
            <div className="text-center mb-6">
                <IonIcon icon={settingsOutline} className="text-5xl text-cyber-emerald mb-2" />
                <h2 className="text-2xl font-bold text-white">{t('wizard.system.title')}</h2>
                <p className="text-gray-400">
                    {unconfiguredCount === 0 
                        ? t('wizard.system.allConfigured')
                        : t('wizard.system.configureRemaining').replace('{count}', String(unconfiguredCount))}
                </p>
            </div>

            {/* Show what's already configured */}
            {configuredCount > 0 && (
                <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(0,200,83,0.1)' }}>
                    <IonCardContent className="py-2">
                        <div className="flex items-center gap-2 mb-2">
                            <IonIcon icon={checkmarkCircleOutline} color="success" />
                            <span className="text-sm font-medium text-cyber-emerald">{t('wizard.system.alreadyConfigured')}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {hasMasterValve && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={gitBranchOutline} /> {t('wizard.system.masterValve')}</IonChip>}
                            {hasRainSensor && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={cloudOutline} /> {t('wizard.system.rainSensor')}</IonChip>}
                            {hasPowerMode && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={flashOutline} /> {t('wizard.system.powerMode')}</IonChip>}
                            {hasFlowCal && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={waterOutline} /> {t('wizard.system.flowCalibration')}</IonChip>}
                        </div>
                    </IonCardContent>
                </IonCard>
            )}

            {/* Master Valve - only if not configured */}
            {!hasMasterValve && (
            <IonCard className="glass-panel">
                <IonCardHeader>
                    <div className="flex items-center gap-3">
                        <IonIcon icon={gitBranchOutline} className="text-2xl text-cyber-blue" />
                        <IonLabel className="text-lg font-bold text-white">{t('wizard.system.masterValve')}</IonLabel>
                    </div>
                </IonCardHeader>
                <IonCardContent>
                    <IonItem lines="none" className="bg-transparent">
                        <IonLabel>{t('wizard.system.enableMasterValve')}</IonLabel>
                        <IonToggle
                            checked={systemSetup.masterValveEnabled}
                            onIonChange={e => setSystemSetup(prev => ({ ...prev, masterValveEnabled: e.detail.checked }))}
                        />
                    </IonItem>
                    
                    {systemSetup.masterValveEnabled && (
                        <>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel position="stacked">{t('wizard.system.preDelay')}</IonLabel>
                                <IonInput
                                    type="number"
                                    value={systemSetup.masterValvePreDelay}
                                    onIonInput={e => setSystemSetup(prev => ({ 
                                        ...prev, 
                                        masterValvePreDelay: parseInt(e.detail.value || '0') 
                                    }))}
                                />
                            </IonItem>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel position="stacked">{t('wizard.system.postDelay')}</IonLabel>
                                <IonInput
                                    type="number"
                                    value={systemSetup.masterValvePostDelay}
                                    onIonInput={e => setSystemSetup(prev => ({ 
                                        ...prev, 
                                        masterValvePostDelay: parseInt(e.detail.value || '0') 
                                    }))}
                                />
                            </IonItem>
                        </>
                    )}
                </IonCardContent>
            </IonCard>
            )}

            {/* Rain Sensor - only if not configured */}
            {!hasRainSensor && (
            <IonCard className="glass-panel">
                <IonCardHeader>
                    <div className="flex items-center gap-3">
                        <IonIcon icon={cloudOutline} className="text-2xl text-cyber-blue" />
                        <IonLabel className="text-lg font-bold text-white">{t('wizard.system.rainSensor')}</IonLabel>
                    </div>
                </IonCardHeader>
                <IonCardContent>
                    <IonItem lines="none" className="bg-transparent">
                        <IonLabel>{t('wizard.system.enableRainSensor')}</IonLabel>
                        <IonToggle
                            checked={systemSetup.rainSensorEnabled}
                            onIonChange={e => setSystemSetup(prev => ({ ...prev, rainSensorEnabled: e.detail.checked }))}
                        />
                    </IonItem>
                    
                    {systemSetup.rainSensorEnabled && (
                        <>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel position="stacked">Calibration (mm per pulse)</IonLabel>
                                <IonInput
                                    type="number"
                                    step="0.01"
                                    value={Number(systemSetup.rainMmPerPulse).toFixed(2)}
                                    onIonInput={e => setSystemSetup(prev => ({ 
                                        ...prev, 
                                        rainMmPerPulse: Math.round(parseFloat(e.detail.value || '0.25') * 100) / 100
                                    }))}
                                />
                            </IonItem>
                            <IonNote className="text-xs text-gray-400 px-4">
                                Rain compensation settings are configured per-zone for TIME/VOLUME modes.
                                FAO-56 modes incorporate rain data automatically.
                            </IonNote>
                        </>
                    )}
                </IonCardContent>
            </IonCard>
            )}

            {/* Power Mode - only if not configured */}
            {!hasPowerMode && (
            <IonCard className="glass-panel">
                <IonCardHeader>
                    <div className="flex items-center gap-3">
                        <IonIcon icon={flashOutline} className="text-2xl text-cyber-blue" />
                        <IonLabel className="text-lg font-bold text-white">Power Mode</IonLabel>
                    </div>
                </IonCardHeader>
                <IonCardContent>
                    <IonItem lines="none" className="bg-transparent">
                        <IonSelect
                            value={systemSetup.powerMode}
                            onIonChange={e => setSystemSetup(prev => ({ ...prev, powerMode: e.detail.value }))}
                            interface="popover"
                        >
                            <IonSelectOption value={0}>Normal</IonSelectOption>
                            <IonSelectOption value={1}>Low Power</IonSelectOption>
                            <IonSelectOption value={2}>Always On</IonSelectOption>
                        </IonSelect>
                    </IonItem>
                </IonCardContent>
            </IonCard>
            )}

            {/* Flow Calibration - only if not configured */}
            {!hasFlowCal && (
            <IonCard className="glass-panel">
                <IonCardHeader>
                    <div className="flex items-center gap-3">
                        <IonIcon icon={waterOutline} className="text-2xl text-cyber-blue" />
                        <IonLabel className="text-lg font-bold text-white">Flow Calibration</IonLabel>
                    </div>
                </IonCardHeader>
                <IonCardContent>
                    <IonItem lines="none" className="bg-transparent">
                        <IonLabel position="stacked">Pulses per Liter</IonLabel>
                        <IonInput
                            type="number"
                            value={systemSetup.flowCalibration}
                            onIonInput={e => setSystemSetup(prev => ({ 
                                ...prev, 
                                flowCalibration: parseInt(e.detail.value || '750') 
                            }))}
                        />
                    </IonItem>
                    <IonNote className="text-xs text-gray-400 px-4">
                        Default: 750 pulses/L. Use calibration wizard in Settings for precise value.
                    </IonNote>
                </IonCardContent>
            </IonCard>
            )}
        </div>
        );
    };

    // ========================================================================
    // Render Phase 2: Zone Configuration with 4 Watering Modes
    // ========================================================================
    
    const currentZone = zoneConfigs[currentZoneIndex];
    
    const WATERING_MODES: { mode: WateringModeType; label: string; description: string; icon: string; color: string }[] = [
        { mode: 'fao56_auto', label: 'FAO-56 Auto', description: 'Full automated calculation with weather compensation', icon: leafOutline, color: 'success' },
        { mode: 'fao56_eco', label: 'FAO-56 Eco', description: 'Water-saving mode (70% of standard)', icon: waterOutline, color: 'tertiary' },
        { mode: 'duration', label: 'Duration', description: 'Simple time-based watering', icon: timerOutline, color: 'primary' },
        { mode: 'volume', label: 'Volume', description: 'Flow-based watering with target volume', icon: speedometerOutline, color: 'secondary' }
    ];
    
    const isFao56Mode = currentZone.wateringMode === 'fao56_auto' || currentZone.wateringMode === 'fao56_eco';
    
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // NEW: Copy Zone Configuration
    const copyZoneConfig = (sourceIndex: number) => {
        const sourceZone = zoneConfigs[sourceIndex];
        const targetZone = zoneConfigs[currentZoneIndex];
        
        const newZone = {
            ...sourceZone,
            channel_id: targetZone.channel_id,
            name: targetZone.name, // Keep original name
            enabled: true
        };
        
        const newConfigs = [...zoneConfigs];
        newConfigs[currentZoneIndex] = newZone;
        setZoneConfigs(newConfigs);
        setShowCopyPopover(false);
        
        // Copy Schedule
        const sourceSchedule = scheduleConfigs[sourceIndex];
        const targetSchedule = scheduleConfigs[currentZoneIndex];
        const newSchedule = {
            ...sourceSchedule,
            channel_id: targetSchedule.channel_id
        };
        const newSchedules = [...scheduleConfigs];
        newSchedules[currentZoneIndex] = newSchedule;
        setScheduleConfigs(newSchedules);
    };

    // NEW: Test Valve
    const testValve = async () => {
        if (isTestingValve) return;
        setIsTestingValve(true);
        try {
            // Open valve (Action 1), 60s safety duration
            await bleService.writeValveControl(currentZoneIndex, 1, 60); 
            
            // Wait 5s
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Close valve (Action 0)
            await bleService.writeValveControl(currentZoneIndex, 0, 0);
        } catch (e) {
            console.error('Valve test failed', e);
        } finally {
            setIsTestingValve(false);
        }
    };

    // NEW: Render Zone Grid
    const renderZoneGrid = () => (
        <div className="p-4">
            <div className="text-center mb-6">
                <IonIcon icon={appsOutline} className="text-5xl text-cyber-emerald mb-2" />
                <h2 className="text-2xl font-bold text-white">Select Zone</h2>
                <p className="text-gray-400">Choose a zone to configure</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {zoneConfigs.map((zone, idx) => {
                    const status = getChannelStatus(idx);
                    const isConfigured = status.hasPlant || status.hasSoil || status.hasSchedule;
                    
                    return (
                        <IonCard 
                            key={idx} 
                            button 
                            onClick={() => {
                                setCurrentZoneIndex(idx);
                                setShowZoneGrid(false);
                                setZoneSubStep(0);
                            }}
                            className={`m-0 ${zone.enabled ? 'glass-panel' : 'opacity-50'}`}
                            style={{ 
                                border: isConfigured ? '1px solid var(--ion-color-success)' : undefined,
                                backgroundColor: isConfigured ? 'rgba(0, 200, 83, 0.1)' : undefined
                            }}
                        >
                            <IonCardContent className="text-center py-4">
                                <div className="text-2xl font-bold mb-1 text-white">{idx + 1}</div>
                                <div className="text-xs truncate text-gray-300 mb-2">{zone.name}</div>
                                {isConfigured ? (
                                    <IonIcon icon={checkmarkCircle} color="success" />
                                ) : (
                                    <IonIcon icon={settingsOutline} color="medium" />
                                )}
                            </IonCardContent>
                        </IonCard>
                    );
                })}
            </div>
        </div>
    );

    const renderPhase2 = () => {
        // NEW: Show Grid if active
        if (showZoneGrid) return renderZoneGrid();

        const isFao56 = currentZone.wateringMode === 'fao56_auto' || currentZone.wateringMode === 'fao56_eco';
        // Get channel configuration status from firmware flags
        const channelStatus = getChannelStatus(currentZoneIndex);
        
        const getStepDescription = () => {
            if (zoneSubStep === 0) return 'Select watering mode';
            if (isFao56) {
                if (zoneSubStep === 1) return 'Select plant type';
                if (zoneSubStep === 2) return 'Location & planting date';
                if (zoneSubStep === 3) return 'Soil & irrigation method';
                if (zoneSubStep === 4) return 'Coverage & sun exposure';
            } else {
                if (zoneSubStep === 1) return 'Configure settings';
            }
            if (zoneSubStep === 5) return 'Set schedule';
            return '';
        };
        
        return (
        <div className="p-4 space-y-3">

            {/* Zone Header - compact with editable name and mode badge */}
            <IonCard className="glass-panel">
                <IonCardContent className="py-2">
                    <div className="flex items-center gap-2">
                        <IonIcon icon={layersOutline} style={{ color: 'var(--ion-color-success)', fontSize: '1.5rem' }} />
                        <div className="flex-1 min-w-0">
                            <IonInput
                                value={currentZone.name || `Zone ${currentZoneIndex + 1}`}
                                onIonInput={e => updateCurrentZone({ name: e.detail.value || '' })}
                                placeholder={`Zone ${currentZoneIndex + 1}`}
                                className="font-semibold"
                                style={{ '--padding-start': '0', '--padding-end': '0', fontSize: '1.1rem' }}
                            />
                        </div>

                        {/* NEW: Action Buttons */}
                        <IonButton 
                            fill="clear" 
                            size="small" 
                            id={`copy-trigger-${currentZoneIndex}`}
                            onClick={() => setShowCopyPopover(true)}
                        >
                            <IonIcon icon={copyOutline} slot="icon-only" />
                        </IonButton>
                        <IonPopover 
                            trigger={`copy-trigger-${currentZoneIndex}`} 
                            isOpen={showCopyPopover} 
                            onDidDismiss={() => setShowCopyPopover(false)}
                        >
                            <IonContent class="ion-padding">
                                <IonList>
                                    <IonItem lines="none">
                                        <IonLabel><strong>Copy from...</strong></IonLabel>
                                    </IonItem>
                                    {zoneConfigs.map((z, i) => (
                                        i !== currentZoneIndex && (z.plant || z.soil) ? (
                                            <IonItem button key={i} onClick={() => copyZoneConfig(i)}>
                                                <IonLabel>Zone {i + 1}: {z.name}</IonLabel>
                                            </IonItem>
                                        ) : null
                                    ))}
                                </IonList>
                            </IonContent>
                        </IonPopover>

                        <IonButton 
                            fill="outline" 
                            size="small" 
                            color={isTestingValve ? "warning" : "primary"}
                            onClick={testValve}
                            disabled={isTestingValve}
                        >
                            {isTestingValve ? (
                                <IonSpinner name="crescent" style={{ width: '1rem', height: '1rem' }} />
                            ) : (
                                <IonIcon icon={flashOutline} slot="icon-only" />
                            )}
                        </IonButton>

                        {/* Show mode badge after step 0 */}
                        {currentZone.enabled && zoneSubStep > 0 && (
                            <IonChip 
                                color={currentZone.wateringMode?.includes('fao56') ? 'success' : 'primary'}
                                style={{ margin: 0, height: '28px', fontSize: '0.75rem' }}
                            >
                                {WATERING_MODES.find(m => m.mode === currentZone.wateringMode)?.label}
                            </IonChip>
                        )}
                        <IonToggle
                            checked={currentZone.enabled}
                            onIonChange={e => updateCurrentZone({ enabled: e.detail.checked })}
                        />
                    </div>
                    
                    {!currentZone.enabled && (
                        <div className="text-center py-2 mt-2">
                            <IonButton fill="outline" color="medium" size="small" onClick={handleNext}>
                                Skip Zone
                                <IonIcon icon={chevronForward} slot="end" />
                            </IonButton>
                        </div>
                    )}
                </IonCardContent>
            </IonCard>

            {/* Onboarding Status Indicator - Show what's already configured */}
            {currentZone.enabled && zoneSubStep === 0 && onboardingState && (() => {
                const status = getChannelStatus(currentZoneIndex);
                const hasAnyConfig = status.hasPlant || status.hasSoil || status.hasIrrigation || 
                                     status.hasCoverage || status.hasSunExposure || status.hasWaterFactor || 
                                     status.hasSchedule;
                
                if (!hasAnyConfig) return null;
                
                return (
                    <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(0,200,83,0.1)' }}>
                        <IonCardContent className="py-2">
                            <div className="flex items-center gap-2 mb-2">
                                <IonIcon icon={checkmarkCircleOutline} color="success" />
                                <span className="text-sm font-medium text-cyber-emerald">Previously Configured</span>
                                {status.isFao56Ready && (
                                    <IonChip color="success" style={{ margin: 0, height: '22px', fontSize: '0.65rem', fontWeight: 600 }}>
                                        FAO-56 Ready ✓
                                    </IonChip>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {status.hasPlant && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={leafOutline} /> Plant</IonChip>}
                                {status.hasSoil && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}>Soil</IonChip>}
                                {status.hasIrrigation && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}>Irrigation</IonChip>}
                                {status.hasCoverage && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}>Coverage</IonChip>}
                                {status.hasSunExposure && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={sunnyOutline} /> Sun</IonChip>}
                                {status.hasLatitude && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={locationOutline} /> Location</IonChip>}
                                {status.hasWaterFactor && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={waterOutline} /> Water</IonChip>}
                                {status.hasSchedule && <IonChip color="success" outline style={{ height: '24px', fontSize: '0.7rem' }}><IonIcon icon={timeOutline} /> Schedule</IonChip>}
                            </div>
                            {/* Extended Features Row */}
                            {(status.hasRainComp || status.hasTempComp || status.hasCycleSoak || status.hasPlantingDate || status.hasVolumeLimit) && (
                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/10">
                                    <span className="text-xs text-gray-500 w-full mb-1">Features:</span>
                                    {status.hasRainComp && <IonChip color="tertiary" outline style={{ height: '22px', fontSize: '0.65rem' }}><IonIcon icon={rainyOutline} /> Rain Comp</IonChip>}
                                    {status.hasTempComp && <IonChip color="warning" outline style={{ height: '22px', fontSize: '0.65rem' }}><IonIcon icon={thermometerOutline} /> Temp Comp</IonChip>}
                                    {status.hasCycleSoak && <IonChip color="secondary" outline style={{ height: '22px', fontSize: '0.65rem' }}><IonIcon icon={timerOutline} /> Cycle/Soak</IonChip>}
                                    {status.hasPlantingDate && <IonChip color="primary" outline style={{ height: '22px', fontSize: '0.65rem' }}><IonIcon icon={calendarOutline} /> Planted</IonChip>}
                                    {status.hasVolumeLimit && <IonChip color="danger" outline style={{ height: '22px', fontSize: '0.65rem' }}><IonIcon icon={speedometerOutline} /> Vol Limit</IonChip>}
                                </div>
                            )}
                            <IonNote className="text-xs text-gray-400 mt-2 block">
                                Configured settings will be skipped. You can still reconfigure by navigating manually.
                            </IonNote>
                        </IonCardContent>
                    </IonCard>
                );
            })()}

            {/* Step 0: Zone Name + Mode Selection */}
            {currentZone.enabled && zoneSubStep === 0 && (
                <>
                    {/* NEW: Test Valve & Copy Config Buttons */}
                    <div className="flex gap-2 mb-4">
                        <IonButton 
                            expand="block" 
                            className="flex-1" 
                            color="warning" 
                            fill="outline"
                            onClick={handleTestValve}
                            disabled={isTestingValve}
                        >
                            <IonIcon slot="start" icon={waterOutline} />
                            {isTestingValve ? 'Testing...' : 'Test (5s)'}
                        </IonButton>
                        <IonButton 
                            expand="block" 
                            className="flex-1" 
                            color="secondary"
                            fill="outline"
                            onClick={() => setShowCopyPopover(true)}
                            id="copy-config-trigger"
                        >
                            <IonIcon slot="start" icon={copyOutline} />
                            Copy Config
                        </IonButton>
                        <IonPopover trigger="copy-config-trigger" isOpen={showCopyPopover} onDidDismiss={() => setShowCopyPopover(false)}>
                            <IonContent>
                                <IonList>
                                    <IonListHeader>Copy from:</IonListHeader>
                                    {zoneConfigs.map((z, i) => (
                                        i !== currentZoneIndex && z.enabled && (z.plant || z.wateringMode !== 'fao56_auto') ? (
                                            <IonItem button key={i} onClick={() => handleCopyConfig(i)}>
                                                <IonLabel>{z.name}</IonLabel>
                                            </IonItem>
                                        ) : null
                                    ))}
                                </IonList>
                            </IonContent>
                        </IonPopover>
                    </div>

                    {/* 2.5: Clone zone feature - copy from previous configured zone */}
                    {(() => {
                        const previousConfiguredZone = zoneConfigs
                            .slice(0, currentZoneIndex)
                            .reverse()
                            .find(z => z.enabled && z.wateringMode);
                        
                        if (!previousConfiguredZone || currentZone.plant || currentZone.soil) return null;
                        
                        return (
                            <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px dashed rgba(16, 185, 129, 0.5)' }}>
                                <IonCardContent className="py-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <IonIcon icon={copyOutline} className="text-xl text-cyber-emerald" />
                                            <div>
                                                <p className="text-white font-medium text-sm">Configurare rapidă</p>
                                                <p className="text-gray-400 text-xs">Copiază setările din "{previousConfiguredZone.name}"</p>
                                            </div>
                                        </div>
                                        <IonButton 
                                            size="small" 
                                            color="success"
                                            onClick={() => {
                                                updateCurrentZone({
                                                    wateringMode: previousConfiguredZone.wateringMode,
                                                    plant: previousConfiguredZone.plant,
                                                    soil: previousConfiguredZone.soil,
                                                    irrigationMethod: previousConfiguredZone.irrigationMethod,
                                                    location: previousConfiguredZone.location,
                                                    coverageType: previousConfiguredZone.coverageType,
                                                    coverageValue: previousConfiguredZone.coverageValue,
                                                    sunExposure: previousConfiguredZone.sunExposure,
                                                    enableCycleSoak: previousConfiguredZone.enableCycleSoak,
                                                    cycleSoakWateringMin: previousConfiguredZone.cycleSoakWateringMin,
                                                    cycleSoakPauseMin: previousConfiguredZone.cycleSoakPauseMin,
                                                });
                                            }}
                                        >
                                            Copiază
                                        </IonButton>
                                    </div>
                                </IonCardContent>
                            </IonCard>
                        );
                    })()}

                    {/* Zone Name Prompt */}
                    <IonCard className="glass-panel">
                        <IonCardContent>
                            <p style={{ color: 'var(--ion-color-medium)', marginBottom: '8px', fontSize: '0.9rem' }}>What do you call this zone?</p>
                            <IonInput
                                value={currentZone.name}
                                onIonInput={e => updateCurrentZone({ name: e.detail.value || '' })}
                                placeholder="e.g., Front Garden, Tomatoes, Lawn..."
                                style={{ '--background': 'rgba(255,255,255,0.05)', '--padding-start': '12px', '--padding-end': '12px', borderRadius: '8px' }}
                            />
                        </IonCardContent>
                    </IonCard>

                    {/* Mode Selection */}
                    <div className="space-y-3">
                        <p style={{ color: 'var(--ion-color-medium)', paddingLeft: '8px', fontSize: '0.9rem' }}>Select watering mode:</p>
                        {WATERING_MODES.map(({ mode, label, description, icon, color }) => (
                            <IonCard
                                key={mode}
                                button
                                onClick={() => updateCurrentZone({ wateringMode: mode })}
                                className={currentZone.wateringMode === mode ? 'border-2 border-cyber-emerald' : ''}
                            >
                                <IonCardContent>
                                    <div className="flex items-center gap-3">
                                        <IonIcon icon={icon} color={color} className="text-3xl" />
                                        <div className="flex-1">
                                            <div className="font-bold text-white">{label}</div>
                                        <div className="text-sm text-gray-400">{description}</div>
                                    </div>
                                    {currentZone.wateringMode === mode && (
                                        <IonIcon icon={checkmarkCircleOutline} color="success" className="text-2xl" />
                                    )}
                                </div>
                            </IonCardContent>
                        </IonCard>
                    ))}
                    </div>
                </>
            )}

            {/* Step 1: Mode-specific configuration */}
            {currentZone.enabled && zoneSubStep === 1 && (
                <>
                    {/* FAO-56 Mode Configuration - Plant Selection with new component */}
                    {isFao56Mode && (
                        <>
                            {/* Already Configured Banner */}
                            {channelStatus.hasPlant && !currentZone.plant && (
                                <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(0,200,83,0.15)' }}>
                                    <IonCardContent className="py-3">
                                        <div className="flex items-center gap-3">
                                            <IonIcon icon={checkmarkCircleOutline} color="success" className="text-2xl" />
                                            <div>
                                                <p className="text-cyber-emerald font-medium">Plant Already Configured</p>
                                                <p className="text-gray-400 text-sm">This zone already has a plant set on the device. Select a new one to change it, or press Next to keep current.</p>
                                            </div>
                                        </div>
                                    </IonCardContent>
                                </IonCard>
                            )}
                            
                            {/* NEW: Plant Selection with category chips and smart search */}
                            <PlantSelector
                                plants={filteredPlants}
                                value={currentZone.plant}
                                onChange={(plant: PlantDBEntry) => {
                                    // 2.3: Smart zone name - only if using default name
                                    const isDefaultName = currentZone.name.match(/^Zone \d+$/) || 
                                                          currentZone.name === `Zona ${currentZoneIndex + 1}`;
                                    const smartName = isDefaultName 
                                        ? `${plant.common_name_ro}` 
                                        : currentZone.name;
                                    
                                    updateCurrentZone({ 
                                        plant,
                                        name: smartName
                                    });
                                    
                                    // Auto-select recommended irrigation method
                                    if (plant.typ_irrig_method && irrigationMethodDb.length > 0) {
                                        const methodMap: Record<string, string> = {
                                            'DRIP': 'IRRIG_DRIP_SURFACE',
                                            'SPRINKLER': 'IRRIG_SPRINKLER_SET',
                                            'SURFACE': 'IRRIG_SURFACE_FURROW',
                                            'MANUAL': 'IRRIG_DRIP_SURFACE',
                                            'RAINFED': 'IRRIG_SPRINKLER_SET'
                                        };
                                        const code = methodMap[plant.typ_irrig_method];
                                        const method = irrigationMethodDb.find(m => m.code_enum === code);
                                        if (method) {
                                            updateCurrentZone({ irrigationMethod: method });
                                        }
                                    }
                                }}
                            />
                        </>
                    )}

                    {/* Duration Mode Configuration - sub-step 1 */}
                    {currentZone.wateringMode === 'duration' && (
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={timerOutline} className="text-2xl text-blue-400" />
                                    <IonLabel className="text-lg font-bold text-white">Watering Duration</IonLabel>
                                </div>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonItem lines="none" className="bg-transparent">
                                    <IonLabel position="stacked">Duration (minutes)</IonLabel>
                                    <IonInput
                                        type="number"
                                        min={1}
                                        max={180}
                                        value={currentZone.durationMinutes}
                                        onIonInput={e => updateCurrentZone({ 
                                            durationMinutes: parseInt(e.detail.value || '15') 
                                        })}
                                    />
                                </IonItem>
                                <IonRange
                                    min={1}
                                    max={60}
                                    step={1}
                                    value={currentZone.durationMinutes}
                                    onIonInput={e => updateCurrentZone({ durationMinutes: e.detail.value as number })}
                                    pin
                                    pinFormatter={(value: number) => `${value}min`}
                                />
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Volume Mode Configuration - sub-step 1 */}
                    {currentZone.wateringMode === 'volume' && (
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={speedometerOutline} className="text-2xl text-cyan-400" />
                                    <IonLabel className="text-lg font-bold text-white">Target Volume</IonLabel>
                                </div>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonItem lines="none" className="bg-transparent">
                                    <IonLabel position="stacked">Volume (liters)</IonLabel>
                                    <IonInput
                                        type="number"
                                        min={1}
                                        max={500}
                                        value={currentZone.volumeLiters}
                                        onIonInput={e => updateCurrentZone({ 
                                            volumeLiters: parseInt(e.detail.value || '10') 
                                        })}
                                    />
                                </IonItem>
                                <IonRange
                                    min={1}
                                    max={100}
                                    step={1}
                                    value={currentZone.volumeLiters}
                                    onIonInput={e => updateCurrentZone({ volumeLiters: e.detail.value as number })}
                                    pin
                                    pinFormatter={(value: number) => `${value}L`}
                                />
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Rain & Temperature Compensation - ONLY for TIME/VOLUME modes, NOT for FAO-56 */}
                    {!isFao56Mode && (
                        <>
                            {/* Rain Compensation */}
                            <IonCard className="glass-panel">
                                <IonCardHeader className="pb-1">
                                    <div className="flex items-center gap-3">
                                        <IonIcon icon={rainyOutline} className="text-2xl text-blue-400" />
                                        <IonLabel className="text-lg font-bold text-white">Rain Compensation</IonLabel>
                                    </div>
                                </IonCardHeader>
                                <IonCardContent className="space-y-3">
                                    <IonItem lines="none" className="bg-transparent">
                                        <IonLabel>
                                            <h2>Enable Rain Compensation</h2>
                                            <p className="text-gray-400 text-sm">
                                                Adjust watering based on recent rainfall
                                            </p>
                                        </IonLabel>
                                        <IonToggle
                                            checked={currentZone.rainCompEnabled}
                                            onIonChange={e => updateCurrentZone({ rainCompEnabled: e.detail.checked })}
                                        />
                                    </IonItem>
                                    
                                    {currentZone.rainCompEnabled && (
                                        <div className="mt-3 pt-3 border-t border-gray-600/30 space-y-4">
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-white">Sensitivity</span>
                                                    <span className="text-sm text-cyan-400">{currentZone.rainCompSensitivity}%</span>
                                                </div>
                                                <IonRange
                                                    min={10}
                                                    max={100}
                                                    step={5}
                                                    value={currentZone.rainCompSensitivity}
                                                    onIonInput={e => updateCurrentZone({ rainCompSensitivity: e.detail.value as number })}
                                                    color="primary"
                                                />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-white flex-1">Skip if rain exceeds:</span>
                                                <IonInput
                                                    type="number"
                                                    min={1}
                                                    max={50}
                                                    value={currentZone.rainCompSkipThreshold}
                                                    onIonInput={e => updateCurrentZone({ 
                                                        rainCompSkipThreshold: parseFloat(e.detail.value || '5') 
                                                    })}
                                                    style={{ '--color': 'white', maxWidth: '70px' }}
                                                    className="ion-text-center"
                                                />
                                                <span className="text-gray-400 text-sm">mm</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-white flex-1">Lookback period:</span>
                                                <IonInput
                                                    type="number"
                                                    min={1}
                                                    max={72}
                                                    value={currentZone.rainCompLookbackHours}
                                                    onIonInput={e => updateCurrentZone({ 
                                                        rainCompLookbackHours: parseInt(e.detail.value || '24') 
                                                    })}
                                                    style={{ '--color': 'white', maxWidth: '70px' }}
                                                    className="ion-text-center"
                                                />
                                                <span className="text-gray-400 text-sm">hours</span>
                                            </div>
                                        </div>
                                    )}
                                </IonCardContent>
                            </IonCard>

                            {/* Temperature Compensation */}
                            <IonCard className="glass-panel">
                                <IonCardHeader className="pb-1">
                                    <div className="flex items-center gap-3">
                                        <IonIcon icon={thermometerOutline} className="text-2xl text-orange-400" />
                                        <IonLabel className="text-lg font-bold text-white">Temperature Compensation</IonLabel>
                                    </div>
                                </IonCardHeader>
                                <IonCardContent className="space-y-3">
                                    <IonItem lines="none" className="bg-transparent">
                                        <IonLabel>
                                            <h2>Enable Temperature Compensation</h2>
                                            <p className="text-gray-400 text-sm">
                                                Increase watering on hot days, reduce on cool days
                                            </p>
                                        </IonLabel>
                                        <IonToggle
                                            checked={currentZone.tempCompEnabled}
                                            onIonChange={e => updateCurrentZone({ tempCompEnabled: e.detail.checked })}
                                        />
                                    </IonItem>
                                    
                                    {currentZone.tempCompEnabled && (
                                        <div className="mt-3 pt-3 border-t border-gray-600/30 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-white flex-1">Base temperature:</span>
                                                <IonInput
                                                    type="number"
                                                    min={10}
                                                    max={35}
                                                    value={currentZone.tempCompBaseTemp}
                                                    onIonInput={e => updateCurrentZone({ 
                                                        tempCompBaseTemp: parseInt(e.detail.value || '20') 
                                                    })}
                                                    style={{ '--color': 'white', maxWidth: '70px' }}
                                                    className="ion-text-center"
                                                />
                                                <span className="text-gray-400 text-sm">°C</span>
                                            </div>
                                            <div>
                                                <div className="flex justify-between mb-1">
                                                    <span className="text-sm text-white">Sensitivity</span>
                                                    <span className="text-sm text-orange-400">{currentZone.tempCompSensitivity}%</span>
                                                </div>
                                                <IonRange
                                                    min={10}
                                                    max={100}
                                                    step={5}
                                                    value={currentZone.tempCompSensitivity}
                                                    onIonInput={e => updateCurrentZone({ tempCompSensitivity: e.detail.value as number })}
                                                    color="warning"
                                                />
                                            </div>
                                            <IonNote className="text-xs text-gray-400 block">
                                                At {currentZone.tempCompBaseTemp}°C no adjustment. Higher temps = more water (up to 30% extra), lower = less.
                                            </IonNote>
                                        </div>
                                    )}
                                </IonCardContent>
                            </IonCard>
                        </>
                    )}
                </>
            )}

            {/* Sub-step 3: Soil & Irrigation (FAO-56 only) - NEW COMPONENTS */}
            {currentZone.enabled && zoneSubStep === 3 && isFao56 && (
                <>
                    {/* Already Configured Banner */}
                    {(channelStatus.hasSoil || channelStatus.hasIrrigation) && (!currentZone.soil || !currentZone.irrigationMethod) && (
                        <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(0,200,83,0.15)' }}>
                            <IonCardContent className="py-3">
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={checkmarkCircleOutline} color="success" className="text-2xl" />
                                    <div>
                                        <p className="text-cyber-emerald font-medium">
                                            {channelStatus.hasSoil && channelStatus.hasIrrigation ? 'Soil & Irrigation Already Configured' : 
                                             channelStatus.hasSoil ? 'Soil Already Configured' : 'Irrigation Already Configured'}
                                        </p>
                                        <p className="text-gray-400 text-sm">Select new values to change, or press Next to keep current settings.</p>
                                    </div>
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}
                    
                    {/* NEW: Soil Selector with auto-detect from GPS */}
                    <SoilSelector
                        value={currentZone.soil}
                        location={currentZone.location}
                        onChange={(soil: SoilDBEntry, autoDetected: boolean, confidence: 'high' | 'medium' | 'low' | null) => {
                            // Auto-calculate Cycle & Soak based on soil infiltration rate
                            const shouldEnable = shouldEnableCycleSoak(soil);
                            const timing = calculateCycleSoakTiming(soil);
                            
                            console.log(`[OnboardingWizard] Soil selected: ${soil.texture}, ` +
                                        `infiltration=${soil.infiltration_rate_mm_h}mm/h, ` +
                                        `cycleSoak=${shouldEnable} (cycle=${timing.cycleMinutes}min, soak=${timing.soakMinutes}min)`);
                            
                            updateCurrentZone({ 
                                soil,
                                soilAutoDetected: autoDetected,
                                soilDetectionConfidence: confidence === 'high' ? 90 : confidence === 'medium' ? 70 : confidence === 'low' ? 50 : null,
                                // Auto-set Cycle & Soak based on soil
                                enableCycleSoak: shouldEnable,
                                cycleSoakAutoEnabled: true,
                                cycleSoakWateringMin: timing.cycleMinutes,
                                cycleSoakPauseMin: timing.soakMinutes
                            });
                        }}
                        onCustomSoilDetected={(customSoil) => {
                            console.log('[OnboardingWizard] Custom soil detected:', customSoil);
                            updateCurrentZone({ customSoilFromDetection: customSoil });
                        }}
                    />

                    {/* Compact Irrigation Method Selector */}
                    <IrrigationMethodSelectorCompact
                        methods={irrigationMethodDb}
                        value={currentZone.irrigationMethod}
                        onChange={(method: IrrigationMethodEntry) => updateCurrentZone({ irrigationMethod: method })}
                        selectedPlant={currentZone.plant}
                    />
                </>
            )}

            {/* Sub-step 4: Coverage & Sun (FAO-56 only) */}
            {currentZone.enabled && zoneSubStep === 4 && isFao56 && (
                <>
                    {/* Already Configured Banner */}
                    {(channelStatus.hasCoverage || channelStatus.hasSunExposure) && (
                        <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(0,200,83,0.15)' }}>
                            <IonCardContent className="py-3">
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={checkmarkCircleOutline} color="success" className="text-2xl" />
                                    <div>
                                        <p className="text-cyber-emerald font-medium">
                                            {channelStatus.hasCoverage && channelStatus.hasSunExposure ? 'Coverage & Sun Already Configured' : 
                                             channelStatus.hasCoverage ? 'Coverage Already Configured' : 'Sun Exposure Already Configured'}
                                        </p>
                                        <p className="text-gray-400 text-sm">Adjust values if needed, or press Next to keep current settings.</p>
                                    </div>
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}
                    
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={appsOutline} className="text-2xl text-purple-400" />
                                <IonLabel className="text-lg font-bold text-white">Coverage Area</IonLabel>
                                {channelStatus.hasCoverage && <IonIcon icon={checkmarkCircleOutline} color="success" />}
                            </div>
                        </IonCardHeader>
                        <IonCardContent className="space-y-4">
                            <IonSegment
                                value={currentZone.coverageType}
                                onIonChange={e => updateCurrentZone({ coverageType: e.detail.value as 'area' | 'plants' })}
                                color="primary"
                            >
                                <IonSegmentButton value="area">
                                    <IonLabel style={{ color: currentZone.coverageType === 'area' ? 'var(--ion-color-primary)' : 'white' }}>Area (m²)</IonLabel>
                                </IonSegmentButton>
                                <IonSegmentButton value="plants">
                                    <IonLabel style={{ color: currentZone.coverageType === 'plants' ? 'var(--ion-color-primary)' : 'white' }}>Plant Count</IonLabel>
                                </IonSegmentButton>
                            </IonSegment>

                            <div className="flex items-center gap-3 mt-2">
                                <span style={{ color: 'white' }}>
                                    {currentZone.coverageType === 'area' ? 'Area:' : 'Plants:'}
                                </span>
                                <IonInput
                                    type="number"
                                    value={currentZone.coverageValue}
                                    onIonInput={e => updateCurrentZone({ 
                                        coverageValue: parseFloat(e.detail.value || '10') 
                                    })}
                                    min={1}
                                    style={{ '--color': 'white', maxWidth: '100px' }}
                                    className="ion-text-center"
                                />
                                <span style={{ color: 'var(--ion-color-medium)' }}>
                                    {currentZone.coverageType === 'area' ? 'm²' : 'plants'}
                                </span>
                            </div>
                        </IonCardContent>
                    </IonCard>

                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={sunnyOutline} className="text-2xl text-yellow-400" />
                                <IonLabel className="text-lg font-bold text-white">Sun Exposure</IonLabel>
                                {channelStatus.hasSunExposure && <IonIcon icon={checkmarkCircleOutline} color="success" />}
                            </div>
                        </IonCardHeader>
                        <IonCardContent>
                            <IonRange
                                min={0}
                                max={100}
                                step={10}
                                value={currentZone.sunExposure}
                                onIonInput={e => updateCurrentZone({ sunExposure: e.detail.value as number })}
                                pin
                                pinFormatter={(value: number) => `${value}%`}
                            >
                                <IonIcon slot="start" icon={cloudOutline} className="text-gray-400" />
                                <IonIcon slot="end" icon={sunnyOutline} className="text-yellow-400" />
                            </IonRange>
                            <p className="text-center text-gray-400 text-sm mt-2">
                                {currentZone.sunExposure}% direct sunlight
                            </p>
                        </IonCardContent>
                    </IonCard>

                    {/* Cycle & Soak - AUTO with simple modify button */}
                    <CycleSoakAuto
                        soil={currentZone.soil}
                        irrigationMethod={currentZone.irrigationMethod}
                        enabled={currentZone.enableCycleSoak}
                        autoEnabled={currentZone.cycleSoakAutoEnabled}
                        cycleMinutes={currentZone.cycleSoakWateringMin}
                        soakMinutes={currentZone.cycleSoakPauseMin}
                        onChange={({ enabled, autoEnabled, cycleMinutes, soakMinutes }) => 
                            updateCurrentZone({ 
                                enableCycleSoak: enabled,
                                cycleSoakAutoEnabled: autoEnabled,
                                cycleSoakWateringMin: cycleMinutes,
                                cycleSoakPauseMin: soakMinutes
                            })
                        }
                    />

                    {/* Planting Date - more visible in Environment step */}
                    <IonCard className="glass-panel border border-orange-500/30">
                        <IonCardContent className="py-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-orange-500/20">
                                    <IonIcon icon={calendarOutline} className="text-xl text-orange-400" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-medium">Data plantării</span>
                                        <IonBadge color="warning" className="text-xs">Opțional</IonBadge>
                                    </div>
                                    <p className="text-gray-400 text-sm m-0">
                                        {currentZone.plantingDate 
                                            ? `Plantat: ${currentZone.plantingDate.toLocaleDateString('ro-RO')}`
                                            : 'Ajută la calculul Kc pentru plante tinere'
                                        }
                                    </p>
                                </div>
                                <IonButton 
                                    fill={currentZone.plantingDate ? 'solid' : 'outline'}
                                    size="small"
                                    id="planting-date-env-trigger"
                                    color={currentZone.plantingDate ? 'success' : 'warning'}
                                >
                                    <IonIcon slot="start" icon={calendarOutline} />
                                    {currentZone.plantingDate ? 'Schimbă' : 'Setează'}
                                </IonButton>
                                <IonPopover trigger="planting-date-env-trigger" showBackdrop={true}>
                                    <IonDatetime
                                        presentation="date"
                                        value={currentZone.plantingDate?.toISOString()}
                                        onIonChange={(e) => {
                                            const val = e.detail.value;
                                            if (typeof val === 'string') {
                                                updateCurrentZone({ plantingDate: new Date(val) });
                                            }
                                        }}
                                    />
                                    {currentZone.plantingDate && (
                                        <IonButton 
                                            fill="clear" 
                                            size="small" 
                                            expand="block"
                                            color="danger"
                                            onClick={() => updateCurrentZone({ plantingDate: null })}
                                        >
                                            Șterge data
                                        </IonButton>
                                    )}
                                </IonPopover>
                            </div>
                        </IonCardContent>
                    </IonCard>

                    {/* Max Volume Limit - Auto Calculated */}
                    <MaxVolumeConfig
                        soil={currentZone.soil}
                        plant={currentZone.plant}
                        rootDepth={currentZone.plant?.root_depth_max || 500}
                        maxVolumeLimit={currentZone.maxVolumeLimit}
                        coverageType={currentZone.coverageType}
                        coverageValue={currentZone.coverageValue}
                        onChange={(liters) => updateCurrentZone({ maxVolumeLimit: liters })}
                    />
                </>
            )}

            {/* Sub-step 2: Location (FAO-56 only) - now without Planting Date */}
            {currentZone.enabled && zoneSubStep === 2 && isFao56 && (
                <>
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={locationOutline} className="text-2xl text-red-400" />
                                <IonLabel className="text-lg font-bold text-white">Locație</IonLabel>
                                <IonNote className="text-xs">(Pentru date meteo)</IonNote>
                            </div>
                        </IonCardHeader>
                        <IonCardContent>
                            {/* 2.1: Use previous zone's location */}
                            {(() => {
                                // Find first configured zone with location
                                const firstLocationZone = zoneConfigs
                                    .slice(0, currentZoneIndex)
                                    .find(z => z.enabled && z.location);
                                
                                if (firstLocationZone?.location && !currentZone.location) {
                                    return (
                                        <IonButton
                                            expand="block"
                                            fill="outline"
                                            color="success"
                                            onClick={() => updateCurrentZone({ location: firstLocationZone.location })}
                                            className="mb-4"
                                        >
                                            <IonIcon icon={locationOutline} slot="start" />
                                            Folosește locația din {firstLocationZone.name}
                                        </IonButton>
                                    );
                                }
                                return null;
                            })()}
                            
                            <LocationPicker
                                value={currentZone.location}
                                onChange={(loc: LocationData) => updateCurrentZone({ location: loc })}
                                autoTrigger={currentEnabledIndex === 1}
                            />
                        </IonCardContent>
                    </IonCard>
                </>
            )}

            {/* Sub-step 5: Zone Summary (before saving) */}
            {currentZone.enabled && zoneSubStep === 5 && (
                <>
                    {/* FAO-56 Ready Status Banner */}
                    {channelStatus.isFao56Ready && (
                        <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                            <IonCardContent className="py-3">
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={checkmarkCircle} color="success" className="text-3xl" />
                                    <div>
                                        <p className="text-cyber-emerald font-bold text-lg">FAO-56 Ready ✓</p>
                                        <p className="text-gray-300 text-sm">All requirements met for automatic ET₀ calculation</p>
                                    </div>
                                </div>
                            </IonCardContent>
                        </IonCard>
                    )}
                    
                    <IonCard className="glass-panel" style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                        <IonCardHeader className="pb-1">
                            <div className="flex items-center gap-3">
                                <IonIcon icon={checkmarkCircleOutline} className="text-2xl text-cyber-emerald" />
                                <IonLabel className="text-lg font-bold text-white">Zone Summary</IonLabel>
                            </div>
                        </IonCardHeader>
                        <IonCardContent className="space-y-3">
                            {/* Mode */}
                            <div className="flex items-center justify-between py-2 border-b border-white/10">
                                <span className="text-gray-400">Mode</span>
                                <div className="flex items-center gap-2">
                                    <IonChip 
                                        color={currentZone.wateringMode?.includes('fao56') ? 'success' : 'primary'}
                                        style={{ margin: 0 }}
                                    >
                                        {WATERING_MODES.find(m => m.mode === currentZone.wateringMode)?.label}
                                    </IonChip>
                                    {channelStatus.isFao56Ready && (
                                        <IonIcon icon={checkmarkCircle} color="success" />
                                    )}
                                </div>
                            </div>

                            {/* FAO-56 specific summary */}
                            {isFao56 && (
                                <>
                                    {/* Plant */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Plant</span>
                                        <div className="text-right">
                                            <span className="text-white">{currentZone.plant?.common_name_en}</span>
                                            <p className="text-xs text-cyber-emerald">
                                                Kc: {currentZone.plant?.kc_ini} → {currentZone.plant?.kc_mid} → {currentZone.plant?.kc_end}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Soil */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Soil</span>
                                        <div className="text-right">
                                            <span className="text-white">{currentZone.soil?.texture}</span>
                                            <p className="text-xs text-gray-400">
                                                {currentZone.soil?.infiltration_rate_mm_h} mm/h infiltration
                                            </p>
                                        </div>
                                    </div>

                                    {/* Irrigation Method */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Irrigation</span>
                                        <div className="text-right">
                                            <span className="text-white">{currentZone.irrigationMethod?.name}</span>
                                            <p className="text-xs text-gray-400">
                                                {currentZone.irrigationMethod?.efficiency_pct}% efficiency
                                            </p>
                                        </div>
                                    </div>

                                    {/* Coverage */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Coverage</span>
                                        <span className="text-white">
                                            {currentZone.coverageValue} {currentZone.coverageType === 'area' ? 'm²' : 'plants'}
                                        </span>
                                    </div>

                                    {/* Sun Exposure */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Sun Exposure</span>
                                        <span className="text-white">{currentZone.sunExposure}%</span>
                                    </div>

                                    {/* Cycle & Soak */}
                                    {currentZone.enableCycleSoak && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <span className="text-gray-400">Cycle & Soak</span>
                                            <div className="flex items-center gap-2">
                                                <IonChip color="tertiary" style={{ margin: 0, height: '24px', fontSize: '0.7rem' }}>
                                                    {currentZone.cycleSoakWateringMin}m / {currentZone.cycleSoakPauseMin}m
                                                </IonChip>
                                                {channelStatus.hasCycleSoak && <IonIcon icon={checkmarkCircle} color="success" />}
                                            </div>
                                        </div>
                                    )}

                                    {/* Max Volume */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Max Volume</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-white">{currentZone.maxVolumeLimit} L</span>
                                            {channelStatus.hasVolumeLimit && <IonIcon icon={checkmarkCircle} color="success" />}
                                        </div>
                                    </div>

                                    {/* Location */}
                                    {currentZone.location && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <span className="text-gray-400">Location</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white text-sm">
                                                    {currentZone.location.latitude.toFixed(2)}°, {currentZone.location.longitude.toFixed(2)}°
                                                </span>
                                                {channelStatus.hasLatitude && <IonIcon icon={checkmarkCircle} color="success" />}
                                            </div>
                                        </div>
                                    )}

                                    {/* Planting Date */}
                                    {currentZone.plantingDate && (
                                        <div className="flex items-center justify-between py-2 border-b border-white/10">
                                            <span className="text-gray-400">Planted</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white">{currentZone.plantingDate.toLocaleDateString()}</span>
                                                {channelStatus.hasPlantingDate && <IonIcon icon={checkmarkCircle} color="success" />}
                                            </div>
                                        </div>
                                    )}

                                    {/* 2.6: Simplified FAO-56 Schedule Preview */}
                                    <div className="mt-3 pt-3 border-t border-white/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <IonIcon icon={timeOutline} className="text-cyber-emerald" />
                                            <span className="text-sm font-medium text-cyber-emerald">Previzualizare program</span>
                                        </div>
                                        <div className="bg-black/30 rounded-lg p-3">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400">Evaluare</span>
                                                <span className="text-white">Zilnic la răsărit 🌅</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm mt-2">
                                                <span className="text-gray-400">Durată estimată</span>
                                                <span className="text-white">~15-45 min / zonă</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2 m-0">
                                                FAO-56 calculează automat necesarul de apă bazat pe vremea locală, 
                                                tip de plantă și caracteristicile solului.
                                            </p>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Duration/Volume mode summary */}
                            {!isFao56 && (
                                <>
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">
                                            {currentZone.wateringMode === 'duration' ? 'Duration' : 'Volume'}
                                        </span>
                                        <span className="text-white text-xl font-bold">
                                            {currentZone.wateringMode === 'duration' 
                                                ? `${currentZone.durationMinutes} min` 
                                                : `${currentZone.volumeLiters} L`}
                                        </span>
                                    </div>

                                    {/* Rain Compensation */}
                                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400 flex items-center gap-2">
                                            <IonIcon icon={rainyOutline} className="text-blue-400" />
                                            Rain Compensation
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {currentZone.rainCompEnabled ? (
                                                <span className="text-cyan-400 text-sm">
                                                    {currentZone.rainCompSensitivity}% • Skip &gt;{currentZone.rainCompSkipThreshold}mm
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Off</span>
                                            )}
                                            {channelStatus.hasRainComp && <IonIcon icon={checkmarkCircle} color="success" />}
                                        </div>
                                    </div>

                                    {/* Temperature Compensation */}
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-gray-400 flex items-center gap-2">
                                            <IonIcon icon={thermometerOutline} className="text-orange-400" />
                                            Temp Compensation
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {currentZone.tempCompEnabled ? (
                                                <span className="text-orange-400 text-sm">
                                                    Base {currentZone.tempCompBaseTemp}°C • {currentZone.tempCompSensitivity}%
                                                </span>
                                            ) : (
                                                <span className="text-gray-500">Off</span>
                                            )}
                                            {channelStatus.hasTempComp && <IonIcon icon={checkmarkCircle} color="success" />}
                                        </div>
                                    </div>
                                </>
                            )}
                        </IonCardContent>
                    </IonCard>

                    {/* Info note */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <IonIcon icon={checkmarkCircleOutline} style={{ color: 'var(--ion-color-success)' }} />
                        <span className="text-sm text-gray-400">
                            Configuration will be saved when you proceed to schedule
                        </span>
                    </div>
                </>
            )}

            {/* Sub-step 6: Schedule Configuration - FULLY SIMPLIFIED for FAO-56 Auto */}
            {currentZone.enabled && zoneSubStep === 6 && (
                <>
                    {/* Enable Schedule */}
                    <IonCard className="glass-panel">
                        <IonCardContent className="py-2">
                            <div className="flex items-center gap-3">
                                <IonIcon icon={calendarOutline} style={{ color: 'var(--ion-color-primary)', fontSize: '1.5rem' }} />
                                <span className="flex-1 font-semibold text-white">Activează programare</span>
                                <IonToggle
                                    checked={scheduleConfigs[currentZoneIndex].enabled}
                                    onIonChange={e => updateCurrentSchedule({ enabled: e.detail.checked })}
                                />
                            </div>
                        </IonCardContent>
                    </IonCard>

                    {scheduleConfigs[currentZoneIndex].enabled && (
                        <>
                            {/* FAO-56 AUTO MODE - Simple card with Solar Time ON by default, no other options shown */}
                            {!showScheduleOptions && scheduleConfigs[currentZoneIndex].scheduleType === 'auto' && isFao56Mode ? (
                                <IonCard className="glass-panel">
                                    <IonCardContent>
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-green-500/20">
                                                <span className="text-2xl">🌅</span>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-bold">FAO-56 Smart Schedule</span>
                                                    <IonBadge color="success" className="text-xs">Auto</IonBadge>
                                                </div>
                                                <p className="text-gray-400 text-sm m-0 mt-1">
                                                    Irigare la {scheduleConfigs[currentZoneIndex].solarEvent === 'sunrise' ? 'răsărit' : 'apus'} • Solar Time ON
                                                </p>
                                                <p className="text-gray-500 text-xs m-0">
                                                    Evaluează zilnic necesarul de apă bazat pe evapotranspirație
                                                </p>
                                            </div>
                                            <IonButton 
                                                fill="outline" 
                                                size="small"
                                                onClick={() => setShowScheduleOptions(true)}
                                            >
                                                Modifică
                                            </IonButton>
                                        </div>
                                    </IonCardContent>
                                </IonCard>
                            ) : (
                                /* ADVANCED OPTIONS - shown when user clicks Modifică or for non-FAO56 modes */
                                <>
                                    {/* Schedule Type Selection */}
                                    <IonCard className="glass-panel">
                                        <IonCardContent>
                                            <IonSegment
                                                value={scheduleConfigs[currentZoneIndex].scheduleType}
                                                onIonChange={e => updateCurrentSchedule({ scheduleType: e.detail.value as 'daily' | 'periodic' | 'auto' })}
                                                color="primary"
                                            >
                                                <IonSegmentButton value="daily">
                                                    <IonLabel style={{ color: scheduleConfigs[currentZoneIndex].scheduleType === 'daily' ? 'var(--ion-color-primary)' : 'white' }}>Zilnic</IonLabel>
                                                </IonSegmentButton>
                                                <IonSegmentButton value="periodic">
                                                    <IonLabel style={{ color: scheduleConfigs[currentZoneIndex].scheduleType === 'periodic' ? 'var(--ion-color-primary)' : 'white' }}>La X zile</IonLabel>
                                                </IonSegmentButton>
                                                {isFao56Mode && (
                                                    <IonSegmentButton value="auto">
                                                        <IonLabel style={{ color: scheduleConfigs[currentZoneIndex].scheduleType === 'auto' ? 'var(--ion-color-primary)' : 'white' }}>FAO-56</IonLabel>
                                                    </IonSegmentButton>
                                                )}
                                            </IonSegment>

                                            {scheduleConfigs[currentZoneIndex].scheduleType === 'daily' && (
                                                <div className="mt-3 flex flex-wrap gap-1 justify-center">
                                                    {DAYS.map((day, i) => (
                                                        <IonChip
                                                            key={day}
                                                            color={(scheduleConfigs[currentZoneIndex].daysMask & (1 << i)) ? 'primary' : 'medium'}
                                                            onClick={() => toggleDay(i)}
                                                            className="m-0"
                                                        >
                                                            {day}
                                                        </IonChip>
                                                    ))}
                                                </div>
                                            )}
                                            {scheduleConfigs[currentZoneIndex].scheduleType === 'periodic' && (
                                                <div className="mt-3 flex items-center justify-center gap-2">
                                                    <span style={{ color: 'white' }}>La fiecare</span>
                                                    <IonInput
                                                        type="number"
                                                        min={1}
                                                        max={14}
                                                        value={scheduleConfigs[currentZoneIndex].daysMask}
                                                        onIonInput={e => updateCurrentSchedule({ 
                                                            daysMask: parseInt(e.detail.value || '2') 
                                                        })}
                                                        className="ion-text-center"
                                                        style={{ maxWidth: '60px', '--color': 'white' }}
                                                    />
                                                    <span style={{ color: 'white' }}>zile</span>
                                                </div>
                                            )}
                                            {scheduleConfigs[currentZoneIndex].scheduleType === 'auto' && (
                                                <p className="mt-3 text-center text-gray-300 text-sm">
                                                    FAO-56 evaluează zilnic deficitul de apă la ora setată.
                                                </p>
                                            )}
                                        </IonCardContent>
                                    </IonCard>

                                    {/* Start Time */}
                                    <IonCard className="glass-panel">
                                        <IonCardContent>
                                            <div className="flex flex-col items-center gap-2">
                                                <p className="text-gray-400 text-sm">Ora de start (fixă / fallback)</p>
                                                <IonButton 
                                                    fill="outline" 
                                                    size="large"
                                                    id={`start-time-trigger-${currentZoneIndex}`}
                                                    style={{ '--border-color': 'var(--ion-color-primary)', fontSize: '1.5rem', minWidth: '120px' }}
                                                >
                                                    <IonIcon icon={timeOutline} slot="start" />
                                                    {String(scheduleConfigs[currentZoneIndex].hour).padStart(2, '0')}:{String(scheduleConfigs[currentZoneIndex].minute).padStart(2, '0')}
                                                </IonButton>
                                                <IonPopover trigger={`start-time-trigger-${currentZoneIndex}`} showBackdrop={true}>
                                                    <TimePicker
                                                        hour={scheduleConfigs[currentZoneIndex].hour}
                                                        minute={scheduleConfigs[currentZoneIndex].minute}
                                                        onChange={(h, m) => updateCurrentSchedule({ hour: h, minute: m })}
                                                        minuteStep={5}
                                                    />
                                                </IonPopover>
                                            </div>
                                    
                                            {/* Solar Time */}
                                            <div className="w-full mt-4">
                                                <IonItem lines="none" className="bg-transparent">
                                                    <IonLabel>
                                                        <h3 className="text-white font-semibold">Solar Time</h3>
                                                        <p className="text-gray-400 text-sm">Pornește la răsărit/apus în loc de oră fixă</p>
                                                    </IonLabel>
                                                    <IonToggle
                                                        checked={scheduleConfigs[currentZoneIndex].useSolarTiming}
                                                        onIonChange={e => updateCurrentSchedule({ useSolarTiming: e.detail.checked })}
                                                    />
                                                </IonItem>
                                                {scheduleConfigs[currentZoneIndex].useSolarTiming && (
                                                    <div className="mt-2 space-y-2">
                                                        <IonSelect
                                                            value={scheduleConfigs[currentZoneIndex].solarEvent}
                                                            onIonChange={e => updateCurrentSchedule({ solarEvent: e.detail.value as 'sunrise' | 'sunset' })}
                                                        >
                                                            <IonSelectOption value="sunrise">Răsărit 🌅</IonSelectOption>
                                                            <IonSelectOption value="sunset">Apus 🌇</IonSelectOption>
                                                        </IonSelect>
                                                        <IonItem lines="none" className="bg-transparent">
                                                            <IonLabel position="stacked">Offset (minute)</IonLabel>
                                                            <IonInput
                                                                type="number"
                                                                min={-120}
                                                                max={120}
                                                                value={scheduleConfigs[currentZoneIndex].solarOffsetMinutes}
                                                                onIonInput={e => updateCurrentSchedule({ 
                                                                    solarOffsetMinutes: parseInt(e.detail.value || '0') 
                                                                })}
                                                                placeholder="-120 .. 120"
                                                            />
                                                        </IonItem>
                                                    </div>
                                                )}
                                            </div>
                                        </IonCardContent>
                                    </IonCard>
                                    
                                    {/* Back to Auto button */}
                                    {isFao56Mode && showScheduleOptions && scheduleConfigs[currentZoneIndex].scheduleType === 'auto' && (
                                        <div className="text-center">
                                            <IonButton 
                                                fill="clear" 
                                                size="small"
                                                onClick={() => setShowScheduleOptions(false)}
                                            >
                                                ← Înapoi la Auto simplificat
                                            </IonButton>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
    };

    // ========================================================================
    // Render Phase 3: Schedule Configuration (kept for legacy, not used in flow)
    // ========================================================================
    
    const currentSchedule = scheduleConfigs[currentZoneIndex];

    const renderPhase3 = () => (
        <div className="p-4 space-y-4">
            {/* Schedule Header */}
            <div className="text-center mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <IonIcon icon={timeOutline} className="text-3xl text-cyber-emerald" />
                    <h2 className="text-2xl font-bold text-white">
                        Schedule: {zoneConfigs[currentZoneIndex].name}
                    </h2>
                </div>
                <p className="text-gray-400">Configure watering schedule</p>
            </div>

            {/* Enable Schedule */}
            <IonCard className="glass-panel">
                <IonCardContent>
                    <IonItem lines="none" className="bg-transparent">
                        <IonLabel>
                            <h2>Enable Schedule</h2>
                            <p className="text-gray-400 text-sm">Automatic watering for this zone</p>
                        </IonLabel>
                        <IonToggle
                            checked={currentSchedule.enabled}
                            onIonChange={e => updateCurrentSchedule({ enabled: e.detail.checked })}
                        />
                    </IonItem>
                </IonCardContent>
            </IonCard>

            {currentSchedule.enabled && (
                <>
                    {/* Schedule Type */}
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <IonLabel className="text-lg font-bold text-white">Schedule Type</IonLabel>
                        </IonCardHeader>
                        <IonCardContent>
                            <IonSegment
                                value={currentSchedule.scheduleType}
                                onIonChange={e => updateCurrentSchedule({ scheduleType: e.detail.value as 'daily' | 'periodic' | 'auto' })}
                            >
                                <IonSegmentButton value="daily">
                                    <IonLabel>Daily</IonLabel>
                                </IonSegmentButton>
                                <IonSegmentButton value="periodic">
                                    <IonLabel>Every X Days</IonLabel>
                                </IonSegmentButton>
                                {(zoneConfigs[currentZoneIndex].wateringMode === 'fao56_auto' || zoneConfigs[currentZoneIndex].wateringMode === 'fao56_eco') && (
                                    <IonSegmentButton value="auto">
                                        <IonLabel>FAO-56 Smart</IonLabel>
                                    </IonSegmentButton>
                                )}
                            </IonSegment>

                            {currentSchedule.scheduleType === 'daily' && (
                                <div className="mt-4">
                                    <p className="text-gray-400 text-sm mb-2">Select days:</p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {DAYS.map((day, i) => (
                                            <IonChip
                                                key={day}
                                                color={(currentSchedule.daysMask & (1 << i)) ? 'primary' : 'medium'}
                                                onClick={() => toggleDay(i)}
                                            >
                                                {day}
                                            </IonChip>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {currentSchedule.scheduleType === 'periodic' && (
                                <IonItem lines="none" className="bg-transparent mt-4">
                                    <IonLabel position="stacked">Interval (days)</IonLabel>
                                    <IonInput
                                        type="number"
                                        min={1}
                                        max={14}
                                        value={currentSchedule.daysMask}
                                        onIonInput={e => updateCurrentSchedule({ 
                                            daysMask: parseInt(e.detail.value || '2') 
                                        })}
                                    />
                                </IonItem>
                            )}
                            {currentSchedule.scheduleType === 'auto' && (
                                <p className="text-gray-300 text-sm mt-4">
                                    FAO-56 Auto ruleaza zilnic la ora setata.
                                </p>
                            )}
                        </IonCardContent>
                    </IonCard>

                    {/* Start Time */}
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={timeOutline} className="text-2xl text-cyber-blue" />
                                <IonLabel className="text-lg font-bold text-white">Start Time</IonLabel>
                            </div>
                        </IonCardHeader>
                        <IonCardContent>
                            <div className="flex gap-4 items-center justify-center">
                                <IonInput
                                    type="number"
                                    min={0}
                                    max={23}
                                    value={currentSchedule.hour}
                                    onIonInput={e => updateCurrentSchedule({ 
                                        hour: parseInt(e.detail.value || '6') 
                                    })}
                                    className="w-20 text-center"
                                />
                                <span className="text-white text-2xl">:</span>
                                <IonInput
                                    type="number"
                                    min={0}
                                    max={59}
                                    step="5"
                                    value={currentSchedule.minute}
                                    onIonInput={e => updateCurrentSchedule({ 
                                        minute: parseInt(e.detail.value || '0') 
                                    })}
                                    className="w-20 text-center"
                                />
                            </div>
                            <p className="text-center text-gray-400 text-sm mt-2">
                                {String(currentSchedule.hour).padStart(2, '0')}:{String(currentSchedule.minute).padStart(2, '0')}
                            </p>
                        </IonCardContent>
                    </IonCard>

                    {/* Solar timing */}
                    <IonCard className="glass-panel">
                        <IonCardContent>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel>
                                    <h2>Orar solar</h2>
                                    <p className="text-gray-400 text-sm">Ruleaza fata de rasarit/apus</p>
                                </IonLabel>
                                <IonToggle
                                    checked={currentSchedule.useSolarTiming}
                                    onIonChange={e => updateCurrentSchedule({ useSolarTiming: e.detail.checked })}
                                />
                            </IonItem>
                            {currentSchedule.useSolarTiming && (
                                <div className="mt-3 space-y-2">
                                    <IonSelect
                                        value={currentSchedule.solarEvent}
                                        onIonChange={e => updateCurrentSchedule({ solarEvent: e.detail.value as 'sunrise' | 'sunset' })}
                                    >
                                        <IonSelectOption value="sunrise">Rasarit</IonSelectOption>
                                        <IonSelectOption value="sunset">Apus</IonSelectOption>
                                    </IonSelect>
                                    <IonInput
                                        type="number"
                                        min={-120}
                                        max={120}
                                        value={currentSchedule.solarOffsetMinutes}
                                        onIonInput={e => updateCurrentSchedule({ 
                                            solarOffsetMinutes: parseInt(e.detail.value || '0') 
                                        })}
                                        placeholder="Offset minute (-120..120)"
                                    />
                                </div>
                            )}
                        </IonCardContent>
                    </IonCard>

                    {/* Solar timing */}
                    <IonCard className="glass-panel">
                        <IonCardContent>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel>
                                    <h2>Solar Time</h2>
                                    <p className="text-gray-400 text-sm">Ruleaz? relativ la r?s?rit/apus</p>
                                </IonLabel>
                                <IonToggle
                                    checked={currentSchedule.useSolarTiming}
                                    onIonChange={e => updateCurrentSchedule({ useSolarTiming: e.detail.checked })}
                                />
                            </IonItem>
                            {currentSchedule.useSolarTiming && (
                                <div className="space-y-2 mt-2">
                                    <IonSelect
                                        value={currentSchedule.solarEvent}
                                        onIonChange={e => updateCurrentSchedule({ solarEvent: e.detail.value as 'sunrise' | 'sunset' })}
                                    >
                                        <IonSelectOption value="sunrise">R?s?rit</IonSelectOption>
                                        <IonSelectOption value="sunset">Apus</IonSelectOption>
                                    </IonSelect>
                                    <IonInput
                                        type="number"
                                        min={-120}
                                        max={120}
                                        value={currentSchedule.solarOffsetMinutes}
                                        onIonInput={e => updateCurrentSchedule({ 
                                            solarOffsetMinutes: parseInt(e.detail.value || '0') 
                                        })}
                                        placeholder="Offset minute (-120..120)"
                                    />
                                </div>
                            )}
                        </IonCardContent>
                    </IonCard>

                    {/* Watering Amount */}
                    {!(currentSchedule.scheduleType === 'auto' || zoneConfigs[currentZoneIndex].wateringMode === 'fao56_auto' || zoneConfigs[currentZoneIndex].wateringMode === 'fao56_eco') && (
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <div className="flex items-center gap-3">
                                    <IonIcon icon={waterOutline} className="text-2xl text-blue-400" />
                                    <IonLabel className="text-lg font-bold text-white">Watering Amount</IonLabel>
                                </div>
                            </IonCardHeader>
                            <IonCardContent className="space-y-4">
                                <IonSegment
                                    value={currentSchedule.wateringMode}
                                    onIonChange={e => updateCurrentSchedule({ wateringMode: e.detail.value as 'duration' | 'volume' })}
                                >
                                    <IonSegmentButton value="duration">
                                        <IonLabel>Duration (min)</IonLabel>
                                    </IonSegmentButton>
                                    <IonSegmentButton value="volume">
                                        <IonLabel>Volume (L)</IonLabel>
                                    </IonSegmentButton>
                                </IonSegment>

                                <IonItem lines="none" className="bg-transparent">
                                    <IonLabel position="stacked">
                                        {currentSchedule.wateringMode === 'duration' ? 'Duration (minutes)' : 'Volume (liters)'}
                                    </IonLabel>
                                    <IonInput
                                        type="number"
                                        value={currentSchedule.value}
                                        onIonInput={e => updateCurrentSchedule({ 
                                            value: parseInt(e.detail.value || '15') 
                                        })}
                                    />
                                </IonItem>
                            </IonCardContent>
                        </IonCard>
                    )}

                    {/* Auto Calculation */}
                    <IonCard className="glass-panel">
                        <IonCardContent>
                            <IonItem lines="none" className="bg-transparent">
                                <IonLabel>
                                    <h2>FAO-56 Auto Calculation</h2>
                                    <p className="text-gray-400 text-sm">
                                        Automatically adjust watering based on weather and plant needs
                                    </p>
                                </IonLabel>
                                <IonToggle
                                    checked={currentSchedule.autoCalcEnabled}
                                    onIonChange={e => updateCurrentSchedule({ autoCalcEnabled: e.detail.checked })}
                                />
                            </IonItem>
                        </IonCardContent>
                    </IonCard>
                </>
            )}
        </div>
    );

    // ========================================================================
    // Render Phase 4: Complete
    // ========================================================================
    
    const renderComplete = () => (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-20 h-20 bg-cyber-emerald/20 rounded-full flex items-center justify-center mb-6">
                <IonIcon icon={checkmarkCircle} className="text-4xl text-cyber-emerald" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">All Set!</h2>
            <p className="text-gray-400 mb-8">
                Your irrigation system is fully configured. You can now monitor and control everything from the dashboard.
            </p>
            <IonButton expand="block" color="secondary" onClick={onClose}>
                Go to Dashboard
            </IonButton>
        </div>
    );

    // ========================================================================
    // Error Handling
    // ========================================================================
    
    const getValidationError = (): { message: string; fixAction?: () => void; fixLabel?: string } | null => {
        if (phase !== 2) return null;
        
        const zone = zoneConfigs[currentZoneIndex];
        if (!zone.enabled) return null;
        
        const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
        
        if (isFao56) {
            // Step 1 = Plant selection
            if (zoneSubStep === 1 && !zone.plant) {
                return {
                    message: 'Selectează o plantă',
                    fixLabel: 'Selectează'
                };
            }
            // Step 3 = Soil & Irrigation (NOT step 2 which is Location!)
            if (zoneSubStep === 3) {
                if (!zone.soil && !zone.irrigationMethod) {
                    return {
                        message: 'Selectează tipul de sol și metoda de irigare'
                    };
                }
                if (!zone.soil) {
                    return {
                        message: 'Selectează tipul de sol'
                    };
                }
                if (!zone.irrigationMethod) {
                    return {
                        message: 'Selectează metoda de irigare'
                    };
                }
            }
        }
        
        return null;
    };

    const renderErrorBanner = () => {
        const error = getValidationError();
        if (!error) return null;
        
        return (
            <IonCard style={{ 
                '--background': 'rgba(239, 68, 68, 0.15)', 
                border: '1px solid rgba(239, 68, 68, 0.5)',
                margin: '0 16px 16px 16px'
            }}>
                <IonCardContent className="py-3">
                    <div className="flex items-center gap-3">
                        <IonIcon 
                            icon={alertCircleOutline} 
                            style={{ color: '#ef4444', fontSize: '2rem' }} 
                        />
                        <div className="flex-1">
                            <p style={{ color: '#fca5a5', fontWeight: 500, margin: 0 }}>
                                {error.message}
                            </p>
                        </div>
                        {error.fixAction && (
                            <IonButton 
                                size="small" 
                                color="danger"
                                onClick={error.fixAction}
                            >
                                {error.fixLabel || 'Fix'}
                            </IonButton>
                        )}
                    </div>
                </IonCardContent>
            </IonCard>
        );
    };

    // ========================================================================
    // Main Render
    // ========================================================================
    
    const canProceed = () => {
        if (phase === 0 || phase === 1 || phase === 4) return true;
        if (phase === 2) {
            const zone = zoneConfigs[currentZoneIndex];
            if (!zone.enabled) return true; // Can skip disabled zones
            
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            
            // Sub-step 0: mode selection - always can proceed
            if (zoneSubStep === 0) return true;
            
            if (isFao56) {
                // Sub-step 1: Plant - need plant selected
                if (zoneSubStep === 1) return zone.plant !== null;
                // Sub-step 2: Location - optional but recommended
                if (zoneSubStep === 2) return true;
                // Sub-step 3: Soil & Irrigation - need both
                if (zoneSubStep === 3) return zone.soil !== null && zone.irrigationMethod !== null;
                // Sub-step 4, 5, 6: always valid
                return true;
            } else {
                // Duration/Volume - always valid
                return true;
            }
        }
        return false;
    };

    const getNextButtonText = () => {
        if (phase === 0) {
            // If anything is already configured, show "Continue" instead of "Get Started"
            return hasAnyConfiguration ? t('common.next') : t('wizard.welcome.startButton');
        }
        if (phase === 1) return t('common.next');
        if (phase === 2) {
            const zone = zoneConfigs[currentZoneIndex];
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            
            if (!zone.enabled) return t('common.skip');
            
            if (zoneSubStep === 0) return t('common.next');
            
            if (isFao56) {
                if (zoneSubStep === 1) return t('common.next');
                if (zoneSubStep === 2) return t('common.next');
                if (zoneSubStep === 3) return t('common.next');
                if (zoneSubStep === 4) return t('common.next');
                if (zoneSubStep === 5) return t('common.save');
            } else {
                if (zoneSubStep === 1) return t('common.next');
                if (zoneSubStep === 5) return t('common.save');
            }
            
            if (zoneSubStep === 6) return t('common.save');
        }
        return t('common.next');
    };

    const getPhaseTitle = () => {
        if (phase === 0) return t('wizard.phases.welcome');
        if (phase === 1) return t('wizard.phases.system');
        if (phase === 2) {
            const zone = zoneConfigs[currentZoneIndex];
            const isFao56 = zone.wateringMode === 'fao56_auto' || zone.wateringMode === 'fao56_eco';
            
            const stepNames = isFao56 
                ? [t('wizard.steps.mode'), t('wizard.steps.plant'), t('wizard.steps.location'), t('wizard.steps.soil'), t('wizard.steps.environment'), t('wizard.summary.title'), t('wizard.steps.schedule')]
                : [t('wizard.steps.mode'), 'Settings', '', '', '', t('wizard.summary.title'), t('wizard.steps.schedule')];
            
            return `${t('wizard.phases.zones').replace('Zone', '')} ${currentZoneIndex + 1} - ${stepNames[zoneSubStep]}`;
        }
        if (phase === 4) return t('wizard.phases.complete');
        return 'Setup Wizard';
    };

    // 1.4: Handle close with confirmation if unsaved changes
    const handleCloseWithConfirm = () => {
        const hasProgress = phase > 0 || zoneConfigs.some(z => z.plant || z.soil || z.irrigationMethod);
        if (hasProgress && phase < 4) {
            setShowExitConfirm(true);
        } else {
            onClose();
        }
    };
    
    // 3.6: Keyboard navigation
    useKeyboardNavigation({
        onNext: handleNext,
        onBack: handleBack,
        onEscape: handleCloseWithConfirm,
        enabled: isOpen && phase >= 0 && phase < 4
    });

    return (
        <IonModal isOpen={isOpen} backdropDismiss={false} className="glass-modal">
            <IonHeader className="ion-no-border">
                <IonToolbar className="bg-cyber-dark" style={{ '--background': '#0f172a' }}>
                    <IonTitle className="text-white">{getPhaseTitle()}</IonTitle>
                    {/* 4.1: Language selector */}
                    <IonButtons slot="end">
                        <LanguageSelector variant="compact" />
                    </IonButtons>
                    {/* 1.1: Show close button on ALL phases except completion */}
                    {phase < 4 && (
                        <IonButtons slot="end">
                            <IonButton 
                                onClick={handleCloseWithConfirm}
                                aria-label={t('a11y.closeButton')}
                            >
                                <IonIcon icon={close} />
                            </IonButton>
                        </IonButtons>
                    )}
                </IonToolbar>
                {phase > 0 && phase < 4 && (
                    <IonProgressBar 
                        value={progress} 
                        color="secondary" 
                        aria-label={t('a11y.progressBar')}
                    />
                )}
            </IonHeader>

            <IonContent className="bg-cyber-dark">
                {/* Error Banner */}
                {renderErrorBanner()}
                
                {phase === 0 && renderWelcome()}
                {phase === 1 && renderPhase1()}
                {phase === 2 && renderPhase2()}
                {phase === 4 && renderComplete()}
            </IonContent>

            {/* Footer Navigation - show for phases 0-2 */}
            {phase < 4 && (
                <div className="bg-cyber-dark border-t border-white/10 p-4 flex justify-between items-center">
                    {phase > 0 ? (
                        <IonButton 
                            fill="clear" 
                            color="medium" 
                            onClick={handleBack}
                            aria-label={t('a11y.previousStep')}
                        >
                            <IonIcon icon={chevronBack} slot="start" />
                            {t('common.back')}
                        </IonButton>
                    ) : (
                        <div></div>
                    )}
                    
                    <div className="text-center">
                        <span className="text-gray-400 text-sm">
                            {phase === 0 ? t('wizard.phases.welcome') : phase === 1 ? t('wizard.phases.system') : `Zone ${currentZoneIndex + 1}/8`}
                        </span>
                    </div>

                    <IonButton 
                        color="secondary" 
                        onClick={handleNext}
                        disabled={!canProceed() || saving}
                        aria-label={t('a11y.nextStep')}
                    >
                        {saving ? (
                            <IonSpinner name="crescent" />
                        ) : (
                            <>
                                {getNextButtonText()}
                                <IonIcon icon={chevronForward} slot="end" />
                            </>
                        )}
                    </IonButton>
                </div>
            )}
            
            {/* Zone Complete Alert */}
            <IonAlert
                isOpen={showZoneCompleteAlert}
                onDidDismiss={() => setShowZoneCompleteAlert(false)}
                header={`Zone ${currentZoneIndex + 1} Complete! ✓`}
                message={currentZoneIndex < 7 
                    ? `You have configured ${currentZoneIndex + 1} zone${currentZoneIndex > 0 ? 's' : ''}. Would you like to add another zone or finish the setup?`
                    : 'All 8 zones have been configured!'
                }
                buttons={currentZoneIndex < 7 ? [
                    {
                        text: 'Finish Setup',
                        role: 'cancel',
                        handler: handleFinishSetup
                    },
                    {
                        text: 'Configure More Zones',
                        handler: handleAddAnotherZone
                    }
                ] : [
                    {
                        text: 'Complete Setup',
                        handler: handleFinishSetup
                    }
                ]}
            />
            
            {/* 1.4: Exit Confirmation Alert */}
            <IonAlert
                isOpen={showExitConfirm}
                onDidDismiss={() => setShowExitConfirm(false)}
                header={t('wizard.exitConfirmTitle')}
                message={t('wizard.exitConfirmMessage')}
                buttons={[
                    {
                        text: t('wizard.exitConfirmCancel'),
                        role: 'cancel'
                    },
                    {
                        text: t('wizard.exitConfirmExit'),
                        role: 'destructive',
                        handler: onClose
                    }
                ]}
            />
        </IonModal>
    );
};

export default OnboardingWizard;
