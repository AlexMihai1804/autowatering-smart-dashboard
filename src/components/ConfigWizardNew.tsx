// ============================================================================
// Channel Configuration Wizard
// Unified wizard for configuring zones with 4 watering modes:
// - FAO-56 Auto: Full automated calculation with weather compensation
// - FAO-56 Eco: Water-saving mode with reduced irrigation
// - Duration: Simple time-based watering
// - Volume: Flow-based watering with target volume
// ============================================================================

import React, { useState, useMemo, useCallback } from 'react';
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
    IonItem,
    IonLabel,
    IonIcon,
    IonCard,
    IonCardContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonChip,
    IonText,
    IonGrid,
    IonRow,
    IonCol,
    IonProgressBar,
    IonAlert,
    IonDatetime,
    IonPopover,
    IonSegment,
    IonSegmentButton,
    IonRange,
    IonSpinner,
    IonToast
} from '@ionic/react';
import {
    close,
    checkmark,
    leafOutline,
    waterOutline,
    timerOutline,
    speedometerOutline,
    locationOutline,
    calendarOutline,
    checkmarkCircleOutline,
    chevronForward,
    chevronBack,
    playSkipForwardOutline,
    playSkipForwardCircleOutline,
    alertCircleOutline,
    sunnyOutline
} from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { LocationPicker } from './LocationPicker';
import {
    WateringMode,
    WizardStep,
    UnifiedZoneConfig,
    ScheduleConfig,
    ScheduleType,
    isFao56Mode,
    getStepsForMode,
    canProceedFromStep,
    WATERING_MODE_LABELS,
    WATERING_MODE_DESCRIPTIONS,
    DEFAULT_SCHEDULE
} from '../types/wizard';
import {
    validateZoneConfig,
    formatTime,
    generateZoneSummary,
    parseDaysMask,
    createDaysMask
} from '../utils/wizardHelpers';
import { BleService } from '../services/BleService';
import {
    ScheduleConfigData,
    GrowingEnvData,
    ChannelConfigData,
    AutoMode,
    ScheduleType as FirmwareScheduleType,
    WateringMode as FirmwareWateringMode
} from '../types/firmware_structs';
import { useI18n } from '../i18n';

// ============================================================================
// Mode Card Component
// ============================================================================

interface ModeCardProps {
    mode: WateringMode;
    selected: boolean;
    onSelect: () => void;
}

const ModeCard: React.FC<ModeCardProps> = ({ mode, selected, onSelect }) => {
    const { t } = useI18n();
    const icons: Record<WateringMode, string> = {
        'fao56_auto': leafOutline,
        'fao56_eco': waterOutline,
        'duration': timerOutline,
        'volume': speedometerOutline
    };

    const colors: Record<WateringMode, string> = {
        'fao56_auto': 'success',
        'fao56_eco': 'tertiary',
        'duration': 'primary',
        'volume': 'secondary'
    };

    return (
        <IonCard
            button
            onClick={onSelect}
            style={{
                border: selected ? '2px solid var(--ion-color-primary)' : '1px solid var(--ion-color-medium)',
                backgroundColor: selected ? 'var(--ion-color-primary-tint)' : undefined
            }}
        >
            <IonCardContent>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <IonIcon
                        icon={icons[mode]}
                        color={colors[mode]}
                        style={{ fontSize: '32px' }}
                    />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                            {t(WATERING_MODE_LABELS[mode])}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                            {t(WATERING_MODE_DESCRIPTIONS[mode])}
                        </div>
                    </div>
                    {selected && (
                        <IonIcon icon={checkmarkCircleOutline} color="primary" style={{ fontSize: '24px' }} />
                    )}
                </div>
            </IonCardContent>
        </IonCard>
    );
};

// ============================================================================
// Schedule Editor Component (using bitmask-based ScheduleConfig)
// ============================================================================

