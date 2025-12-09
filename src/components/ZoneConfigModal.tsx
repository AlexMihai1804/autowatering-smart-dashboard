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
    IonItem,
    IonLabel,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonInput,
    IonRange,
    IonToggle,
    IonChip,
    IonCard,
    IonCardHeader,
    IonCardContent,
    IonNote,
    IonSpinner,
    IonProgressBar,
    IonDatetime,
    IonPopover,
    IonSelect,
    IonSelectOption
} from '@ionic/react';
import {
    close,
    checkmarkCircle,
    chevronForward,
    chevronBack,
    leafOutline,
    waterOutline,
    sunnyOutline,
    cloudOutline,
    layersOutline,
    timerOutline,
    speedometerOutline,
    locationOutline,
    calendarOutline,
    checkmarkCircleOutline,
    playOutline,
    stopOutline,
    settingsOutline,
    rainyOutline,
    thermometerOutline,
    pauseCircleOutline,
    timeOutline
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
    hasChannelFlag,
    hasChannelExtFlag,
    hasSchedule,
    isChannelFao56Complete,
    isChannelFao56Ready
} from '../types/firmware_structs';
import { LocationPicker } from './LocationPicker';
import { TimePicker } from './TimePicker';
import { LocationData } from '../types/wizard';

// ============================================================================
// Types
// ============================================================================

type WateringModeType = 'fao56_auto' | 'fao56_eco' | 'duration' | 'volume';
type ModalMode = 'setup' | 'edit' | 'job';

interface ZoneConfig {
    channel_id: number;
    name: string;
    enabled: boolean;
    wateringMode: WateringModeType;
    plant: PlantDBEntry | null;
    soil: SoilDBEntry | null;
    irrigationMethod: IrrigationMethodEntry | null;
    coverageType: 'area' | 'plants';
    coverageValue: number;
    sunExposure: number;
    location: LocationData | null;
    plantingDate: Date | null;
    enableCycleSoak: boolean;
    cycleSoakWateringMin: number;
    cycleSoakPauseMin: number;
    maxVolumeLimit: number;
    rainCompEnabled: boolean;
    rainCompSensitivity: number;
    rainCompSkipThreshold: number;
    rainCompLookbackHours: number;
    tempCompEnabled: boolean;
    tempCompBaseTemp: number;
    tempCompSensitivity: number;
    durationMinutes: number;
    volumeLiters: number;
}

interface ScheduleConfig {
    enabled: boolean;
    scheduleType: 'daily' | 'periodic' | 'auto';
    daysMask: number;
    hour: number;
    minute: number;
    useSolarTiming: boolean;
    solarEvent: 'sunrise' | 'sunset';
    solarOffsetMinutes: number;
}

interface ZoneConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelId: number;
    mode: ModalMode; // 'setup' = onboarding, 'edit' = settings, 'job' = quick watering
}

// ============================================================================
// Constants
// ============================================================================