interface ScheduleEditorProps {
    schedule: ScheduleConfig;
    onChange: (schedule: ScheduleConfig) => void;
    wateringMode: WateringMode;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ schedule, onChange, wateringMode }) => {
    const { t } = useI18n();
    const days = parseDaysMask(schedule.daysMask);
    const canUseAuto = wateringMode === 'fao56_auto' || wateringMode === 'fao56_eco';

    const toggleDay = (day: keyof typeof days) => {
        const newDays = { ...days, [day]: !days[day] };
        onChange({ ...schedule, daysMask: createDaysMask(newDays) });
    };

    const setAllDays = (value: boolean) => {
        const mask = value ? 0b1111111 : 0;
        onChange({ ...schedule, daysMask: mask });
    };

    const dayButtons: Array<{ key: keyof typeof days; label: string }> = [
        { key: 'monday', label: t('wizard.schedule.days.mon') },
        { key: 'tuesday', label: t('wizard.schedule.days.tue') },
        { key: 'wednesday', label: t('wizard.schedule.days.wed') },
        { key: 'thursday', label: t('wizard.schedule.days.thu') },
        { key: 'friday', label: t('wizard.schedule.days.fri') },
        { key: 'saturday', label: t('wizard.schedule.days.sat') },
        { key: 'sunday', label: t('wizard.schedule.days.sun') }
    ];

    const isManualMode = wateringMode === 'duration' || wateringMode === 'volume';
    const scheduleTypeValue = canUseAuto ? schedule.type : (schedule.type === 'auto' ? 'daily' : schedule.type);
    const showValueInput = isManualMode && schedule.type !== 'auto';

    return (
        <div>
            {/* Enable toggle */}
            <IonItem>
                <IonLabel>{t('wizard.schedule.enable')}</IonLabel>
                <IonToggle
                    checked={schedule.enabled}
                    onIonChange={(e) => onChange({ ...schedule, enabled: e.detail.checked })}
                />
            </IonItem>

            {schedule.enabled && (
                <>
                    {/* Schedule Type */}
                    <IonItem style={{ marginTop: '12px' }}>
                        <IonLabel>{t('wizard.schedule.scheduleType')}</IonLabel>
                        <IonSelect
                            value={scheduleTypeValue}
                            onIonChange={(e) => onChange({ ...schedule, type: e.detail.value as ScheduleType })}
                        >
                            <IonSelectOption value="daily">{t('wizard.schedule.daily')}</IonSelectOption>
                            <IonSelectOption value="periodic">{t('wizard.schedule.periodic')}</IonSelectOption>
                            {canUseAuto && <IonSelectOption value="auto">{t('wizard.schedule.auto')}</IonSelectOption>}
                        </IonSelect>
                    </IonItem>

                    {/* Days of Week (for daily type) */}
                    {schedule.type === 'daily' && (
                        <div style={{ marginTop: '12px', padding: '0 16px' }}>
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <IonLabel>{t('wizard.schedule.selectDays')}</IonLabel>
                                <div>
                                    <IonButton fill="clear" size="small" onClick={() => setAllDays(true)}>{t('common.all')}</IonButton>
                                    <IonButton fill="clear" size="small" onClick={() => setAllDays(false)}>{t('wizard.schedule.none')}</IonButton>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {dayButtons.map(({ key, label }) => (
                                    <IonChip
                                        key={key}
                                        color={days[key] ? 'primary' : 'medium'}
                                        onClick={() => toggleDay(key)}
                                    >
                                        {label}
                                    </IonChip>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interval days (for periodic type) */}
                    {schedule.type === 'periodic' && (
                        <IonItem>
                            <IonLabel position="stacked">{t('wizard.schedule.intervalDays')}</IonLabel>
                            <IonInput
                                type="number"
                                value={schedule.daysMask || 2}
                                min={1}
                                max={30}
                                onIonChange={(e) => onChange({ ...schedule, daysMask: parseInt(e.detail.value || '2') })}
                            />
                        </IonItem>
                    )}

                    {/* Start Time */}
                    <IonGrid style={{ marginTop: '12px' }}>
                        <IonRow>
                            <IonCol size="6">
                                <IonItem>
                                    <IonLabel position="stacked">{t('wizard.schedule.startTimeDesc')}</IonLabel>
                                    <IonInput
                                        type="number"
                                        value={schedule.hour}
                                        min={0}
                                        max={23}
                                        onIonChange={(e) => onChange({ ...schedule, hour: parseInt(e.detail.value || '6') })}
                                    />
                                </IonItem>
                            </IonCol>
                            <IonCol size="6">
                                <IonItem>
                                    <IonLabel position="stacked">{t('timePicker.minute')}</IonLabel>
                                    <IonInput
                                        type="number"
                                        value={schedule.minute}
                                        min={0}
                                        max={59}
                                        onIonChange={(e) => onChange({ ...schedule, minute: parseInt(e.detail.value || '0') })}
                                    />
                                </IonItem>
                            </IonCol>
                        </IonRow>
                    </IonGrid>

                    {/* Solar timing */}
                    <IonItem lines="inset">
                        <IonLabel>{t('wizard.schedule.solarTime')}</IonLabel>
                        <IonToggle
                            checked={schedule.useSolarTiming}
                            onIonChange={(e) => onChange({ ...schedule, useSolarTiming: e.detail.checked })}
                        />
                    </IonItem>
                    {schedule.useSolarTiming && (
                        <>
                            <IonItem>
                                <IonLabel position="stacked">{t('wizard.schedule.solarEvent')}</IonLabel>
                                <IonSelect
                                    value={schedule.solarEvent}
                                    onIonChange={(e) => onChange({ ...schedule, solarEvent: e.detail.value as 'sunrise' | 'sunset' })}
                                >
                                    <IonSelectOption value="sunrise">{t('wizard.schedule.sunrise')}</IonSelectOption>
                                    <IonSelectOption value="sunset">{t('wizard.schedule.sunset')}</IonSelectOption>
                                </IonSelect>
                            </IonItem>
                            <IonItem>
                                <IonLabel position="stacked">{t('wizard.schedule.offsetMinutes')}</IonLabel>
                                <IonInput
                                    type="number"
                                    value={schedule.solarOffsetMinutes}
                                    min={-120}
                                    max={120}
                                    placeholder={t('wizard.schedule.offsetPlaceholder')}
                                    onIonChange={(e) => onChange({ ...schedule, solarOffsetMinutes: parseInt(e.detail.value || '0') })}
                                />
                            </IonItem>
                        </>
                    )}

                    {/* Duration/Volume value (for manual modes) */}
                    {showValueInput && (
                        <IonItem style={{ marginTop: '12px' }}>
                            <IonLabel position="stacked">
                                {wateringMode === 'duration' ? t('wizard.schedule.durationMinutes') : t('wizard.schedule.volumeLiters')}
                            </IonLabel>
                            <IonInput
                                type="number"
                                value={schedule.value}
                                min={1}
                                onIonChange={(e) => onChange({ ...schedule, value: parseFloat(e.detail.value || '15') })}
                            />
                        </IonItem>
                    )}
                </>
            )}
        </div>
    );
};
// ============================================================================
// Zone Summary Card Component
// ============================================================================

interface ZoneSummaryCardProps {
    config: UnifiedZoneConfig;
    index: number;
    isCurrentZone: boolean;
    onClick?: () => void;
}

const ZoneSummaryCard: React.FC<ZoneSummaryCardProps> = ({ config, index, isCurrentZone, onClick }) => {
    const { t, language } = useI18n();
    const validation = validateZoneConfig(config, t);
    const summaryLines = generateZoneSummary(config, { t, language });

    return (
        <IonCard
            button={!!onClick}
            onClick={onClick}
            style={{
                border: isCurrentZone ? '2px solid var(--ion-color-primary)' : undefined,
                opacity: config.skipped ? 0.5 : 1
            }}
        >
            <IonCardContent>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                            {config.name || `${t('zones.zone')} ${index + 1}`}
                        </div>
                        {config.skipped ? (
                            <IonText color="medium">
                                <small>{t('common.skipped')}</small>
                            </IonText>
                        ) : (
                            <div style={{ fontSize: '13px', color: 'var(--ion-color-medium)' }}>
                                {summaryLines.map((line: string, i: number) => (
                                    <div key={i}>{line}</div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        {config.skipped ? (
                            <IonIcon icon={playSkipForwardOutline} color="medium" />
                        ) : validation.valid ? (
                            <IonIcon icon={checkmarkCircleOutline} color="success" />
                        ) : (
                            <IonIcon icon={alertCircleOutline} color="warning" />
                        )}
                    </div>
                </div>
            </IonCardContent>
        </IonCard>
    );
};

// ============================================================================
// Main ConfigWizard Component
// ============================================================================

const ConfigWizard: React.FC = () => {
    // BLE Service
    const ble = BleService.getInstance();
    const { t, language } = useI18n();
    const locale = language === 'ro' ? 'ro-RO' : 'en-US';
    
    // Store
    const {
        channelWizard,
        plantDb,
        soilDb,
        irrigationMethodDb,
        connectionState,
        updateCurrentZoneConfig,
        setWizardStep,
        nextWizardStep,
        prevWizardStep,
        skipCurrentZone,
        skipAllRemainingZones,
        saveAndNextZone,
        setSharedLocation,
        goToFinalSummary,
        finishChannelWizard,
        closeChannelWizard
    } = useAppStore();

    // Local state
    const [plantSearch, setPlantSearch] = useState('');
    const [soilSearch, setSoilSearch] = useState('');
    const [showSkipAllAlert, setShowSkipAllAlert] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Current zone config
    const currentConfig = channelWizard.zones[channelWizard.currentZoneIndex] || null;
    const currentStep = channelWizard.currentStep;
    const steps = currentConfig ? getStepsForMode(currentConfig.wateringMode) : [];
    const currentStepIndex = steps.indexOf(currentStep);
    const totalZones = channelWizard.zones.length;

    // Filtered plant/soil lists
    const filteredPlants = useMemo(() => {
        if (!plantSearch) return plantDb.slice(0, 30);
        const q = plantSearch.toLowerCase();
        return plantDb.filter(p =>
            p.common_name_en.toLowerCase().includes(q) ||
            p.common_name_ro.toLowerCase().includes(q) ||
            p.scientific_name?.toLowerCase().includes(q) ||
            p.category?.toLowerCase().includes(q)
        ).slice(0, 50);
    }, [plantDb, plantSearch]);

    const filteredSoils = useMemo(() => {
        if (!soilSearch) return soilDb;
        const q = soilSearch.toLowerCase();
        return soilDb.filter(s =>
            s.texture.toLowerCase().includes(q)
        );
    }, [soilDb, soilSearch]);

    // Can proceed validation
    const canProceed = currentConfig ? canProceedFromStep(currentStep, currentConfig).canProceed : false;

    // Is on final summary
    const isOnFinalSummary = channelWizard.phase === 'final_summary';

    // Progress calculation
    const progress = useMemo(() => {
        if (isOnFinalSummary) return 1;
        const zoneProgress = channelWizard.currentZoneIndex / totalZones;
        const stepProgress = steps.length > 0 ? (currentStepIndex + 1) / steps.length / totalZones : 0;
        return zoneProgress + stepProgress;
    }, [channelWizard.currentZoneIndex, totalZones, currentStepIndex, steps.length, isOnFinalSummary]);

    // ========================================================================
    // Handlers
    // ========================================================================

    const handleModeSelect = (mode: WateringMode) => {
        updateCurrentZoneConfig({ wateringMode: mode });
    };

    const handlePlantSelect = (plant: any) => {
        updateCurrentZoneConfig({ plant });
    };

    const handleSoilSelect = (soil: any) => {
        updateCurrentZoneConfig({ soil });
    };

    const handleIrrigationSelect = (method: any) => {
        updateCurrentZoneConfig({ irrigationMethod: method });
    };

    const handleLocationChange = (location: any) => {
        updateCurrentZoneConfig({ location });
        // Also set as shared location if first zone
        if (channelWizard.currentZoneIndex === 0) {
            setSharedLocation(location);
        }
    };

    const handleScheduleChange = (schedule: ScheduleConfig) => {
        updateCurrentZoneConfig({ schedule });
    };

    // ========================================================================
    // BLE Write Functions
    // ========================================================================

    /**
     * Convert wizard watering mode to firmware AutoMode
     */
    const getAutoMode = (mode: WateringMode, coverageType: 'area' | 'plants'): AutoMode => {
        switch (mode) {
            case 'fao56_auto':
                return coverageType === 'area' ? AutoMode.FAO56_AREA : AutoMode.FAO56_PLANT_COUNT;
            case 'fao56_eco':
                return coverageType === 'area' ? AutoMode.FAO56_AREA : AutoMode.FAO56_PLANT_COUNT;
            case 'duration':
            case 'volume':
            default:
                return AutoMode.DISABLED;
        }
    };

    /**
     * Build GrowingEnvData from wizard zone config
     */
    const buildGrowingEnvData = (zone: UnifiedZoneConfig): GrowingEnvData => {
        const useAreaBased = zone.coverageType === 'area';
        const plantingDateUnix = zone.plantingDate ? Math.floor(zone.plantingDate / 1000) : 0;
        
        return {
            channel_id: zone.channelId,
            plant_db_index: zone.plant?.id ?? 0,
            soil_db_index: zone.soil?.id ?? 0,
            irrigation_method_index: zone.irrigationMethod?.id ?? 0,
            use_area_based: useAreaBased,
            coverage: useAreaBased 
                ? { area_m2: zone.coverageValue } 
                : { plant_count: Math.round(zone.coverageValue) },
            auto_mode: getAutoMode(zone.wateringMode, zone.coverageType),
            max_volume_limit_l: zone.maxVolumeLimit,
            enable_cycle_soak: false,
            planting_date_unix: plantingDateUnix,
            days_after_planting: plantingDateUnix 
                ? Math.floor((Date.now() / 1000 - plantingDateUnix) / 86400)
                : 0,
            latitude_deg: zone.location?.latitude ?? 45.0,
            sun_exposure_pct: zone.sunExposure,
            // Legacy fields
            plant_type: 0,
            specific_plant: zone.plant?.id ?? 0,
            soil_type: zone.soil?.id ?? 0,
            irrigation_method: zone.irrigationMethod?.id ?? 0,
            sun_percentage: zone.sunExposure,
            custom_name: zone.name,
            water_need_factor: zone.wateringMode === 'fao56_eco' ? 0.7 : 1.0,
            irrigation_freq_days: 1,
            prefer_area_based: useAreaBased
        };
    };

    /**
     * Build ScheduleConfigData from wizard schedule config
     */
    const buildScheduleConfigData = (zone: UnifiedZoneConfig): ScheduleConfigData => {
        const isFao56 = isFao56Mode(zone.wateringMode);
        
        const wateringMode: FirmwareWateringMode = zone.wateringMode === 'volume' 
            ? FirmwareWateringMode.VOLUME_LITERS 
            : FirmwareWateringMode.DURATION_MINUTES;
        const scheduleType =
            zone.schedule.type === 'auto'
                ? FirmwareScheduleType.AUTO
                : zone.schedule.type === 'daily'
                    ? FirmwareScheduleType.DAILY
                    : FirmwareScheduleType.PERIODIC;
        const daysMask = zone.schedule.type === 'auto' ? 0x7f : Math.max(1, zone.schedule.daysMask || 1);
            
        return {
            channel_id: zone.channelId,
            schedule_type: scheduleType,
            days_mask: daysMask,
            hour: zone.schedule.hour,
            minute: zone.schedule.minute,
            watering_mode: wateringMode,
            value: isFao56 || zone.schedule.type === 'auto' ? 0 : zone.schedule.value,
            auto_enabled: isFao56 || zone.schedule.type === 'auto' ? true : zone.schedule.enabled,
            use_solar_timing: zone.schedule.useSolarTiming,
            solar_event: zone.schedule.solarEvent === 'sunrise' ? 1 : 0,
            solar_offset_minutes: zone.schedule.solarOffsetMinutes
        };
    };

    /**
     * Build ChannelConfigData from wizard zone config
     */
    const buildChannelConfigData = (zone: UnifiedZoneConfig): ChannelConfigData => {
        return {
            channel_id: zone.channelId,
            name_len: zone.name.length,
            name: zone.name,
            auto_enabled: isFao56Mode(zone.wateringMode),
            plant_type: zone.plant?.id ?? 0,
            soil_type: zone.soil?.id ?? 0,
            irrigation_method: zone.irrigationMethod?.id ?? 0,
            coverage_type: zone.coverageType === 'area' ? 0 : 1,
            coverage: zone.coverageType === 'area' 
                ? { area_m2: zone.coverageValue }
                : { plant_count: Math.round(zone.coverageValue) },
            sun_percentage: zone.sunExposure
        };
    };

    /**
     * Write zone configuration to device via BLE
     */
    const writeZoneToDevice = async (zone: UnifiedZoneConfig): Promise<void> => {
        if (connectionState !== 'connected') {
            console.log('[Wizard] Not connected, skipping BLE write');
            return;
        }
        
        console.log(`[Wizard] Writing Zone ${zone.channelId} to device...`);
        
        try {
            // 1. Write Channel Config (basic info + name)
            const channelConfig = buildChannelConfigData(zone);
            console.log('[Wizard] Writing ChannelConfig:', channelConfig);
            await ble.writeChannelConfigObject(channelConfig);
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 2. Write Growing Environment (FAO-56 specific data)
            if (isFao56Mode(zone.wateringMode)) {
                const growingEnv = buildGrowingEnvData(zone);
                console.log('[Wizard] Writing GrowingEnv:', growingEnv);
                await ble.writeGrowingEnvironment(growingEnv);
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // 3. Write Schedule Config
            const scheduleConfig = buildScheduleConfigData(zone);
            console.log('[Wizard] Writing ScheduleConfig:', scheduleConfig);
            await ble.writeScheduleConfig(scheduleConfig);
            
            console.log(`[Wizard] Zone ${zone.channelId} written successfully`);
        } catch (error) {
            console.error(`[Wizard] Failed to write Zone ${zone.channelId}:`, error);
            throw error;
        }
    };

    /**
     * Write all configured zones to device
     */
    const writeAllZonesToDevice = async (): Promise<void> => {
        const configuredZones = channelWizard.zones.filter(z => z.enabled && !z.skipped);
        
        console.log(`[Wizard] Writing ${configuredZones.length} zones to device...`);
        
        for (const zone of configuredZones) {
            await writeZoneToDevice(zone);
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log('[Wizard] All zones written successfully');
    };

    // ========================================================================
    // Navigation Handlers
    // ========================================================================

    const handleNext = async () => {
        if (currentStepIndex === steps.length - 1) {
            // Last step of zone config - save zone and write to BLE
            if (currentConfig) {
                setIsSaving(true);
                setSaveError(null);
                
                try {
                    // Mark zone as enabled before writing
                    updateCurrentZoneConfig({ enabled: true });
                    
                    // Write to BLE if connected
                    await writeZoneToDevice({ ...currentConfig, enabled: true });
                    
                    // Move to next zone
                    saveAndNextZone();
                } catch (error: any) {
                    console.error('[Wizard] Save error:', error);
                    setSaveError(error.message || t('errors.saveFailed'));
                } finally {
                    setIsSaving(false);
                }
            }
        } else {
            nextWizardStep();
        }
    };

    const handleBack = () => {
        if (currentStepIndex === 0) {
            // First step - maybe close or go to previous zone
            if (channelWizard.currentZoneIndex === 0) {
                closeChannelWizard();
            } else {
                prevWizardStep();
            }
        } else {
            prevWizardStep();
        }
    };

    const handleSkip = () => {
        skipCurrentZone();
    };

    const handleSkipAll = () => {
        setShowSkipAllAlert(true);
    };

    const confirmSkipAll = () => {
        skipAllRemainingZones();
        setShowSkipAllAlert(false);
    };

    const handleFinish = async () => {
        setIsSaving(true);
        setSaveError(null);
        
        try {
            // Write all configured zones to device
            await writeAllZonesToDevice();
            finishChannelWizard();
        } catch (error: any) {
            console.error('[Wizard] Finish error:', error);
            setSaveError(error.message || t('errors.saveFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    // ========================================================================
    // Render Helpers
    // ========================================================================

    const renderStepContent = () => {
        if (!currentConfig) return null;

        switch (currentStep) {
            case 'mode':
                return (
                    <div>
                        {/* Zone name */}
                        <IonItem style={{ marginBottom: '16px' }}>
                            <IonLabel position="stacked">{t('wizard.zone.nameLabel')}</IonLabel>
                            <IonInput
                                value={currentConfig.name}
                                onIonChange={(e) => updateCurrentZoneConfig({ name: e.detail.value || '' })}
                                placeholder={`${t('zones.zone')} ${channelWizard.currentZoneIndex + 1}`}
                            />
                        </IonItem>

                        <h2 style={{ marginBottom: '16px' }}>{t('wizard.zone.selectMode')}</h2>
                        <div>
                            {(['fao56_auto', 'fao56_eco', 'duration', 'volume'] as WateringMode[]).map(mode => (
                                <ModeCard
                                    key={mode}
                                    mode={mode}
                                    selected={currentConfig.wateringMode === mode}
                                    onSelect={() => handleModeSelect(mode)}
                                />
                            ))}
                        </div>
                    </div>
                );

            case 'plant':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h2 style={{ marginBottom: '8px' }}>{t('wizard.plant.title')}</h2>
                        <IonSearchbar
                            value={plantSearch}
                            onIonInput={(e) => setPlantSearch(e.detail.value || '')}
                            placeholder={t('wizard.plant.searchPlaceholder')}
                            style={{ marginBottom: '8px' }}
                        />
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <IonList>
                                {filteredPlants.map(plant => (
                                    <IonItem
                                        key={plant.id}
                                        button
                                        onClick={() => handlePlantSelect(plant)}
                                        color={currentConfig.plant?.id === plant.id ? 'primary' : undefined}
                                    >
                                        <IonLabel>
                                            <h2>{plant.common_name_en}</h2>
                                            <p>{plant.common_name_ro || plant.common_name_en} - {plant.category}</p>
                                        </IonLabel>
                                        {currentConfig.plant?.id === plant.id && (
                                            <IonIcon icon={checkmark} slot="end" />
                                        )}
                                    </IonItem>
                                ))}
                            </IonList>
                        </div>
                    </div>
                );
            case 'soil':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h2 style={{ marginBottom: '8px' }}>{t('wizard.soil.title')}</h2>
                        <IonSearchbar
                            value={soilSearch}
                            onIonInput={(e) => setSoilSearch(e.detail.value || '')}
                            placeholder={t('wizard.soil.searchPlaceholder')}
                            style={{ marginBottom: '8px' }}
                        />
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <IonList>
                                {filteredSoils.map(soil => (
                                    <IonItem
                                        key={soil.id}
                                        button
                                        onClick={() => handleSoilSelect(soil)}
                                        color={currentConfig.soil?.id === soil.id ? 'primary' : undefined}
                                    >
                                        <IonLabel>
                                            <h2>{soil.texture}</h2>
                                            <p>{t('wizard.soil.infiltration')}: {soil.infiltration_rate_mm_h} {t('common.mmPerHour')}</p>
                                        </IonLabel>
                                        {currentConfig.soil?.id === soil.id && (
                                            <IonIcon icon={checkmark} slot="end" />
                                        )}
                                    </IonItem>
                                ))}
                            </IonList>
                        </div>
                    </div>
                );
            case 'irrigation':
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h2 style={{ marginBottom: '16px' }}>{t('wizard.irrigationMethod.title')}</h2>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <IonList>
                                {irrigationMethodDb.map(method => (
                                    <IonItem
                                        key={method.id}
                                        button
                                        onClick={() => handleIrrigationSelect(method)}
                                        color={currentConfig.irrigationMethod?.id === method.id ? 'primary' : undefined}
                                    >
                                        <IonLabel>
                                            <h2>{method.name}</h2>
                                            <p>{t('wizard.irrigationMethod.efficiencyLabel')}: {method.efficiency_pct}{t('common.percent')} - {method.infiltration_style}</p>
                                        </IonLabel>
                                        {currentConfig.irrigationMethod?.id === method.id && (
                                            <IonIcon icon={checkmark} slot="end" />
                                        )}
                                    </IonItem>
                                ))}
                            </IonList>
                        </div>
                    </div>
                );
            case 'environment':
                return (
                    <div>
                        <h2 style={{ marginBottom: '16px' }}>{t('wizard.steps.environment')}</h2>
                        
                        {/* Location Picker */}
                        <div style={{ marginBottom: '16px' }}>
                            <IonLabel>{t('wizard.location.title')}</IonLabel>
                            <LocationPicker
                                value={currentConfig.location || channelWizard.sharedLocation}
                                onChange={handleLocationChange}
                            />
                        </div>

                        {/* Sun Exposure */}
                        <IonItem style={{ marginTop: '16px' }}>
                            <IonIcon icon={sunnyOutline} slot="start" />
                            <IonLabel>
                                <div>{t('wizard.summary.sunExposure')}: {currentConfig.sunExposure}{t('common.percent')}</div>
                            </IonLabel>
                        </IonItem>
                        <IonRange
                            min={0}
                            max={100}
                            value={currentConfig.sunExposure}
                            onIonChange={(e) => updateCurrentZoneConfig({ sunExposure: e.detail.value as number })}
                            style={{ padding: '0 16px' }}
                        >
                            <IonLabel slot="start">0{t('common.percent')}</IonLabel>
                            <IonLabel slot="end">100{t('common.percent')}</IonLabel>
                        </IonRange>

                        {/* Coverage Type */}
                        <IonSegment
                            value={currentConfig.coverageType}
                            onIonChange={(e) => updateCurrentZoneConfig({ coverageType: e.detail.value as 'area' | 'plants' })}
                            style={{ marginTop: '16px' }}
                        >
                            <IonSegmentButton value="area">
                                <IonLabel>{t('zoneDetails.coverageByArea')}</IonLabel>
                            </IonSegmentButton>
                            <IonSegmentButton value="plants">
                                <IonLabel>{t('zoneDetails.coverageByPlants')}</IonLabel>
                            </IonSegmentButton>
                        </IonSegment>

                        <IonItem>
                            <IonLabel position="stacked">
                                {currentConfig.coverageType === 'area' ? t('zoneDetails.coverageByArea') : t('zoneDetails.coverageByPlants')}
                            </IonLabel>
                            <IonInput
                                type="number"
                                value={currentConfig.coverageValue}
                                onIonChange={(e) => updateCurrentZoneConfig({ coverageValue: parseFloat(e.detail.value || '10') })}
                            />
                        </IonItem>

                        {/* Max Volume Limit */}
                        <IonItem>
                            <IonLabel position="stacked">{t('wizard.summary.maxVolume')} ({t('common.litersShort')})</IonLabel>
                            <IonInput
                                type="number"
                                value={currentConfig.maxVolumeLimit}
                                onIonChange={(e) => updateCurrentZoneConfig({ maxVolumeLimit: parseFloat(e.detail.value || '50') })}
                            />
                        </IonItem>

                        {/* Planting Date (optional) */}
                        <IonItem button onClick={() => setShowDatePicker(true)}>
                            <IonIcon icon={calendarOutline} slot="start" />
                            <IonLabel>
                                <div>{t('wizard.plantingDate.label')} ({t('common.optional')})</div>
                                <div style={{ fontSize: '14px', color: 'var(--ion-color-medium)' }}>
                                    {currentConfig.plantingDate
                                        ? new Date(currentConfig.plantingDate).toLocaleDateString(locale)
                                        : t('common.notSet')}
                                </div>
                            </IonLabel>
                        </IonItem>

                        <IonPopover
                            isOpen={showDatePicker}
                            onDidDismiss={() => setShowDatePicker(false)}
                        >
                            <IonDatetime
                                presentation="date"
                                value={currentConfig.plantingDate ? new Date(currentConfig.plantingDate).toISOString() : undefined}
                                onIonChange={(e) => {
                                    const dateValue = e.detail.value as string;
                                    updateCurrentZoneConfig({ plantingDate: dateValue ? new Date(dateValue).getTime() : null });
                                    setShowDatePicker(false);
                                }}
                            />
                        </IonPopover>
                    </div>
                );
            case 'schedule':
                return (
                    <div>
                        <h2 style={{ marginBottom: '16px' }}>{t('wizard.steps.schedule')}</h2>
                        <ScheduleEditor
                            schedule={currentConfig.schedule}
                            onChange={handleScheduleChange}
                            wateringMode={currentConfig.wateringMode}
                        />
                    </div>
                );

            case 'summary':
                return (
                    <div>
                        <h2 style={{ marginBottom: '16px' }}>{t('wizard.summary.title')}</h2>
                        
                        {/* Summary Card */}
                        <IonCard>
                            <IonCardContent>
                                <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '12px' }}>
                                    {currentConfig.name || `${t('zones.zone')} ${channelWizard.currentZoneIndex + 1}`}
                                </div>
                                {generateZoneSummary(currentConfig, { t, language }).map((line: string, i: number) => (
                                    <div key={i} style={{ marginBottom: '4px' }}>{line}</div>
                                ))}
                            </IonCardContent>
                        </IonCard>

                        {/* Validation Errors */}
                        {(() => {
                            const validation = validateZoneConfig(currentConfig, t);
                            if (!validation.valid) {
                                return (
                                    <IonCard color="warning">
                                        <IonCardContent>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                                <IonIcon icon={alertCircleOutline} /> {t('common.warning')}
                                            </div>
                                            {validation.errors.map((err: string, i: number) => (
                                                <div key={i}>- {err}</div>
                                            ))}
                                        </IonCardContent>
                                    </IonCard>
                                );
                            }
                            return null;
                        })()}
                    </div>
                );
            default:
                return null;
        }
    };

    const renderFinalSummary = () => {
        const configuredZones = channelWizard.zones.filter(z => !z.skipped && z.enabled);
        const skippedZones = channelWizard.zones.filter(z => z.skipped);

        return (
            <div>
                <h2 style={{ marginBottom: '16px' }}>{t('wizard.summary.finalTitle')}</h2>
                
                <div style={{ marginBottom: '16px' }}>
                    <IonText color="medium">
                        <p>{t('wizard.summary.finalCounts')
                            .replace('{configured}', String(configuredZones.length))
                            .replace('{skipped}', String(skippedZones.length))}</p>
                    </IonText>
                </div>

                {channelWizard.zones.map((config, index) => (
                    <ZoneSummaryCard
                        key={index}
                        config={config}
                        index={index}
                        isCurrentZone={false}
                    />
                ))}
            </div>
        );
    };
    // ========================================================================
    // Main Render
    // ========================================================================

    if (!channelWizard.isOpen) return null;

    return (
        <IonModal isOpen={channelWizard.isOpen} onDidDismiss={closeChannelWizard}>
            <IonHeader>
                <IonToolbar>
                    <IonTitle>
                        {isOnFinalSummary
                            ? t('wizard.summary.finalTitle')
                            : `${currentConfig?.name || `${t('zones.zone')} ${channelWizard.currentZoneIndex + 1}`}`}
                    </IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={closeChannelWizard}>
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
                <IonProgressBar value={progress} />
            </IonHeader>

            <IonContent className="ion-padding">
                {/* Zone indicator for multi-zone */}
                {totalZones > 1 && !isOnFinalSummary && (
                    <div style={{ 
                        textAlign: 'center', 
                        marginBottom: '16px',
                        padding: '8px',
                        backgroundColor: 'var(--ion-color-light)',
                        borderRadius: '8px'
                    }}>
                        <IonText color="medium">
                            {t('wizard.zoneProgress')
                                .replace('{current}', String(channelWizard.currentZoneIndex + 1))
                                .replace('{total}', String(totalZones))}
                        </IonText>
                    </div>
                )}

                {/* Content */}
                <div style={{ minHeight: 'calc(100% - 120px)' }}>
                    {isOnFinalSummary ? renderFinalSummary() : renderStepContent()}
                </div>
            </IonContent>

            {/* Footer Navigation */}
            <div style={{
                padding: '16px',
                borderTop: '1px solid var(--ion-color-light)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'var(--ion-background-color)'
            }}>
                {isOnFinalSummary ? (
                    <>
                        <IonButton fill="clear" onClick={() => setWizardStep('mode')} disabled={isSaving}>
                            <IonIcon slot="start" icon={chevronBack} />
                            {t('common.back')}
                        </IonButton>
                        <IonButton color="success" onClick={handleFinish} disabled={isSaving}>
                            {isSaving ? (
                                <IonSpinner name="dots" />
                            ) : (
                                <>
                                    <IonIcon slot="start" icon={checkmarkCircleOutline} />
                                    {t('common.finish')}
                                </>
                            )}
                        </IonButton>
                    </>
                ) : (
                    <>
                        <IonButton fill="clear" onClick={handleBack} disabled={isSaving}>
                            <IonIcon slot="start" icon={chevronBack} />
                            {currentStepIndex === 0 && channelWizard.currentZoneIndex === 0 ? t('common.cancel') : t('common.back')}
                        </IonButton>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            {/* Skip buttons */}
                            {totalZones > 1 && !isSaving && (
                                <>
                                    <IonButton fill="clear" color="medium" onClick={handleSkip}>
                                        <IonIcon slot="start" icon={playSkipForwardOutline} />
                                        {t('common.skip')}
                                    </IonButton>
                                    {channelWizard.currentZoneIndex < totalZones - 1 && (
                                        <IonButton fill="clear" color="medium" onClick={handleSkipAll}>
                                            <IonIcon slot="start" icon={playSkipForwardCircleOutline} />
                                            {t('common.skipAll')}
                                        </IonButton>
                                    )}
                                </>
                            )}

                            {/* Next/Save button */}
                            <IonButton
                                color="primary"
                                onClick={handleNext}
                                disabled={!canProceed || isSaving}
                            >
                                {isSaving ? (
                                    <IonSpinner name="dots" />
                                ) : (
                                    <>
                                        {currentStepIndex === steps.length - 1
                                            ? (channelWizard.currentZoneIndex === totalZones - 1 ? t('common.finish') : t('common.save'))
                                            : t('common.next')}
                                        <IonIcon slot="end" icon={chevronForward} />
                                    </>
                                )}
                            </IonButton>
                        </div>
                    </>
                )}
            </div>
            {/* Skip All Alert */}
            <IonAlert
                isOpen={showSkipAllAlert}
                onDidDismiss={() => setShowSkipAllAlert(false)}
                header={t('wizard.zone.skipAllTitle')}
                message={t('wizard.zone.skipAllMessage')
                    .replace('{count}', String(totalZones - channelWizard.currentZoneIndex))}
                buttons={[
                    { text: t('common.cancel'), role: 'cancel' },
                    { text: t('common.skipAll'), handler: confirmSkipAll }
                ]}
            />

            {/* Error Toast */}
            <IonToast
                isOpen={!!saveError}
                message={saveError || ''}
                duration={3000}
                color="danger"
                onDidDismiss={() => setSaveError(null)}
            />
        </IonModal>
    );
};

export default ConfigWizard;