const WATERING_MODES: { mode: WateringModeType; label: string; description: string; icon: string; color: string }[] = [
    { mode: 'fao56_auto', label: 'FAO-56 Auto', description: 'Full automated calculation with weather compensation', icon: leafOutline, color: 'success' },
    { mode: 'fao56_eco', label: 'FAO-56 Eco', description: 'Water-saving mode (70% of standard)', icon: waterOutline, color: 'tertiary' },
    { mode: 'duration', label: 'Duration', description: 'Simple time-based watering', icon: timerOutline, color: 'primary' },
    { mode: 'volume', label: 'Volume', description: 'Flow-based watering with target volume', icon: speedometerOutline, color: 'secondary' }
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ============================================================================
// Main Component
// ============================================================================

const ZoneConfigModal: React.FC<ZoneConfigModalProps> = ({ isOpen, onClose, channelId, mode }) => {
    const { zones, onboardingState, plantDb, soilDb, irrigationMethodDb } = useAppStore();
    const bleService = BleService.getInstance();
    
    const existingZone = zones.find(z => z.channel_id === channelId);

    // ========================================================================
    // State
    // ========================================================================
    
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<PlantCategory | 'all'>('all');
    
    // Job state (for quick watering)
    const [jobMode, setJobMode] = useState<'duration' | 'volume'>('duration');
    const [jobValue, setJobValue] = useState(15);

    // Zone config state
    const [zoneConfig, setZoneConfig] = useState<ZoneConfig>(() => ({
        channel_id: channelId,
        name: existingZone?.name || `Zone ${channelId + 1}`,
        enabled: true,
        wateringMode: 'fao56_auto',
        plant: null,
        soil: null,
        irrigationMethod: null,
        coverageType: 'area',
        coverageValue: 10,
        sunExposure: 80,
        location: null,
        plantingDate: null,
        enableCycleSoak: false,
        cycleSoakWateringMin: 5,
        cycleSoakPauseMin: 10,
        maxVolumeLimit: 50,
        rainCompEnabled: false,
        rainCompSensitivity: 50,
        rainCompSkipThreshold: 5,
        rainCompLookbackHours: 24,
        tempCompEnabled: false,
        tempCompBaseTemp: 20,
        tempCompSensitivity: 50,
        durationMinutes: 15,
        volumeLiters: 10
    }));
    
    const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({
        enabled: true,
        scheduleType: 'auto',
        daysMask: 0b1111111,
        hour: 6,
        minute: 0,
        useSolarTiming: false,
        solarEvent: 'sunrise',
        solarOffsetMinutes: 0
    });
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Reset state when modal opens with new channelId
    useEffect(() => {
        if (isOpen) {
            setStep(0);
            setSearchText('');
            setSelectedCategory('all');
            setJobValue(15);
            
            const zone = zones.find(z => z.channel_id === channelId);
            
            // Find existing plant, soil, irrigation method from databases
            const existingPlant = zone?.plant_type !== undefined 
                ? plantDb.find(p => p.id === zone.plant_type) || null 
                : null;
            const existingSoil = zone?.soil_type !== undefined 
                ? soilDb.find(s => s.id === zone.soil_type) || null 
                : null;
            const existingIrrigation = zone?.irrigation_method !== undefined 
                ? irrigationMethodDb.find(m => m.id === zone.irrigation_method) || null 
                : null;
            
            setZoneConfig(prev => ({
                ...prev,
                channel_id: channelId,
                name: zone?.name || `Zone ${channelId + 1}`,
                plant: existingPlant,
                soil: existingSoil,
                irrigationMethod: existingIrrigation,
                sunExposure: zone?.sun_percentage ?? 80,
                coverageType: zone?.coverage_type === 1 ? 'plants' : 'area',
                coverageValue: zone?.coverage_type === 1 
                    ? (zone?.coverage as any)?.plant_count ?? 10
                    : (zone?.coverage as any)?.area_m2 ?? 10
            }));
        }
    }, [isOpen, channelId, zones, plantDb, soilDb, irrigationMethodDb]);

    useEffect(() => {
        const isFao = zoneConfig.wateringMode === 'fao56_auto' || zoneConfig.wateringMode === 'fao56_eco';
        setScheduleConfig(prev => {
            if (isFao && prev.scheduleType !== 'auto') {
                return { ...prev, scheduleType: 'auto' };
            }
            if (!isFao && prev.scheduleType === 'auto') {
                return { ...prev, scheduleType: 'daily' };
            }
            return prev;
        });
    }, [zoneConfig.wateringMode]);

    // ========================================================================
    // Channel Status from Firmware Flags
    // ========================================================================
    
    const channelStatus = useMemo(() => {
        if (!onboardingState) {
            return {
                hasPlant: false,
                hasSoil: false,
                hasIrrigation: false,
                hasCoverage: false,
                hasSunExposure: false,
                hasSchedule: false,
                isFao56Complete: false,
                isFao56Ready: false,
                isConfigured: false
            };
        }
        const flags = onboardingState.channel_config_flags;
        const extFlags = onboardingState.channel_extended_flags || BigInt(0);
        
        const hasPlant = hasChannelFlag(flags, channelId, CHANNEL_FLAG.PLANT_TYPE);
        const hasSoil = hasChannelFlag(flags, channelId, CHANNEL_FLAG.SOIL_TYPE);
        const hasIrrigation = hasChannelFlag(flags, channelId, CHANNEL_FLAG.IRRIGATION_METHOD);
        const hasCoverage = hasChannelFlag(flags, channelId, CHANNEL_FLAG.COVERAGE);
        const hasSunExposure = hasChannelFlag(flags, channelId, CHANNEL_FLAG.SUN_EXPOSURE);
        
        return {
            hasPlant,
            hasSoil,
            hasIrrigation,
            hasCoverage,
            hasSunExposure,
            hasSchedule: hasSchedule(onboardingState.schedule_config_flags, channelId),
            isFao56Complete: isChannelFao56Complete(flags, channelId),
            isFao56Ready: isChannelFao56Ready(extFlags, channelId),
            isConfigured: hasPlant && hasSoil && hasIrrigation && hasCoverage
        };
    }, [onboardingState, channelId]);

    // Determine actual mode based on channel status
    const actualMode = useMemo(() => {
        if (mode === 'job') return 'job';
        if (mode === 'setup') return 'setup';
        // If mode is 'edit' but channel is not configured, show setup
        if (!channelStatus.isConfigured) return 'setup';
        return 'edit';
    }, [mode, channelStatus.isConfigured]);

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
        
        return plants.slice(0, 50);
    }, [plantDb, selectedCategory, searchText]);

    // ========================================================================
    // Helpers
    // ========================================================================
    
    const updateZoneConfig = (updates: Partial<ZoneConfig>) => {
        setZoneConfig(prev => ({ ...prev, ...updates }));
    };

    const isFao56Mode = zoneConfig.wateringMode === 'fao56_auto' || zoneConfig.wateringMode === 'fao56_eco';

    // ========================================================================
    // Actions
    // ========================================================================
    
    const handleStartJob = async () => {
        setSaving(true);
        try {
            const action = jobMode === 'duration' ? 0 : 1;
            await bleService.writeValveControl(channelId, action, jobValue);
            onClose();
        } catch (error) {
            console.error('[ZoneConfigModal] Failed to start job:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleStopJob = async () => {
        setSaving(true);
        try {
            await bleService.writeValveControl(channelId, 0, 0);
        } catch (error) {
            console.error('[ZoneConfigModal] Failed to stop:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleSaveConfig = async () => {
        setSaving(true);
        try {
            // Save Channel Config
            const irrigationId = Math.min(zoneConfig.irrigationMethod?.id ?? 0, 5); // clamp per docs (0-5)
            const config: ChannelConfigData = {
                channel_id: zoneConfig.channel_id,
                name_len: zoneConfig.name.length,
                name: zoneConfig.name,
                auto_enabled: isFao56Mode,
                plant_type: zoneConfig.plant?.id || 0,
                soil_type: zoneConfig.soil?.id || 0,
                irrigation_method: irrigationId,
                coverage_type: zoneConfig.coverageType === 'area' ? 0 : 1,
                coverage: zoneConfig.coverageType === 'area' 
                    ? { area_m2: zoneConfig.coverageValue }
                    : { plant_count: zoneConfig.coverageValue },
                sun_percentage: zoneConfig.sunExposure
            };
            await bleService.writeChannelConfigObject(config);
            
            // Save Growing Environment
            const growingEnv: GrowingEnvData = {
                channel_id: zoneConfig.channel_id,
                plant_db_index: zoneConfig.plant?.id || 0,
                soil_db_index: zoneConfig.soil?.id || 0,
                irrigation_method_index: irrigationId,
                use_area_based: zoneConfig.coverageType === 'area',
                coverage: zoneConfig.coverageType === 'area'
                    ? { area_m2: zoneConfig.coverageValue }
                    : { plant_count: zoneConfig.coverageValue },
                auto_mode: isFao56Mode 
                    ? (zoneConfig.wateringMode === 'fao56_eco' ? 2 : 1)
                    : AutoMode.DISABLED,
                latitude_deg: zoneConfig.location?.latitude || 45.0,
                sun_exposure_pct: zoneConfig.sunExposure,
                planting_date_unix: zoneConfig.plantingDate 
                    ? Math.floor(zoneConfig.plantingDate.getTime() / 1000)
                    : Math.floor(Date.now() / 1000),
                max_volume_limit_l: zoneConfig.maxVolumeLimit,
                water_need_factor: zoneConfig.wateringMode === 'fao56_eco' ? 0.7 : 1.0,
                enable_cycle_soak: zoneConfig.enableCycleSoak,
                days_after_planting: 0,
                plant_type: zoneConfig.plant?.id || 0,
                specific_plant: 0,
                soil_type: zoneConfig.soil?.id || 0,
                irrigation_method: zoneConfig.irrigationMethod?.id || 7,
                sun_percentage: zoneConfig.sunExposure,
                custom_name: zoneConfig.name,
                irrigation_freq_days: 2,
                prefer_area_based: zoneConfig.coverageType === 'area'
            };
            await bleService.writeGrowingEnvironment(growingEnv);
            
            // Save Schedule if enabled (mirror onboarding logic)
            if (scheduleConfig.enabled) {
                try {
                    const isFao56 = zoneConfig.wateringMode === 'fao56_auto' || zoneConfig.wateringMode === 'fao56_eco';
                    const normalizedType = !isFao56 && scheduleConfig.scheduleType === 'auto' ? 'daily' : scheduleConfig.scheduleType;
                    let wateringMode: FirmwareWateringMode;
                    let value: number;
                    
                    if (isFao56) {
                        wateringMode = FirmwareWateringMode.DURATION_MINUTES;
                        value = 0;
                    } else if (zoneConfig.wateringMode === 'duration') {
                        wateringMode = FirmwareWateringMode.DURATION_MINUTES;
                        value = zoneConfig.durationMinutes;
                    } else {
                        wateringMode = FirmwareWateringMode.VOLUME_LITERS;
                        value = zoneConfig.volumeLiters;
                    }
                    
                    // Ensure days_mask is valid (at least 1 day selected for daily, or > 0 for interval)
                    const daysMask = normalizedType === 'auto'
                        ? 0x7f
                        : (scheduleConfig.daysMask > 0 ? scheduleConfig.daysMask : 0x7F); // Default to all days
                    
                    const schedule: ScheduleConfigData = {
                        channel_id: channelId,
                        schedule_type: (isFao56 || normalizedType === 'auto')
                            ? FirmwareScheduleType.AUTO
                            : normalizedType === 'daily'
                                ? FirmwareScheduleType.DAILY 
                                : FirmwareScheduleType.PERIODIC,
                        days_mask: daysMask,
                        hour: scheduleConfig.hour,
                        minute: scheduleConfig.minute,
                        watering_mode: wateringMode,
                        value: value,
                        auto_enabled: isFao56 || normalizedType === 'auto',
                        use_solar_timing: scheduleConfig.useSolarTiming,
                        solar_event: scheduleConfig.solarEvent === 'sunrise' ? 1 : 0,
                        solar_offset_minutes: scheduleConfig.solarOffsetMinutes
                    };
                    
                    console.log(`[ZoneConfigModal] Writing schedule:`, schedule);
                    await bleService.writeScheduleConfig(schedule);
                    console.log(`[ZoneConfigModal] Schedule saved for channel ${channelId}`);
                } catch (scheduleError) {
                    console.warn(`[ZoneConfigModal] Failed to save schedule (continuing anyway):`, scheduleError);
                    // Don't block zone configuration if schedule fails
                }
            }
            
            // Re-read onboarding status to refresh flags (non-blocking)
            console.log(`[ZoneConfigModal] Zone ${channelId} saved, refreshing data...`);
            try {
                await bleService.readOnboardingStatus();
                await bleService.readChannelConfig(channelId);
            } catch (refreshError) {
                console.warn(`[ZoneConfigModal] Failed to refresh data (non-critical):`, refreshError);
            }
            
            onClose();
        } catch (error) {
            console.error('[ZoneConfigModal] Failed to save zone config:', error);
            onClose();
        } finally {
            setSaving(false);
        }
    };

    // ========================================================================
    // Render: Job Mode (Quick Watering)
    // ========================================================================
    
    const renderJobMode = () => (
        <div className="p-4 space-y-6">
            <div className="text-center">
                <div className="w-20 h-20 bg-cyber-cyan/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <IonIcon icon={waterOutline} className="text-4xl text-cyber-cyan" />
                </div>
                <h2 className="text-2xl font-bold text-white">{existingZone?.name || `Zone ${channelId + 1}`}</h2>
                <p className="text-gray-400">Start manual watering</p>
            </div>

            {/* Mode Toggle */}
            <IonSegment
                value={jobMode}
                onIonChange={e => setJobMode(e.detail.value as 'duration' | 'volume')}
                color="secondary"
            >
                <IonSegmentButton value="duration">
                    <IonIcon icon={timerOutline} />
                    <IonLabel>Duration</IonLabel>
                </IonSegmentButton>
                <IonSegmentButton value="volume">
                    <IonIcon icon={speedometerOutline} />
                    <IonLabel>Volume</IonLabel>
                </IonSegmentButton>
            </IonSegment>

            {/* Value Slider */}
            <IonCard className="glass-panel">
                <IonCardContent>
                    <div className="text-center mb-4">
                        <span className="text-5xl font-bold text-cyber-cyan">{jobValue}</span>
                        <span className="text-xl text-gray-400 ml-2">{jobMode === 'duration' ? 'min' : 'L'}</span>
                    </div>
                    <IonRange
                        min={1}
                        max={jobMode === 'duration' ? 60 : 100}
                        step={1}
                        value={jobValue}
                        onIonInput={e => setJobValue(e.detail.value as number)}
                        color="secondary"
                        pin
                    />
                </IonCardContent>
            </IonCard>

            {/* Action Buttons */}
            <div className="flex gap-4">
                <IonButton 
                    expand="block" 
                    color="success" 
                    className="flex-1"
                    onClick={handleStartJob}
                    disabled={saving}
                >
                    {saving ? <IonSpinner name="crescent" /> : (
                        <>
                            <IonIcon slot="start" icon={playOutline} />
                            START
                        </>
                    )}
                </IonButton>
                <IonButton 
                    expand="block" 
                    color="danger" 
                    className="flex-1"
                    onClick={handleStopJob}
                    disabled={saving}
                >
                    <IonIcon slot="start" icon={stopOutline} />
                    STOP
                </IonButton>
            </div>
        </div>
    );

    // ========================================================================
    // Render: Edit Mode (Settings)
    // ========================================================================
    
    const renderEditMode = () => {
        const sections = [
            { id: 'general', label: 'General', icon: settingsOutline },
            { id: 'watering', label: 'Watering Mode', icon: waterOutline },
            { id: 'plant', label: 'Plant & Soil', icon: leafOutline },
            { id: 'coverage', label: 'Coverage & Sun', icon: sunnyOutline },
            { id: 'advanced', label: 'Advanced', icon: timerOutline },
            { id: 'schedule', label: 'Schedule', icon: calendarOutline }
        ];

        return (
            <div className="p-4 space-y-4">
                {/* FAO-56 Ready Badge */}
                {channelStatus.isFao56Ready && (
                    <IonCard className="glass-panel" style={{ backgroundColor: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)' }}>
                        <IonCardContent className="py-3">
                            <div className="flex items-center gap-3">
                                <IonIcon icon={checkmarkCircle} color="success" className="text-2xl" />
                                <div>
                                    <p className="text-cyber-emerald font-bold">FAO-56 Ready</p>
                                    <p className="text-gray-400 text-sm">Auto calculation active</p>
                                </div>
                            </div>
                        </IonCardContent>
                    </IonCard>
                )}

                {/* Section Accordions */}
                {sections.map(section => (
                    <IonCard key={section.id} className="glass-panel">
                        <IonCardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                                <IonIcon icon={section.icon} className="text-xl text-cyber-cyan" />
                                <IonLabel className="font-bold text-white">{section.label}</IonLabel>
                            </div>
                        </IonCardHeader>
                        <IonCardContent>
                            {section.id === 'general' && (
                                <IonItem lines="none" className="bg-transparent">
                                    <IonLabel position="stacked">Zone Name</IonLabel>
                                    <IonInput
                                        value={zoneConfig.name}
                                        onIonInput={e => updateZoneConfig({ name: e.detail.value || '' })}
                                        placeholder="Enter zone name"
                                    />
                                </IonItem>
                            )}
                            
                            {section.id === 'watering' && (
                                <div className="space-y-2">
                                    {WATERING_MODES.map(({ mode, label, icon, color }) => (
                                        <IonItem 
                                            key={mode} 
                                            button 
                                            onClick={() => updateZoneConfig({ wateringMode: mode })}
                                            className={zoneConfig.wateringMode === mode ? 'bg-white/10' : ''}
                                            lines="none"
                                        >
                                            <IonIcon icon={icon} slot="start" color={color} />
                                            <IonLabel>{label}</IonLabel>
                                            {zoneConfig.wateringMode === mode && (
                                                <IonIcon icon={checkmarkCircle} color="success" slot="end" />
                                            )}
                                        </IonItem>
                                    ))}
                                </div>
                            )}
                            
                            {section.id === 'plant' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Plant</span>
                                        <span className="text-white">{zoneConfig.plant?.common_name_en || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Soil</span>
                                        <span className="text-white">{zoneConfig.soil?.texture || 'Not set'}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Irrigation</span>
                                        <span className="text-white">{zoneConfig.irrigationMethod?.name || 'Not set'}</span>
                                    </div>
                                    <IonButton expand="block" fill="outline" size="small" onClick={() => setStep(1)}>
                                        Change Plant/Soil
                                    </IonButton>
                                </div>
                            )}
                            
                            {section.id === 'coverage' && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400">Coverage:</span>
                                        <IonInput
                                            type="number"
                                            value={zoneConfig.coverageValue}
                                            onIonInput={e => updateZoneConfig({ coverageValue: parseFloat(e.detail.value || '10') })}
                                            style={{ maxWidth: '80px' }}
                                        />
                                        <span className="text-gray-400">{zoneConfig.coverageType === 'area' ? 'm²' : 'plants'}</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-gray-400">Sun Exposure</span>
                                            <span className="text-white">{zoneConfig.sunExposure}%</span>
                                        </div>
                                        <IonRange
                                            min={0}
                                            max={100}
                                            step={10}
                                            value={zoneConfig.sunExposure}
                                            onIonInput={e => updateZoneConfig({ sunExposure: e.detail.value as number })}
                                        />
                                    </div>
                                </div>
                            )}
                            
                            {section.id === 'advanced' && (
                                <div className="space-y-4">
                                    <IonItem lines="none" className="bg-transparent">
                                        <IonLabel>Cycle & Soak</IonLabel>
                                        <IonToggle
                                            checked={zoneConfig.enableCycleSoak}
                                            onIonChange={e => updateZoneConfig({ enableCycleSoak: e.detail.checked })}
                                        />
                                    </IonItem>
                                    <div className="flex items-center gap-3">
                                        <span className="text-gray-400">Max Volume:</span>
                                        <IonInput
                                            type="number"
                                            value={zoneConfig.maxVolumeLimit}
                                            onIonInput={e => updateZoneConfig({ maxVolumeLimit: parseInt(e.detail.value || '50') })}
                                            style={{ maxWidth: '80px' }}
                                        />
                                        <span className="text-gray-400">L</span>
                                    </div>
                                </div>
                            )}
                            
                            {section.id === 'schedule' && (
                                <div className="space-y-4">
                                    <IonItem lines="none" className="bg-transparent">
                                        <IonLabel>Schedule Enabled</IonLabel>
                                        <IonToggle
                                            checked={scheduleConfig.enabled}
                                            onIonChange={e => setScheduleConfig(prev => ({ ...prev, enabled: e.detail.checked }))}
                                        />
                                    </IonItem>
                                    {scheduleConfig.enabled && (
                                        <>
                                            <IonSegment
                                                value={scheduleConfig.scheduleType}
                                                onIonChange={e => setScheduleConfig(prev => ({ ...prev, scheduleType: e.detail.value as 'daily' | 'periodic' | 'auto' }))}
                                            >
                                                <IonSegmentButton value="daily"><IonLabel>Daily</IonLabel></IonSegmentButton>
                                                <IonSegmentButton value="periodic"><IonLabel>Interval</IonLabel></IonSegmentButton>
                                                {(zoneConfig.wateringMode === 'fao56_auto' || zoneConfig.wateringMode === 'fao56_eco') && (
                                                    <IonSegmentButton value="auto"><IonLabel>FAO-56</IonLabel></IonSegmentButton>
                                                )}
                                            </IonSegment>

                                            {scheduleConfig.scheduleType === 'daily' && (
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {DAYS.map((day, i) => (
                                                        <IonChip
                                                            key={day}
                                                            color={(scheduleConfig.daysMask & (1 << i)) ? 'primary' : 'medium'}
                                                            onClick={() => setScheduleConfig(prev => ({ ...prev, daysMask: prev.daysMask ^ (1 << i) }))}
                                                        >
                                                            {day}
                                                        </IonChip>
                                                    ))}
                                                </div>
                                            )}

                                            {scheduleConfig.scheduleType === 'periodic' && (
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-gray-400">Every</span>
                                                    <IonInput
                                                        type="number"
                                                        min={1}
                                                        max={30}
                                                        value={scheduleConfig.daysMask}
                                                        onIonInput={e => setScheduleConfig(prev => ({ ...prev, daysMask: parseInt(e.detail.value || '2') }))}
                                                        style={{ maxWidth: '70px' }}
                                                    />
                                                    <span className="text-gray-400">days</span>
                                                </div>
                                            )}

                                            {scheduleConfig.scheduleType === 'auto' && (
                                                <p className="text-center text-gray-400 text-sm">FAO-56 Smart ruleaza zilnic la ora setata.</p>
                                            )}

                                            <div className="flex items-center justify-center gap-3">
                                                <IonInput
                                                    type="number"
                                                    min={0}
                                                    max={23}
                                                    value={scheduleConfig.hour}
                                                    onIonInput={e => setScheduleConfig(prev => ({ ...prev, hour: parseInt(e.detail.value || '6') }))}
                                                    style={{ width: '70px' }}
                                                />
                                                <span className="text-white text-xl">:</span>
                                                <IonInput
                                                    type="number"
                                                    min={0}
                                                    max={59}
                                                    value={scheduleConfig.minute}
                                                    onIonInput={e => setScheduleConfig(prev => ({ ...prev, minute: parseInt(e.detail.value || '0') }))}
                                                    style={{ width: '70px' }}
                                                />
                                            </div>

                                            <IonItem lines="none" className="bg-transparent">
                                                <IonLabel>Solar timing</IonLabel>
                                                <IonToggle
                                                    checked={scheduleConfig.useSolarTiming}
                                                    onIonChange={e => setScheduleConfig(prev => ({ ...prev, useSolarTiming: e.detail.checked }))}
                                                />
                                            </IonItem>
                                            {scheduleConfig.useSolarTiming && (
                                                <div className="space-y-2">
                                                    <IonSelect
                                                        value={scheduleConfig.solarEvent}
                                                        onIonChange={e => setScheduleConfig(prev => ({ ...prev, solarEvent: e.detail.value as 'sunrise' | 'sunset' }))}
                                                    >
                                                        <IonSelectOption value="sunrise">Rasarit</IonSelectOption>
                                                        <IonSelectOption value="sunset">Apus</IonSelectOption>
                                                    </IonSelect>
                                                    <IonInput
                                                        type="number"
                                                        min={-120}
                                                        max={120}
                                                        value={scheduleConfig.solarOffsetMinutes}
                                                        onIonInput={e => setScheduleConfig(prev => ({ ...prev, solarOffsetMinutes: parseInt(e.detail.value || '0') }))}
                                                        placeholder="Offset minutes"
                                                    />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </IonCardContent>
                    </IonCard>
                ))}

                {/* Save Button */}
                <IonButton expand="block" color="success" onClick={handleSaveConfig} disabled={saving}>
                    {saving ? <IonSpinner name="crescent" /> : 'Save Changes'}
                </IonButton>
            </div>
        );
    };

    // ========================================================================
    // Render: Setup Mode (Onboarding)
    // ========================================================================
    
    const setupSteps = isFao56Mode 
        ? ['Mode', 'Plant', 'Soil', 'Coverage', 'Location', 'Schedule']
        : ['Mode', 'Settings', 'Schedule'];
    
    const renderSetupMode = () => {
        const progress = (step + 1) / setupSteps.length;

        return (
            <div className="p-4 space-y-4">
                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Step {step + 1} of {setupSteps.length}</span>
                        <span>{setupSteps[step]}</span>
                    </div>
                    <IonProgressBar value={progress} color="secondary" />
                </div>

                {/* Step 0: Mode Selection */}
                {step === 0 && (
                    <div className="space-y-4">
                        <IonCard className="glass-panel">
                            <IonCardContent>
                                <IonItem lines="none" className="bg-transparent">
                                    <IonLabel position="stacked">Zone Name</IonLabel>
                                    <IonInput
                                        value={zoneConfig.name}
                                        onIonInput={e => updateZoneConfig({ name: e.detail.value || '' })}
                                        placeholder="e.g., Front Garden"
                                    />
                                </IonItem>
                            </IonCardContent>
                        </IonCard>
                        
                        <p className="text-gray-400 px-2">Select watering mode:</p>
                        {WATERING_MODES.map(({ mode, label, description, icon, color }) => (
                            <IonCard
                                key={mode}
                                button
                                onClick={() => updateZoneConfig({ wateringMode: mode })}
                                className={zoneConfig.wateringMode === mode ? 'border-2 border-cyber-emerald' : ''}
                            >
                                <IonCardContent>
                                    <div className="flex items-center gap-3">
                                        <IonIcon icon={icon} color={color} className="text-3xl" />
                                        <div className="flex-1">
                                            <div className="font-bold text-white">{label}</div>
                                            <div className="text-sm text-gray-400">{description}</div>
                                        </div>
                                        {zoneConfig.wateringMode === mode && (
                                            <IonIcon icon={checkmarkCircleOutline} color="success" className="text-2xl" />
                                        )}
                                    </div>
                                </IonCardContent>
                            </IonCard>
                        ))}
                    </div>
                )}

                {/* Step 1: Plant Selection (FAO-56) or Settings (Duration/Volume) */}
                {step === 1 && isFao56Mode && (
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={leafOutline} className="text-2xl text-green-400" />
                                <IonLabel className="text-lg font-bold text-white">Plant Type</IonLabel>
                            </div>
                        </IonCardHeader>
                        <IonCardContent>
                            {zoneConfig.plant ? (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-medium">{zoneConfig.plant.common_name_en}</p>
                                        <p className="text-gray-400 text-sm">{zoneConfig.plant.scientific_name}</p>
                                    </div>
                                    <IonButton fill="clear" size="small" onClick={() => updateZoneConfig({ plant: null })}>
                                        Change
                                    </IonButton>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                        <IonChip
                                            color={selectedCategory === 'all' ? 'primary' : 'medium'}
                                            onClick={() => setSelectedCategory('all')}
                                        >
                                            All
                                        </IonChip>
                                        {PLANT_CATEGORIES.map(cat => (
                                            <IonChip
                                                key={cat}
                                                color={selectedCategory === cat ? 'primary' : 'medium'}
                                                onClick={() => setSelectedCategory(cat)}
                                            >
                                                {cat}
                                            </IonChip>
                                        ))}
                                    </div>
                                    <IonSearchbar
                                        value={searchText}
                                        onIonInput={e => setSearchText(e.detail.value || '')}
                                        placeholder="Search plants..."
                                    />
                                    <div className="max-h-64 overflow-y-auto">
                                        <IonList className="bg-transparent">
                                            {filteredPlants.map(plant => (
                                                <IonItem
                                                    key={plant.id}
                                                    button
                                                    onClick={() => updateZoneConfig({ plant })}
                                                    lines="inset"
                                                >
                                                    <IonLabel>
                                                        <h2 className="text-white">{plant.common_name_en}</h2>
                                                        <p className="text-gray-400 text-sm">{plant.category}</p>
                                                    </IonLabel>
                                                </IonItem>
                                            ))}
                                        </IonList>
                                    </div>
                                </div>
                            )}
                        </IonCardContent>
                    </IonCard>
                )}

                {step === 1 && !isFao56Mode && (
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <IonLabel className="text-lg font-bold text-white">
                                {zoneConfig.wateringMode === 'duration' ? 'Duration' : 'Volume'} Setting
                            </IonLabel>
                        </IonCardHeader>
                        <IonCardContent>
                            <div className="text-center mb-4">
                                <span className="text-5xl font-bold text-cyber-cyan">
                                    {zoneConfig.wateringMode === 'duration' ? zoneConfig.durationMinutes : zoneConfig.volumeLiters}
                                </span>
                                <span className="text-xl text-gray-400 ml-2">
                                    {zoneConfig.wateringMode === 'duration' ? 'min' : 'L'}
                                </span>
                            </div>
                            <IonRange
                                min={1}
                                max={zoneConfig.wateringMode === 'duration' ? 60 : 100}
                                value={zoneConfig.wateringMode === 'duration' ? zoneConfig.durationMinutes : zoneConfig.volumeLiters}
                                onIonInput={e => {
                                    if (zoneConfig.wateringMode === 'duration') {
                                        updateZoneConfig({ durationMinutes: e.detail.value as number });
                                    } else {
                                        updateZoneConfig({ volumeLiters: e.detail.value as number });
                                    }
                                }}
                                pin
                            />
                        </IonCardContent>
                    </IonCard>
                )}

                {/* Step 2: Soil (FAO-56) or Schedule */}
                {step === 2 && isFao56Mode && (
                    <div className="space-y-4">
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <IonLabel className="font-bold text-white">Soil Type</IonLabel>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonList className="bg-transparent">
                                    {soilDb.map(soil => (
                                        <IonItem
                                            key={soil.id}
                                            button
                                            onClick={() => updateZoneConfig({ soil })}
                                            className={zoneConfig.soil?.id === soil.id ? 'bg-white/10' : ''}
                                            lines="inset"
                                        >
                                            <IonLabel>
                                                <h2 className="text-white">{soil.texture}</h2>
                                                <p className="text-gray-400 text-sm">{soil.infiltration_rate_mm_h} mm/h</p>
                                            </IonLabel>
                                            {zoneConfig.soil?.id === soil.id && (
                                                <IonIcon icon={checkmarkCircle} color="success" slot="end" />
                                            )}
                                        </IonItem>
                                    ))}
                                </IonList>
                            </IonCardContent>
                        </IonCard>
                        
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <IonLabel className="font-bold text-white">Irrigation Method</IonLabel>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonList className="bg-transparent">
                                    {irrigationMethodDb.map(method => (
                                        <IonItem
                                            key={method.id}
                                            button
                                            onClick={() => updateZoneConfig({ irrigationMethod: method })}
                                            className={zoneConfig.irrigationMethod?.id === method.id ? 'bg-white/10' : ''}
                                            lines="inset"
                                        >
                                            <IonLabel>
                                                <h2 className="text-white">{method.name}</h2>
                                                <p className="text-gray-400 text-sm">{method.efficiency_pct}% efficiency</p>
                                            </IonLabel>
                                            {zoneConfig.irrigationMethod?.id === method.id && (
                                                <IonIcon icon={checkmarkCircle} color="success" slot="end" />
                                            )}
                                        </IonItem>
                                    ))}
                                </IonList>
                            </IonCardContent>
                        </IonCard>
                    </div>
                )}

                {step === 2 && !isFao56Mode && renderScheduleStep()}

                {/* Step 3: Coverage & Sun (FAO-56) */}
                {step === 3 && isFao56Mode && (
                    <div className="space-y-4">
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <IonLabel className="font-bold text-white">Coverage Area</IonLabel>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonSegment
                                    value={zoneConfig.coverageType}
                                    onIonChange={e => updateZoneConfig({ coverageType: e.detail.value as 'area' | 'plants' })}
                                >
                                    <IonSegmentButton value="area">Area (m²)</IonSegmentButton>
                                    <IonSegmentButton value="plants">Plant Count</IonSegmentButton>
                                </IonSegment>
                                <div className="flex items-center gap-3 mt-4">
                                    <IonInput
                                        type="number"
                                        value={zoneConfig.coverageValue}
                                        onIonInput={e => updateZoneConfig({ coverageValue: parseFloat(e.detail.value || '10') })}
                                        style={{ maxWidth: '100px' }}
                                    />
                                    <span className="text-gray-400">{zoneConfig.coverageType === 'area' ? 'm²' : 'plants'}</span>
                                </div>
                            </IonCardContent>
                        </IonCard>

                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <IonLabel className="font-bold text-white">Sun Exposure</IonLabel>
                            </IonCardHeader>
                            <IonCardContent>
                                <IonRange
                                    min={0}
                                    max={100}
                                    step={10}
                                    value={zoneConfig.sunExposure}
                                    onIonInput={e => updateZoneConfig({ sunExposure: e.detail.value as number })}
                                    pin
                                    pinFormatter={(v: number) => `${v}%`}
                                >
                                    <IonIcon slot="start" icon={cloudOutline} className="text-gray-400" />
                                    <IonIcon slot="end" icon={sunnyOutline} className="text-yellow-400" />
                                </IonRange>
                                <p className="text-center text-gray-400 mt-2">{zoneConfig.sunExposure}% direct sunlight</p>
                            </IonCardContent>
                        </IonCard>

                        {/* Cycle & Soak */}
                        <IonCard className="glass-panel">
                            <IonCardHeader>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <IonIcon icon={pauseCircleOutline} className="text-xl text-purple-400" />
                                        <IonLabel className="font-bold text-white">Cycle & Soak</IonLabel>
                                    </div>
                                    <IonToggle
                                        checked={zoneConfig.enableCycleSoak}
                                        onIonChange={e => updateZoneConfig({ enableCycleSoak: e.detail.checked })}
                                    />
                                </div>
                                <IonNote className="text-xs text-gray-400">
                                    Prevent runoff by watering in cycles with pauses
                                </IonNote>
                            </IonCardHeader>
                            {zoneConfig.enableCycleSoak && (
                                <IonCardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-sm">Water for</span>
                                        <div className="flex items-center gap-2">
                                            <IonInput
                                                type="number"
                                                min={1}
                                                max={30}
                                                value={zoneConfig.cycleSoakWateringMin}
                                                onIonInput={e => updateZoneConfig({ cycleSoakWateringMin: parseInt(e.detail.value || '5') })}
                                                style={{ maxWidth: '60px', textAlign: 'center' }}
                                            />
                                            <span className="text-white">min</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-400 text-sm">Then pause for</span>
                                        <div className="flex items-center gap-2">
                                            <IonInput
                                                type="number"
                                                min={1}
                                                max={60}
                                                value={zoneConfig.cycleSoakPauseMin}
                                                onIonInput={e => updateZoneConfig({ cycleSoakPauseMin: parseInt(e.detail.value || '10') })}
                                                style={{ maxWidth: '60px', textAlign: 'center' }}
                                            />
                                            <span className="text-white">min</span>
                                        </div>
                                    </div>
                                </IonCardContent>
                            )}
                        </IonCard>
                    </div>
                )}

                {/* Step 4: Location (FAO-56) */}
                {step === 4 && isFao56Mode && (
                    <IonCard className="glass-panel">
                        <IonCardHeader>
                            <div className="flex items-center gap-3">
                                <IonIcon icon={locationOutline} className="text-2xl text-blue-400" />
                                <IonLabel className="text-lg font-bold text-white">Location</IonLabel>
                            </div>
                            <IonNote className="text-sm text-gray-400">
                                Your location is needed to calculate accurate solar radiation and evapotranspiration.
                            </IonNote>
                        </IonCardHeader>
                        <IonCardContent>
                            <LocationPicker
                                value={zoneConfig.location}
                                onChange={(loc) => updateZoneConfig({ location: loc })}
                            />
                            <div className="mt-4">
                                <IonLabel className="text-sm text-gray-300">Planting Date</IonLabel>
                                <IonButton
                                    id="planting-date-trigger"
                                    expand="block"
                                    fill="outline"
                                    color="secondary"
                                    className="mt-2"
                                    onClick={() => setShowDatePicker(true)}
                                >
                                    {zoneConfig.plantingDate
                                        ? zoneConfig.plantingDate.toLocaleDateString()
                                        : 'Select planting date'}
                                </IonButton>
                                <IonPopover
                                    trigger="planting-date-trigger"
                                    showBackdrop={true}
                                    isOpen={showDatePicker}
                                    onDidDismiss={() => setShowDatePicker(false)}
                                >
                                    <IonDatetime
                                        presentation="date"
                                        value={zoneConfig.plantingDate?.toISOString()}
                                        onIonChange={(e) => {
                                            const val = e.detail.value;
                                            if (val && typeof val === 'string') {
                                                updateZoneConfig({ plantingDate: new Date(val) });
                                            }
                                            setShowDatePicker(false);
                                        }}
                                    />
                                </IonPopover>
                                {zoneConfig.plantingDate && (
                                    <IonButton
                                        fill="clear"
                                        size="small"
                                        color="light"
                                        className="mt-1"
                                        onClick={() => updateZoneConfig({ plantingDate: null })}
                                    >
                                        Clear date
                                    </IonButton>
                                )}
                            </div>
                        </IonCardContent>
                    </IonCard>
                )}

                {/* Step 5: Schedule (FAO-56) */}
                {step === 5 && isFao56Mode && renderScheduleStep()}
            </div>
        );
    };

    const renderScheduleStep = () => (
        <IonCard className="glass-panel">
            <IonCardHeader>
                <div className="flex items-center justify-between">
                    <IonLabel className="font-bold text-white">Schedule</IonLabel>
                    <IonToggle
                        checked={scheduleConfig.enabled}
                        onIonChange={e => setScheduleConfig(prev => ({ ...prev, enabled: e.detail.checked }))}
                    />
                </div>
            </IonCardHeader>
            {scheduleConfig.enabled && (
                <IonCardContent className="space-y-4">
                    <IonSegment
                        value={scheduleConfig.scheduleType}
                        onIonChange={e => setScheduleConfig(prev => ({ ...prev, scheduleType: e.detail.value as 'daily' | 'periodic' | 'auto' }))}
                    >
                        <IonSegmentButton value="daily">Daily</IonSegmentButton>
                        <IonSegmentButton value="periodic">Every X Days</IonSegmentButton>
                        {(zoneConfig.wateringMode === 'fao56_auto' || zoneConfig.wateringMode === 'fao56_eco') && (
                            <IonSegmentButton value="auto">FAO-56</IonSegmentButton>
                        )}
                    </IonSegment>

                    {scheduleConfig.scheduleType === 'daily' && (
                        <div className="flex flex-wrap gap-1 justify-center">
                            {DAYS.map((day, i) => (
                                <IonChip
                                    key={day}
                                    color={(scheduleConfig.daysMask & (1 << i)) ? 'primary' : 'medium'}
                                    onClick={() => setScheduleConfig(prev => ({ ...prev, daysMask: prev.daysMask ^ (1 << i) }))}
                                >
                                    {day}
                                </IonChip>
                            ))}
                        </div>
                    )}
                    {scheduleConfig.scheduleType === 'periodic' && (
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-white">Every</span>
                            <IonInput
                                type="number"
                                min={1}
                                max={14}
                                value={scheduleConfig.daysMask}
                                onIonInput={e => setScheduleConfig(prev => ({ ...prev, daysMask: parseInt(e.detail.value || '2') }))}
                                style={{ maxWidth: '60px' }}
                            />
                            <span className="text-white">days</span>
                        </div>
                    )}
                    {scheduleConfig.scheduleType === 'auto' && (
                        <p className="text-center text-gray-300 text-sm">FAO-56 Smart schedule runs daily at the set time.</p>
                    )}

                    <div className="flex justify-center mt-4">
                        <TimePicker
                            hour={scheduleConfig.hour}
                            minute={scheduleConfig.minute}
                            onChange={(h, m) => setScheduleConfig(prev => ({ ...prev, hour: h, minute: m }))}
                            minuteStep={5}
                        />
                    </div>
                </IonCardContent>
            )}
        </IonCard>
    );

    // ========================================================================
    // Navigation
    // ========================================================================
    
    const canGoNext = () => {
        if (actualMode !== 'setup') return true;
        
        if (step === 0) return true;
        if (isFao56Mode) {
            if (step === 1) return zoneConfig.plant !== null;
            if (step === 2) return zoneConfig.soil !== null && zoneConfig.irrigationMethod !== null;
            if (step === 3) return zoneConfig.coverageValue > 0;
            if (step === 4) return zoneConfig.location !== null;
        }
        return true;
    };

    const handleNext = async () => {
        if (actualMode === 'setup') {
            const maxStep = setupSteps.length - 1;
            if (step < maxStep) {
                setStep(step + 1);
            } else {
                await handleSaveConfig();
            }
        }
    };

    const handleBack = () => {
        if (step > 0) {
            setStep(step - 1);
        }
    };

    // ========================================================================
    // Main Render
    // ========================================================================
    
    const getTitle = () => {
        if (actualMode === 'job') return 'Quick Watering';
        if (actualMode === 'setup') return 'Configure Zone';
        return 'Zone Settings';
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose}>
            <IonHeader>
                <IonToolbar style={{ '--background': '#0f172a' }}>
                    <IonTitle className="text-white">{getTitle()}</IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>

            <IonContent className="bg-cyber-dark">
                {actualMode === 'job' && renderJobMode()}
                {actualMode === 'edit' && renderEditMode()}
                {actualMode === 'setup' && renderSetupMode()}
            </IonContent>

            {/* Footer for Setup Mode */}
            {actualMode === 'setup' && (
                <div className="bg-cyber-dark border-t border-white/10 p-4 flex justify-between">
                    {step > 0 ? (
                        <IonButton fill="clear" color="medium" onClick={handleBack}>
                            <IonIcon icon={chevronBack} slot="start" />
                            Back
                        </IonButton>
                    ) : (
                        <div />
                    )}
                    <IonButton 
                        color="secondary" 
                        onClick={handleNext}
                        disabled={!canGoNext() || saving}
                    >
                        {saving ? <IonSpinner name="crescent" /> : (
                            <>
                                {step === setupSteps.length - 1 ? 'Save' : 'Next'}
                                <IonIcon icon={chevronForward} slot="end" />
                            </>
                        )}
                    </IonButton>
                </div>
            )}
        </IonModal>
    );
};

export default ZoneConfigModal;
