import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet';
import { TimePicker } from '../../components/ui/time-picker';
import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry, PLANT_CATEGORIES } from '../../services/DatabaseService';
import { isChannelConfigComplete } from '../../types/firmware_structs';
import SoilGridsServiceInstance, { CustomSoilParameters, estimateSoilParametersFromTexture } from '../../services/SoilGridsService';
import { getRecommendedCoverageType, getCoverageModeExplanation } from '../../utils/plantCoverageHelper';
import { useI18n } from '../../i18n';

type WizardStep =
  | 'select-channel'
  | 'zone-name'
  | 'plant-method'      // NEW: Camera or List choice
  | 'plant-selection'   // List browse with categories
  | 'location-setup'    // NEW: GPS location for soil detection
  | 'soil-type'
  | 'sun-exposure'
  | 'coverage-area'
  | 'irrigation-method'
  | 'watering-mode'
  | 'schedule-config'   // Duration/volume value config
  | 'weather-adjustments'
  | 'zone-summary';

interface ZoneConfig {
  channelId: number;
  name: string;
  plantType?: PlantDBEntry;
  soilType?: SoilDBEntry;
  irrigationMethodEntry?: IrrigationMethodEntry;
  sunExposure: 'full' | 'partial' | 'shade';
  // Coverage can be area (m²) or plant count
  coverageType: 'area' | 'plants';
  coverageValue: number;
  irrigationMethod: 'drip' | 'sprinkler' | 'rotary' | 'bubbler';
  // Watering modes per docs: quality (FAO-56 100%), eco (FAO-56 70%), duration, volume
  wateringMode: 'quality' | 'eco' | 'duration' | 'volume';
  // Eco mode toggle (only for quality mode)
  ecoMode: boolean;
  rainSkip: boolean;
  tempAdjust: boolean;
  windSkip: boolean;
  // Location data
  latitude?: number;
  longitude?: number;
  // Custom soil from GPS detection (SoilGrids API)
  customSoilFromDetection?: {
    enabled: boolean;
    name: string;
    field_capacity: number;
    wilting_point: number;
    infiltration_rate: number;
    bulk_density: number;
    organic_matter: number;
    clay: number;
    sand: number;
    silt: number;
  };
  // Schedule type: 0=DAILY (specific days), 1=PERIODIC (every X days), 2=AUTO (FAO-56 decides when)
  scheduleType: 0 | 1 | 2;
  // Schedule config
  scheduleValue: number;  // Minutes for duration, liters for volume
  scheduleHour: number;
  scheduleMinute: number;
  scheduleDays: number[];  // Days bitmask for DAILY mode
  scheduleIntervalDays: number; // Interval for PERIODIC mode
  // Solar timing
  useSolarTiming: boolean;
  solarEvent: 0 | 1; // 0=SUNSET, 1=SUNRISE
  solarOffsetMinutes: number; // -120 to +120
  // Cycle & Soak and volume limit
  enableCycleSoak: boolean;
  maxVolumeLimitL: number;
}

const MobileZoneAddWizard: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const preselectedChannel = params.get('channel') ? parseInt(params.get('channel')!, 10) : null;
  const fromOnboarding = params.get('fromOnboarding') === 'true';

  const { zones, systemConfig, onboardingState, wizardState, plantDb, soilDb, irrigationMethodDb } = useAppStore();
  const bleService = BleService.getInstance();
  const { t, language } = useI18n();

  // Get unconfigured channels
  const unconfiguredChannels = useMemo(() => {
    const numChannels = systemConfig?.num_channels || 8;
    const channels: number[] = [];

    for (let i = 0; i < numChannels; i++) {
      const isConfigured =
        (onboardingState?.channel_extended_flags !== undefined &&
          isChannelConfigComplete(onboardingState.channel_extended_flags, i)) ||
        wizardState.completedZones.includes(i);

      const zone = zones.find(z => z.channel_id === i);
      const hasName = zone?.name && zone.name.trim() !== '';

      if (!isConfigured && !hasName) {
        channels.push(i);
      }
    }
    return channels;
  }, [zones, systemConfig, onboardingState, wizardState]);

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    preselectedChannel !== null ? 'zone-name' : 'select-channel'
  );
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Reset scroll when navigating between steps (e.g. pressing Continue while scrolled).
    // RAF ensures the new step content is mounted before we scroll.
    requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
  }, [currentStep]);

  // Zone config
  const [zoneConfig, setZoneConfig] = useState<ZoneConfig>({
    channelId: preselectedChannel ?? unconfiguredChannels[0] ?? 0,
    name: '',
    sunExposure: 'full',
    coverageType: 'area',
    coverageValue: 20,
    irrigationMethod: 'sprinkler',
    wateringMode: 'quality', // Default to Quality FAO-56
    ecoMode: false,
    rainSkip: true,
    tempAdjust: true,
    windSkip: false,
    // Schedule config defaults - AUTO mode is default for FAO-56!
    scheduleType: 2,        // 2=AUTO (FAO-56 decides when to water) - DEFAULT!
    scheduleValue: 10,      // 10 minutes or 10 liters (not used in AUTO)
    scheduleHour: 6,        // Fallback: 6:00 AM
    scheduleMinute: 0,
    scheduleDays: [0, 1, 2, 3, 4, 5, 6], // Every day (used for DAILY mode)
    scheduleIntervalDays: 2, // Every 2 days (used for PERIODIC mode)
    // Solar timing defaults - sunset is best for irrigation
    useSolarTiming: true,
    solarEvent: 0,          // 0=SUNSET (default)
    solarOffsetMinutes: 0,  // Right at sunset
    // Cycle & Soak and volume limit
    enableCycleSoak: false, // Disabled by default
    maxVolumeLimitL: 50,    // 50L default max per watering
  });

  // Plant selection method: 'camera' or 'list'
  const [plantMethod, setPlantMethod] = useState<'camera' | 'list' | null>(null);
  // Selected plant category for filtering
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  // Location detection state
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Bottom sheets
  const [showPlantSheet, setShowPlantSheet] = useState(false);
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const [showIrrigationSheet, setShowIrrigationSheet] = useState(false);
  const [plantSearch, setPlantSearch] = useState('');
  const [soilSearch, setSoilSearch] = useState('');

  // Filter plants - use database from store with category
  const filteredPlants = useMemo(() => {
    let plants = plantDb;

    // Filter by category first
    if (selectedCategory) {
      plants = plants.filter(p => p.category === selectedCategory);
    }

    // Then filter by search
    if (plantSearch.trim()) {
      const lowerSearch = plantSearch.toLowerCase();
      plants = plants.filter(p =>
        p.common_name_en?.toLowerCase().includes(lowerSearch) ||
        p.common_name_ro?.toLowerCase().includes(lowerSearch) ||
        p.scientific_name?.toLowerCase().includes(lowerSearch)
      );
    }

    return plants.slice(0, 100);
  }, [plantDb, plantSearch, selectedCategory]);

  // Filter soils - use database from store
  const filteredSoils = useMemo(() => {
    if (!soilSearch.trim()) return soilDb;
    const lowerSearch = soilSearch.toLowerCase();
    return soilDb.filter(s =>
      s.soil_type?.toLowerCase().includes(lowerSearch) ||
      s.texture?.toLowerCase().includes(lowerSearch)
    );
  }, [soilDb, soilSearch]);

  const updateZoneConfig = (updates: Partial<ZoneConfig>) => {
    setZoneConfig(prev => ({ ...prev, ...updates }));
  };

  // Step order depends on watering mode:
  // FAO-56 modes (quality/eco) need: plant, soil, irrigation method, coverage, sun exposure
  // Manual modes (duration/volume) need: coverage, irrigation method, schedule config
  const stepOrder: WizardStep[] = useMemo(() => {
    const baseSteps: WizardStep[] = [
      ...(preselectedChannel !== null ? [] : ['select-channel' as WizardStep]),
      'zone-name',
      'watering-mode',     // FIRST: Choose mode (Quality/Eco/Duration/Volume)
    ];

    // FAO-56 modes need plant/soil/location data + schedule for start time
    if (zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco') {
      return [
        ...baseSteps,
        'plant-method',
        'plant-selection',
        'location-setup',
        'soil-type',
        'sun-exposure',
        'coverage-area',
        'irrigation-method',
        'schedule-config',    // FAO-56 also needs start time
        'zone-summary',
      ];
    }

    // Duration/Volume modes - simpler config with schedule
    return [
      ...baseSteps,
      'coverage-area',
      'irrigation-method',
      'schedule-config',    // Configure duration/volume and time
      'weather-adjustments',
      'zone-summary',
    ];
  }, [preselectedChannel, zoneConfig.wateringMode]);

  const currentStepIndex = stepOrder.indexOf(currentStep);
  const totalSteps = stepOrder.length;
  const progress = ((currentStepIndex + 1) / totalSteps) * 100;

  const goNext = () => {
    setDirection(1);
    const nextIndex = currentStepIndex + 1;

    if (nextIndex < stepOrder.length) {
      setCurrentStep(stepOrder[nextIndex]);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    setDirection(-1);
    const prevIndex = currentStepIndex - 1;

    if (prevIndex >= 0) {
      setCurrentStep(stepOrder[prevIndex]);
    } else {
      // If coming from onboarding and on first step, go back to onboarding select-zones
      if (fromOnboarding) {
        history.replace('/onboarding');
      } else {
        history.goBack();
      }
    }
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      // Map irrigation method to firmware value
      const irrigationMethodMap: Record<string, number> = {
        'drip': 0,
        'sprinkler': 1,
        'rotary': 2,
        'bubbler': 3,
      };

      // Map sun exposure to percentage
      const sunPercentageMap: Record<string, number> = {
        'full': 100,
        'partial': 50,
        'shade': 25,
      };

      // If we have a custom soil from GPS detection, create it on device first
      // BUT still send a valid soil_type (0-7) in ChannelConfig - firmware validates this!
      // The custom soil profile is stored separately via Custom Soil Configuration.
      let soilTypeId = zoneConfig.soilType?.id ?? 0;
      if (zoneConfig.customSoilFromDetection?.enabled) {
        const customSoilData = {
          channel_id: zoneConfig.channelId,
          name: zoneConfig.customSoilFromDetection.name,
          field_capacity: zoneConfig.customSoilFromDetection.field_capacity,
          wilting_point: zoneConfig.customSoilFromDetection.wilting_point,
          infiltration_rate: zoneConfig.customSoilFromDetection.infiltration_rate,
          bulk_density: zoneConfig.customSoilFromDetection.bulk_density,
          organic_matter: zoneConfig.customSoilFromDetection.organic_matter,
        };

        // Create custom soil on device - custom soils are stored per channel
        await bleService.createCustomSoilConfig(customSoilData);

        // WORKAROUND: Firmware doesn't return name in read response (returns all zeros)
        // Cache the name locally in the store so UI can display it
        useAppStore.getState().updateCustomSoilConfig(zoneConfig.channelId, {
          ...customSoilData,
          operation: 1, // CREATE
          created_timestamp: Math.floor(Date.now() / 1000),
          modified_timestamp: Math.floor(Date.now() / 1000),
          crc32: 0,
          status: 0, // SUCCESS
        });

        // Keep the matched standard soil type (0-7) for ChannelConfig validation
        // The custom soil profile takes precedence in firmware calculations
        // Use matched soil ID if available, otherwise default to 0 (Clay)
        soilTypeId = zoneConfig.soilType?.id ?? 0;
        console.log('[ZoneAddWizard] Created custom soil for channel:', zoneConfig.channelId, 'name:', customSoilData.name);
      }

      // Map watering mode to firmware value
      // Write channel config to device (watering_mode is part of ScheduleConfigData, not here)
      // IMPORTANT: Clamp soil_type and plant_type to valid firmware ranges!
      // soil_type: 0-7 (firmware enum), database IDs may be larger
      // plant_type: 0-7 (firmware enum), database IDs may be larger (20+)
      const firmwareSoilType = Math.min(Math.max(soilTypeId, 0), 7);
      const firmwarePlantType = Math.min(Math.max(zoneConfig.plantType?.id ?? 0, 0), 7);

      console.log('[ZoneAddWizard] Firmware values: soil_type=', firmwareSoilType, 'plant_type=', firmwarePlantType);

      await bleService.writeChannelConfigObject({
        channel_id: zoneConfig.channelId,
        name_len: zoneConfig.name.length,
        name: zoneConfig.name || `${t('zones.zone')} ${zoneConfig.channelId + 1}`,
        auto_enabled: zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco',
        plant_type: firmwarePlantType,
        soil_type: firmwareSoilType,
        irrigation_method: irrigationMethodMap[zoneConfig.irrigationMethod] ?? 1,
        coverage_type: zoneConfig.coverageType === 'area' ? 0 : 1,
        coverage: zoneConfig.coverageType === 'area'
          ? { area_m2: zoneConfig.coverageValue }
          : { plant_count: zoneConfig.coverageValue },
        sun_percentage: sunPercentageMap[zoneConfig.sunExposure] ?? 100,
      });

      // For FAO-56 modes, also write Growing Environment for enhanced plant/soil data
      // This is REQUIRED for firmware to set the full onboarding flags (plant_type_set, soil_type_set, etc.)
      if (zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco') {
        const irrigationMethodIndex = irrigationMethodMap[zoneConfig.irrigationMethod] ?? 1;

        // NOTE: soil_db_index MUST be valid (0-7) for AUTO mode to work!
        // Using 0xFF breaks AUTO validation. Custom soil is stored separately via createCustomSoilConfig.
        // The matched standard soil type is used as fallback for FAO-56 calculations.

        await bleService.writeGrowingEnvironment({
          channel_id: zoneConfig.channelId,
          plant_db_index: zoneConfig.plantType?.id ?? 0,
          soil_db_index: firmwareSoilType,  // MUST be valid 0-7 for AUTO mode!
          irrigation_method_index: irrigationMethodIndex,
          use_area_based: zoneConfig.coverageType === 'area',
          coverage: zoneConfig.coverageType === 'area'
            ? { area_m2: zoneConfig.coverageValue }
            : { plant_count: zoneConfig.coverageValue },
          auto_mode: zoneConfig.wateringMode === 'quality' ? 1 : 2, // 1=Quality, 2=Eco
          max_volume_limit_l: zoneConfig.maxVolumeLimitL, // User-configurable max volume per watering
          enable_cycle_soak: zoneConfig.enableCycleSoak, // User-configurable cycle & soak
          planting_date_unix: Math.floor(Date.now() / 1000), // Current date as planting date
          days_after_planting: 0,
          latitude_deg: zoneConfig.latitude ?? 0,
          sun_exposure_pct: sunPercentageMap[zoneConfig.sunExposure] ?? 100,
          // Legacy fields
          plant_type: firmwarePlantType,
          specific_plant: zoneConfig.plantType?.id ?? 0,
          soil_type: firmwareSoilType,
          irrigation_method: irrigationMethodIndex,
          sun_percentage: sunPercentageMap[zoneConfig.sunExposure] ?? 100,
          custom_name: zoneConfig.name,
          water_need_factor: 1.0,
          irrigation_freq_days: 1,
          prefer_area_based: zoneConfig.coverageType === 'area',
        });
        console.log('[ZoneAddWizard] Wrote Growing Environment for FAO-56 mode, soil_db_index:', firmwareSoilType);
      }

      // Watering mode for schedule: 0=duration, 1=volume (FAO-56 uses volume internally)
      const wateringModeForSchedule = zoneConfig.wateringMode === 'duration' ? 0 : 1;
      const isFAO56 = zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco';

      // Determine days_mask based on schedule type
      // DAILY: bitmask of days, PERIODIC: interval in days, AUTO: 0x7F (all days, system decides)
      let daysMask = 0x7F; // Default all days for AUTO
      if (zoneConfig.scheduleType === 0) {
        // DAILY - convert days array to bitmask
        daysMask = zoneConfig.scheduleDays.reduce((mask, day) => mask | (1 << day), 0);
      } else if (zoneConfig.scheduleType === 1) {
        // PERIODIC - interval in days
        daysMask = zoneConfig.scheduleIntervalDays;
      }
      // AUTO (2) - daysMask is ignored by firmware, but we set 0x7F

      await bleService.writeScheduleConfig({
        channel_id: zoneConfig.channelId,
        schedule_type: zoneConfig.scheduleType,
        days_mask: daysMask,
        hour: zoneConfig.scheduleHour,
        minute: zoneConfig.scheduleMinute,
        watering_mode: wateringModeForSchedule,
        value: isFAO56 ? 0 : zoneConfig.scheduleValue, // AUTO/FAO-56 calculates value, others use user input
        auto_enabled: isFAO56,
        use_solar_timing: zoneConfig.useSolarTiming,
        solar_event: zoneConfig.solarEvent,
        solar_offset_minutes: zoneConfig.solarOffsetMinutes,
      });

      // Mark zone as complete in wizard state
      useAppStore.getState().setWizardState({
        ...wizardState,
        completedZones: [...wizardState.completedZones, zoneConfig.channelId],
      });

      console.log('[ZoneAddWizard] Zone configured:', zoneConfig);
      
      // If coming from onboarding, return there with the configured channel info
      if (fromOnboarding) {
        history.replace(`/onboarding?continueFromZone=true&configured=${zoneConfig.channelId}`);
      } else {
        history.push('/zones');
      }
    } catch (error) {
      console.error('[ZoneAddWizard] Failed to save zone:', error);
      setSaving(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'select-channel':
        return zoneConfig.channelId !== undefined;
      case 'zone-name':
        return zoneConfig.name.trim().length > 0;
      case 'plant-method':
        return plantMethod !== null;
      case 'plant-selection':
        return !!zoneConfig.plantType;
      case 'location-setup':
        // Location is optional, can always proceed
        return true;
      case 'soil-type':
        return !!zoneConfig.soilType;
      case 'sun-exposure':
        return !!zoneConfig.sunExposure;
      case 'coverage-area':
        return zoneConfig.coverageValue > 0;
      case 'irrigation-method':
        return !!zoneConfig.irrigationMethod;
      case 'schedule-config':
        return zoneConfig.scheduleValue > 0 && zoneConfig.scheduleDays.length > 0;
      default:
        return true;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'select-channel':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">water_drop</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-2">{t('zoneWizard.selectChannel.title')}</h2>
              <p className="text-mobile-text-muted">{t('zoneWizard.selectChannel.subtitle')}</p>
            </div>

            {unconfiguredChannels.length === 0 ? (
              <div className="text-center py-8">
                <span className="material-symbols-outlined text-5xl text-gray-500 mb-4 block">check_circle</span>
                <p className="text-mobile-text-muted">{t('zoneWizard.selectChannel.allConfigured')}</p>
                <button
                  onClick={() => history.goBack()}
                  className="mt-4 px-6 py-2 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl text-white font-semibold"
                >
                  {t('zoneWizard.selectChannel.goBack')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {unconfiguredChannels.map((channelId) => (
                  <button
                    key={channelId}
                    onClick={() => updateZoneConfig({ channelId })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${zoneConfig.channelId === channelId
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                      }`}
                  >
                    <div className={`size-12 rounded-full flex items-center justify-center ${zoneConfig.channelId === channelId
                      ? 'bg-mobile-primary text-mobile-bg-dark'
                      : 'bg-white/10 text-mobile-text-muted'
                      }`}>
                      <span className="text-xl font-bold">{channelId + 1}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-bold ${zoneConfig.channelId === channelId ? 'text-white' : 'text-mobile-text-muted'}`}>
                        {t('zoneWizard.selectChannel.channel')} {channelId + 1}
                      </p>
                      <p className="text-mobile-text-muted text-sm">
                        {t('zoneWizard.selectChannel.notConfigured')}
                      </p>
                    </div>
                    {zoneConfig.channelId === channelId && (
                      <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 'zone-name':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">edit</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {t('zoneWizard.selectChannel.channel')} {zoneConfig.channelId + 1}
              </p>
              <h2 className="text-white text-2xl font-bold">{t('zoneWizard.zoneName.title')}</h2>
            </div>

            <input
              type="text"
              value={zoneConfig.name}
              onChange={(e) => updateZoneConfig({ name: e.target.value })}
              placeholder={t('zoneWizard.zoneName.placeholder')}
              className="w-full h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl px-5 text-white text-xl font-semibold placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary transition-colors text-center"
            />

            <div className="grid grid-cols-3 gap-3">
              {[
                t('zoneWizard.zoneName.suggestions.frontLawn'),
                t('zoneWizard.zoneName.suggestions.backGarden'),
                t('zoneWizard.zoneName.suggestions.flowerBed'),
                t('zoneWizard.zoneName.suggestions.vegetables'),
                t('zoneWizard.zoneName.suggestions.trees'),
                t('zoneWizard.zoneName.suggestions.patio')
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => updateZoneConfig({ name: suggestion })}
                  className="py-2 px-3 bg-white/5 rounded-lg text-mobile-text-muted text-sm font-medium hover:bg-white/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        );

      case 'plant-method':
        // First step: Choose camera identification or manual search
        return (
          <div className="space-y-6">
            <div className="pt-4 pb-4">
              <h1 className="text-white text-[32px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.plantMethod.title')}
              </h1>
              <p className="text-mobile-primary text-sm font-semibold uppercase tracking-wider pt-2 opacity-90">
                {zoneConfig.name}
              </p>
            </div>

            {/* Info tip */}
            <div className="relative overflow-hidden flex flex-col items-start gap-3 rounded-2xl border border-mobile-primary/20 bg-mobile-primary/5 p-5">
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-mobile-primary/10 rounded-full blur-2xl"></div>
              <div className="flex flex-row items-start gap-3 z-10">
                <span className="material-symbols-outlined text-mobile-primary shrink-0 mt-0.5">info</span>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-base font-bold leading-tight">{t('zoneWizard.plantMethod.optimizationTip.title')}</p>
                  <p className="text-mobile-text-muted text-sm font-medium leading-relaxed">
                    {t('zoneWizard.plantMethod.optimizationTip.text')}
                  </p>
                </div>
              </div>
            </div>

            {/* Camera Option */}
            <button
              onClick={() => {
                setPlantMethod('camera');
                // TODO: Implement camera plant identification
                alert(t('zoneWizard.plantMethod.camera.alert'));
              }}
              className={`relative w-full flex flex-col items-center gap-4 rounded-[2rem] border-2 p-6 transition-all hover:scale-[1.02] ${plantMethod === 'camera'
                ? 'border-mobile-primary bg-mobile-surface-dark shadow-[0_0_20px_rgba(19,236,55,0.15)]'
                : 'border-transparent bg-mobile-surface-dark hover:border-mobile-border-dark'
                }`}
            >
              {plantMethod === 'camera' && (
                <div className="absolute top-4 right-4 size-6 rounded-full bg-mobile-primary flex items-center justify-center text-mobile-bg-dark">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </div>
              )}
              <div className={`size-20 rounded-full flex items-center justify-center transition-colors ${plantMethod === 'camera' ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                }`}>
                <span className="material-symbols-outlined text-[40px]">photo_camera</span>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white">{t('zoneWizard.plantMethod.camera.title')}</h3>
                <p className="text-sm text-mobile-text-muted">{t('zoneWizard.plantMethod.camera.desc')}</p>
              </div>
            </button>

            {/* Manual Search Option */}
            <button
              onClick={() => setPlantMethod('list')}
              className={`relative w-full flex flex-col items-center gap-4 rounded-[2rem] border-2 p-6 transition-all hover:scale-[1.02] ${plantMethod === 'list'
                ? 'border-mobile-primary bg-mobile-surface-dark shadow-[0_0_20px_rgba(19,236,55,0.15)]'
                : 'border-transparent bg-mobile-surface-dark hover:border-mobile-border-dark'
                }`}
            >
              {plantMethod === 'list' && (
                <div className="absolute top-4 right-4 size-6 rounded-full bg-mobile-primary flex items-center justify-center text-mobile-bg-dark">
                  <span className="material-symbols-outlined text-[18px]">check</span>
                </div>
              )}
              <div className={`size-20 rounded-full flex items-center justify-center transition-colors ${plantMethod === 'list' ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                }`}>
                <span className="material-symbols-outlined text-[40px]">potted_plant</span>
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-xl font-bold text-white">{t('zoneWizard.plantMethod.manual.title')}</h3>
                <p className="text-sm text-mobile-text-muted">{t('zoneWizard.plantMethod.manual.desc')}</p>
              </div>
            </button>
          </div>
        );

      case 'plant-selection':
        // Plant list with category filtering - show all proper categories
        const categoryIcons: Record<string, string> = {
          'Agriculture': 'agriculture',
          'Gardening': 'local_florist',
          'Landscaping': 'park',
          'Indoor': 'potted_plant',
          'Succulent': 'cactus',
          'Fruit': 'nutrition',
          'Vegetable': 'grocery',
          'Herb': 'spa',
          'Lawn': 'grass',
          'Shrub': 'forest',
        };

        return (
          <div className="space-y-5">
            <div className="pb-2">
              <h1 className="text-white text-[28px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.plantSelection.title')}
              </h1>
              <p className="text-mobile-text-muted text-sm mt-2">
                {t('zoneWizard.plantSelection.subtitle')}
              </p>
            </div>

            {/* Search bar */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
              <input
                type="text"
                value={plantSearch}
                onChange={(e) => setPlantSearch(e.target.value)}
                placeholder={t('zoneWizard.plantSelection.searchPlaceholder')}
                className="w-full h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary text-lg"
              />
            </div>

            {/* Category pills - horizontal scroll */}
            <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
              <div className="flex gap-2 pb-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === null
                    ? 'bg-mobile-primary text-mobile-bg-dark'
                    : 'bg-mobile-surface-dark text-mobile-text-muted hover:bg-white/10'
                    }`}
                >
                  {t('zoneWizard.plantSelection.categories.all')}
                </button>
                {PLANT_CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${selectedCategory === cat
                      ? 'bg-mobile-primary text-mobile-bg-dark'
                      : 'bg-mobile-surface-dark text-mobile-text-muted hover:bg-white/10'
                      }`}
                  >
                    <span className="material-symbols-outlined text-base">{categoryIcons[cat] || 'eco'}</span>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected plant display */}
            {zoneConfig.plantType && (
              <div className="p-4 rounded-2xl bg-mobile-primary/10 border border-mobile-primary flex items-center gap-4">
                <div className="size-12 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary">
                  <span className="material-symbols-outlined">eco</span>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{zoneConfig.plantType.common_name_en}</p>
                  <p className="text-mobile-text-muted text-sm italic">{zoneConfig.plantType.scientific_name}</p>
                </div>
                <button
                  onClick={() => updateZoneConfig({ plantType: undefined })}
                  className="text-mobile-text-muted hover:text-white"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            )}

            {/* Plant list */}
            <div className="space-y-2">
              {filteredPlants.map((plant: PlantDBEntry) => (
                <button
                  key={plant.id}
                  onClick={() => {
                    const recommendedCoverage = getRecommendedCoverageType(plant);
                    updateZoneConfig({
                      plantType: plant,
                      // Auto-set coverage type if only one mode is available
                      ...(recommendedCoverage !== 'both' ? { coverageType: recommendedCoverage } : {})
                    });
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${zoneConfig.plantType?.id === plant.id
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                    }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center ${zoneConfig.plantType?.id === plant.id
                    ? 'bg-mobile-primary/20 text-mobile-primary'
                    : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined">{categoryIcons[plant.category] || 'eco'}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${zoneConfig.plantType?.id === plant.id ? 'text-white' : 'text-white'}`}>
                      {plant.common_name_en}
                    </p>
                    <p className="text-mobile-text-muted text-xs italic">{plant.scientific_name}</p>
                  </div>
                  <span className="text-mobile-text-muted text-xs bg-white/5 px-2 py-1 rounded">{plant.category}</span>
                </button>
              ))}
              {filteredPlants.length === 0 && (
                <div className="text-center py-8 text-mobile-text-muted">
                  <span className="material-symbols-outlined text-4xl mb-2">search_off</span>
                  <p>{t('zoneWizard.plantSelection.noPlantsFound')}</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'location-setup':
        // GPS location detection for soil type using SoilGrids API
        const handleDetectLocation = async () => {
          setDetectingLocation(true);
          setLocationError(null);

          // Helper: get position (native or browser)
          const getPosition = async (): Promise<{ lat: number; lon: number }> => {
            try {
              const { Geolocation } = await import('@capacitor/geolocation');
              const permission = await Geolocation.checkPermissions();

              if (permission.location === 'denied') {
                throw new Error('GPS_DENIED');
              }

              if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
                const requested = await Geolocation.requestPermissions();
                if (requested.location === 'denied') {
                  throw new Error('GPS_DENIED');
                }
              }

              const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
              });

              return { lat: position.coords.latitude, lon: position.coords.longitude };
            } catch {
              // Fallback to browser Geolocation API.
              return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                  reject(new Error('GPS_NOT_AVAILABLE'));
                  return;
                }

                navigator.geolocation.getCurrentPosition(
                  (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
                  (error) => {
                    if (error.code === error.PERMISSION_DENIED) {
                      reject(new Error('GPS_DENIED'));
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                      reject(new Error('GPS_NOT_AVAILABLE'));
                    } else {
                      reject(new Error('GPS_TIMEOUT'));
                    }
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
              });
            }
          };

          try {
            const { lat, lon } = await getPosition();

            // Update location first
            updateZoneConfig({
              latitude: lat,
              longitude: lon,
            });

            // Now fetch soil data from SoilGrids API
            try {
              const rootDepthCm = zoneConfig.plantType?.root_depth_max_m
                ? zoneConfig.plantType.root_depth_max_m * 100
                : 30;

              const soilResult = await SoilGridsServiceInstance.detectSoilFromLocation(lat, lon, rootDepthCm);

              const isRealDetection = soilResult?.source === 'api' || soilResult?.source === 'cache';

              if (soilResult && isRealDetection && soilResult.clay > 0) {
                // Generate custom soil parameters from texture
                const customParams = estimateSoilParametersFromTexture(
                  soilResult.clay,
                  soilResult.sand,
                  soilResult.silt,
                  { language }
                );

                updateZoneConfig({
                  latitude: lat,
                  longitude: lon,
                  soilType: soilResult.matchedSoil || undefined,
                  customSoilFromDetection: {
                    enabled: true,
                    name: customParams.name,
                    field_capacity: customParams.field_capacity,
                    wilting_point: customParams.wilting_point,
                    infiltration_rate: customParams.infiltration_rate,
                    bulk_density: customParams.bulk_density,
                    organic_matter: customParams.organic_matter,
                    clay: soilResult.clay,
                    sand: soilResult.sand,
                    silt: soilResult.silt,
                  },
                });
              } else {
                // SoilGrids is down/unstable (or returned fallback). Don't pretend this is a GPS-derived soil.
                // Keep any existing selection; if none, set a conservative default and let user choose manually.
                setLocationError(t('zoneWizard.locationSetup.errors.soilFailed'));
                const loamSoil = soilDb.find(s =>
                  s.soil_type?.toLowerCase().includes('loam')
                );
                updateZoneConfig({
                  latitude: lat,
                  longitude: lon,
                  soilType: zoneConfig.soilType || loamSoil || soilDb[0],
                  customSoilFromDetection: undefined,
                });
              }
            } catch (soilErr) {
              console.warn('[ZoneAddWizard] SoilGrids API error, using fallback:', soilErr);
              // SoilGrids failed. Keep current soil if set; otherwise choose a safe default.
              setLocationError(t('zoneWizard.locationSetup.errors.soilFailed'));
              const loamSoil = soilDb.find(s =>
                s.soil_type?.toLowerCase().includes('loam')
              );
              updateZoneConfig({
                latitude: lat,
                longitude: lon,
                soilType: zoneConfig.soilType || loamSoil || soilDb[0],
                customSoilFromDetection: undefined,
              });
            }

            setDetectingLocation(false);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            if (message === 'GPS_DENIED') {
              setLocationError(t('zoneWizard.locationSetup.errors.denied'));
            } else if (message === 'GPS_NOT_AVAILABLE') {
              setLocationError(t('zoneWizard.locationSetup.errors.unavailable'));
            } else {
              setLocationError(t('zoneWizard.locationSetup.errors.failed'));
            }
            setDetectingLocation(false);
          }
        };

        return (
          <div className="space-y-6">
            <div className="pt-2 pb-4">
              <h1 className="text-white text-[32px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.locationSetup.title')}
              </h1>
              <p className="text-mobile-text-muted mt-3 text-base font-medium leading-relaxed">
                {t('zoneWizard.locationSetup.subtitle')}
              </p>
            </div>

            {/* GPS Detection Card */}
            <div className="relative flex flex-col items-center justify-center rounded-[2.5rem] bg-mobile-surface-dark overflow-hidden border border-mobile-border-dark p-8">
              {/* Background decoration */}
              <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-mobile-primary/20 rounded-full blur-3xl"></div>
              </div>

              {/* Icon */}
              <div className="relative z-10 mb-5 flex items-center justify-center size-[88px] rounded-full bg-gradient-to-br from-mobile-primary/10 to-mobile-primary/5 text-mobile-primary ring-1 ring-mobile-primary/20 shadow-[0_0_30px_rgba(19,236,55,0.1)]">
                <span className="material-symbols-outlined text-[40px]">satellite_alt</span>
              </div>

              <h3 className="text-2xl font-bold leading-tight mb-2 tracking-tight text-white">{t('zoneWizard.locationSetup.cardTitle')}</h3>
              <p className="text-mobile-text-muted text-sm leading-relaxed max-w-[260px] mb-6 font-medium text-center">
                {t('zoneWizard.locationSetup.cardDesc')}
              </p>

              {zoneConfig.latitude && zoneConfig.longitude ? (
                <div className="w-full p-4 rounded-2xl bg-mobile-primary/10 border border-mobile-primary text-center mb-4">
                  <p className="text-mobile-primary font-bold mb-1">{t('zoneWizard.locationSetup.locationDetected')}</p>
                  <p className="text-mobile-text-muted text-sm">
                    {zoneConfig.latitude.toFixed(4)}°N, {zoneConfig.longitude.toFixed(4)}°W
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleDetectLocation}
                  disabled={detectingLocation}
                  className="w-full flex items-center justify-center gap-2.5 rounded-full h-14 px-8 bg-mobile-primary hover:brightness-110 active:scale-[0.98] transition-all text-mobile-bg-dark text-base font-bold shadow-lg shadow-mobile-primary/25 disabled:opacity-50"
                >
                  {detectingLocation ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>{t('zoneWizard.locationSetup.detecting')}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">my_location</span>
                      <span>{t('zoneWizard.locationSetup.startDetection')}</span>
                    </>
                  )}
                </button>
              )}

              {locationError && (
                <p className="text-red-400 text-sm mt-4 text-center">{locationError}</p>
              )}
            </div>

            {/* Skip option */}
            <div className="flex items-center gap-4">
              <div className="h-px bg-mobile-border-dark flex-1"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-mobile-text-muted">{t('zoneWizard.locationSetup.skip')}</span>
              <div className="h-px bg-mobile-border-dark flex-1"></div>
            </div>

            <p className="text-mobile-text-muted text-sm text-center">
              {t('zoneWizard.locationSetup.skipDesc')}
            </p>
          </div>
        );

      case 'soil-type':
        return (
          <div className="space-y-5">
            <div className="pb-2">
              <h1 className="text-white text-[28px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.soilType.title')}
              </h1>
              <p className="text-mobile-text-muted mt-2 text-sm font-medium">
                {zoneConfig.customSoilFromDetection?.enabled
                  ? t('zoneWizard.soilType.customProfileCreated')
                  : t('zoneWizard.soilType.selectSoilForAccuracy')}
              </p>
            </div>

            {/* Custom Soil from GPS - show detailed info */}
            {zoneConfig.customSoilFromDetection?.enabled && (
              <div className="rounded-2xl bg-mobile-primary/5 border border-mobile-primary p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="size-12 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary">
                    <span className="material-symbols-outlined">science</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold">{zoneConfig.customSoilFromDetection.name}</h3>
                      <span className="rounded-full bg-mobile-primary px-2 py-0.5 text-[10px] font-bold text-black">
                        {t('zoneWizard.soilType.customBadge')}
                      </span>
                    </div>
                    <p className="text-mobile-text-muted text-xs">
                      {t('zoneWizard.soilType.detectedAt')} {zoneConfig.latitude?.toFixed(4)}°, {zoneConfig.longitude?.toFixed(4)}°
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-orange-400 text-lg font-bold">{zoneConfig.customSoilFromDetection.clay.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-xs">{t('zoneWizard.soilType.clay')}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-yellow-400 text-lg font-bold">{zoneConfig.customSoilFromDetection.sand.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-xs">{t('zoneWizard.soilType.sand')}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-blue-400 text-lg font-bold">{zoneConfig.customSoilFromDetection.silt.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-xs">{t('zoneWizard.soilType.silt')}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-mobile-text-muted">{t('zoneWizard.soilType.fieldCapacity')}:</span>
                    <span className="text-white font-medium">{zoneConfig.customSoilFromDetection.field_capacity.toFixed(1)}{t('common.percent')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mobile-text-muted">{t('zoneWizard.soilType.wiltingPoint')}:</span>
                    <span className="text-white font-medium">{zoneConfig.customSoilFromDetection.wilting_point.toFixed(1)}{t('common.percent')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mobile-text-muted">{t('zoneWizard.soilType.infiltration')}:</span>
                    <span className="text-white font-medium">{zoneConfig.customSoilFromDetection.infiltration_rate.toFixed(1)} {t('common.mmPerHour')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-mobile-text-muted">{t('zoneWizard.soilType.bulkDensity')}:</span>
                    <span className="text-white font-medium">{zoneConfig.customSoilFromDetection.bulk_density.toFixed(2)} g/cm³</span>
                  </div>
                </div>
              </div>
            )}

            {/* Location detected but no custom soil */}
            {zoneConfig.latitude && !zoneConfig.customSoilFromDetection?.enabled && zoneConfig.soilType && (
              <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-primary p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  <div className="flex-1">
                    <p className="text-white font-bold">{zoneConfig.soilType.soil_type}</p>
                    <p className="text-mobile-text-muted text-xs">
                      {t('zoneWizard.soilType.basedOnLocation')
                        .replace('{lat}', zoneConfig.latitude?.toFixed(2) ?? '')
                        .replace('{lon}', zoneConfig.longitude?.toFixed(2) ?? '')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px bg-mobile-border-dark flex-1"></div>
              <span className="text-xs font-bold uppercase tracking-widest text-mobile-text-muted">
                {zoneConfig.customSoilFromDetection?.enabled || zoneConfig.soilType ? t('zoneWizard.soilType.orSelectManually') : t('zoneWizard.soilType.selectSoilType')}
              </span>
              <div className="h-px bg-mobile-border-dark flex-1"></div>
            </div>

            {/* All soils from database */}
            <div className="space-y-2">
              {soilDb.map((soil) => {
                const isSelected = zoneConfig.soilType?.id === soil.id && !zoneConfig.customSoilFromDetection?.enabled;
                return (
                  <button
                    key={soil.id}
                    onClick={() => {
                      updateZoneConfig({
                        soilType: soil,
                        customSoilFromDetection: undefined, // Clear custom when manual select
                      });
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                      }`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-yellow-500'
                      }`}>
                      <span className="material-symbols-outlined">landscape</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">{soil.soil_type}</p>
                      {soil.texture && <p className="text-mobile-text-muted text-xs">{soil.texture}</p>}
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Cycle & Soak Recommendation (based on soil) */}
            {(zoneConfig.soilType || zoneConfig.customSoilFromDetection?.enabled) && (
              <div className="mt-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="h-px bg-mobile-border-dark flex-1"></div>
                  <span className="text-xs font-bold uppercase tracking-widest text-mobile-text-muted">
                    {t('zoneWizard.soilType.waterManagement')}
                  </span>
                  <div className="h-px bg-mobile-border-dark flex-1"></div>
                </div>

                <button
                  type="button"
                  onClick={() => updateZoneConfig({ enableCycleSoak: !zoneConfig.enableCycleSoak })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${zoneConfig.enableCycleSoak
                    ? 'bg-cyan-500/10 border-cyan-500'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-cyan-500/50'
                    }`}
                >
                  <div className={`size-12 rounded-full flex items-center justify-center ${zoneConfig.enableCycleSoak ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined text-2xl">waves</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold ${zoneConfig.enableCycleSoak ? 'text-white' : 'text-mobile-text-muted'}`}>
                      {t('zoneWizard.soilType.cycleSoak.title')}
                    </p>
                    <p className="text-mobile-text-muted text-xs">
                      {(() => {
                        const infiltration = zoneConfig.customSoilFromDetection?.enabled
                          ? zoneConfig.customSoilFromDetection.infiltration_rate
                          : zoneConfig.soilType?.infiltration_rate_mm_h ?? 10;
                        if (infiltration < 10) {
                          return zoneConfig.enableCycleSoak
                            ? t('zoneWizard.soilType.cycleSoak.activeSlowSoil').replace('{infiltration}', infiltration.toFixed(1))
                            : t('zoneWizard.soilType.cycleSoak.recommendedSlowSoil').replace('{infiltration}', infiltration.toFixed(1));
                        }
                        return zoneConfig.enableCycleSoak
                          ? t('zoneWizard.soilType.cycleSoak.activeSlopedTerrain')
                          : t('zoneWizard.soilType.cycleSoak.disabledFastSoil').replace('{infiltration}', infiltration.toFixed(1));
                      })()}
                    </p>
                  </div>
                  <div className={`size-8 rounded-full flex items-center justify-center ${zoneConfig.enableCycleSoak ? 'bg-cyan-500 text-white' : 'bg-white/10 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined text-xl">
                      {zoneConfig.enableCycleSoak ? 'check' : 'close'}
                    </span>
                  </div>
                </button>
              </div>
            )}
          </div>
        );

      case 'sun-exposure':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-orange-400 text-3xl">wb_sunny</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {zoneConfig.name}
              </p>
              <h2 className="text-white text-2xl font-bold">{t('zoneWizard.sunExposure.title')}</h2>
            </div>

            <div className="space-y-3">
              {[
                { value: 'full' as const, name: t('zoneWizard.sunExposure.full.name'), desc: t('zoneWizard.sunExposure.full.desc'), icon: 'wb_sunny' },
                { value: 'partial' as const, name: t('zoneWizard.sunExposure.partial.name'), desc: t('zoneWizard.sunExposure.partial.desc'), icon: 'partly_cloudy_day' },
                { value: 'shade' as const, name: t('zoneWizard.sunExposure.shade.name'), desc: t('zoneWizard.sunExposure.shade.desc'), icon: 'cloud' },
              ].map(sun => (
                <button
                  key={sun.value}
                  onClick={() => updateZoneConfig({ sunExposure: sun.value })}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border transition-all ${zoneConfig.sunExposure === sun.value
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                    }`}
                >
                  <div className={`size-14 rounded-full flex items-center justify-center transition-colors ${zoneConfig.sunExposure === sun.value ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined text-3xl">{sun.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-bold text-lg ${zoneConfig.sunExposure === sun.value ? 'text-white' : 'text-mobile-text-muted'}`}>
                      {sun.name}
                    </p>
                    <p className="text-mobile-text-muted text-sm">{sun.desc}</p>
                  </div>
                  {zoneConfig.sunExposure === sun.value && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );

      case 'coverage-area':
        return (
          <div className="space-y-6 pb-4">
            <div className="pt-2 pb-4">
              <h1 className="text-white text-[32px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.coverage.title')}
              </h1>
              <p className="text-mobile-text-muted mt-3 text-base font-medium leading-relaxed">
                {t('zoneWizard.coverage.subtitle')}
              </p>
            </div>

            {/* Coverage Type Toggle - conditionally show based on plant density */}
            {(() => {
              const coverageMode = getRecommendedCoverageType(zoneConfig.plantType || null);
              const explanation = getCoverageModeExplanation(zoneConfig.plantType || null, coverageMode, {
                coverageDenseExplanation: t('zoneWizard.coverage.coverageDenseExplanation'),
                coverageSparseExplanation: t('zoneWizard.coverage.coverageSparseExplanation')
              });

              if (coverageMode === 'both') {
                return (
                  <div className="flex h-12 items-center justify-center rounded-full bg-mobile-surface-dark p-1">
                    <button
                      onClick={() => updateZoneConfig({ coverageType: 'area' })}
                      className={`flex h-full flex-1 items-center justify-center rounded-full px-4 text-sm font-bold transition-all ${zoneConfig.coverageType === 'area'
                        ? 'bg-mobile-primary text-black shadow-md'
                        : 'text-mobile-text-muted hover:text-white'
                        }`}
                    >
                      {t('zoneWizard.coverage.specifyByArea')}
                    </button>
                    <button
                      onClick={() => updateZoneConfig({ coverageType: 'plants' })}
                      className={`flex h-full flex-1 items-center justify-center rounded-full px-4 text-sm font-bold transition-all ${zoneConfig.coverageType === 'plants'
                        ? 'bg-mobile-primary text-black shadow-md'
                        : 'text-mobile-text-muted hover:text-white'
                        }`}
                    >
                      {t('zoneWizard.coverage.specifyByPlants')}
                    </button>
                  </div>
                );
              }

              // Show locked mode with explanation
              return (
                <div className="flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-mobile-primary/10 border border-mobile-primary/30">
                  <span className="material-symbols-outlined text-mobile-primary text-xl">
                    {coverageMode === 'area' ? 'grid_4x4' : 'potted_plant'}
                  </span>
                  <span className="text-white font-bold">
                    {coverageMode === 'area' ? t('zoneWizard.coverage.areaUnit') : t('zoneWizard.coverage.plantsUnit')}
                  </span>
                  {explanation && (
                    <span className="text-mobile-text-muted text-sm ml-auto">{explanation}</span>
                  )}
                </div>
              );
            })()}

            {/* Visual Icon */}
            <div className="flex justify-center">
              <div className="p-6 rounded-full bg-mobile-primary/10 border border-mobile-primary/20">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">
                  {zoneConfig.coverageType === 'area' ? 'grid_4x4' : 'potted_plant'}
                </span>
              </div>
            </div>

            {/* Numeric Input */}
            <div className="flex flex-col items-center">
              <input
                type="number"
                inputMode="decimal"
                value={zoneConfig.coverageValue || ''}
                onChange={(e) => updateZoneConfig({ coverageValue: Number(e.target.value) || 0 })}
                placeholder="0"
                className="bg-transparent border-none text-center text-7xl font-light text-white placeholder-white/20 focus:ring-0 focus:outline-none w-48 p-0 m-0 caret-mobile-primary"
              />

              {/* Unit display */}
              <div className="mt-4 flex items-center justify-center bg-mobile-surface-dark rounded-full p-1 border border-mobile-border-dark">
                <span className="px-4 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white">
                  {zoneConfig.coverageType === 'area' ? t('zoneWizard.coverage.areaUnit') : t('zoneWizard.coverage.plantsUnit')}
                </span>
              </div>
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-4 gap-2">
              {(zoneConfig.coverageType === 'area'
                ? [10, 25, 50, 100]
                : [5, 10, 20, 50]
              ).map(val => (
                <button
                  key={val}
                  onClick={() => updateZoneConfig({ coverageValue: val })}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${zoneConfig.coverageValue === val
                    ? 'bg-mobile-primary text-mobile-bg-dark'
                    : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
                    }`}
                >
                  {val}{zoneConfig.coverageType === 'area' ? t('zoneWizard.coverage.areaUnit') : ''}
                </button>
              ))}
            </div>

            {/* Helper text */}
            <div className="bg-mobile-surface-light rounded-xl p-4 flex gap-3 text-sm text-mobile-text-muted">
              <span className="material-symbols-outlined text-mobile-primary shrink-0">info</span>
              <p>
                {zoneConfig.coverageType === 'area'
                  ? t('zoneWizard.coverage.helperArea')
                  : t('zoneWizard.coverage.helperPlants')}
              </p>
            </div>
          </div>
        );

      case 'irrigation-method':
        return (
          <div className="space-y-5">
            <div className="pt-2 pb-4">
              <h1 className="text-white text-[32px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.irrigation.title')}
              </h1>
              <p className="text-mobile-text-muted mt-3 text-base font-medium leading-relaxed">
                {t('zoneWizard.irrigation.subtitle')}
              </p>
            </div>

            {/* All irrigation methods from database */}
            <div className="space-y-2">
              {irrigationMethodDb.map((method: IrrigationMethodEntry) => {
                const isSelected = zoneConfig.irrigationMethodEntry?.id === method.id;
                const methodIcon = method.name?.toLowerCase().includes('drip') ? 'opacity' :
                  method.name?.toLowerCase().includes('sprinkler') ? 'water_drop' :
                    method.name?.toLowerCase().includes('rotor') ? 'autorenew' :
                      method.name?.toLowerCase().includes('bubbler') ? 'bubble_chart' :
                        method.name?.toLowerCase().includes('flood') ? 'waves' :
                          method.name?.toLowerCase().includes('furrow') ? 'view_stream' :
                            method.name?.toLowerCase().includes('micro') ? 'blur_on' :
                              'water_drop';

                return (
                  <button
                    key={method.id}
                    onClick={() => updateZoneConfig({ irrigationMethodEntry: method })}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected
                      ? 'bg-mobile-primary/10 border-mobile-primary'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                      }`}
                  >
                    <div className={`size-10 rounded-full flex items-center justify-center ${isSelected ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-blue-400'
                      }`}>
                      <span className="material-symbols-outlined">{methodIcon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">{method.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {method.efficiency_pct && (
                          <span className="text-mobile-text-muted text-xs">{method.efficiency_pct}{t('common.percent')} {t('zoneWizard.irrigation.efficiency')}</span>
                        )}
                        {method.application_rate_mm_h && (
                          <span className="text-mobile-text-muted text-xs">
                            {t('zoneWizard.irrigation.applicationRate')
                              .replace('{value}', String(method.application_rate_mm_h))}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'watering-mode':
        // 4 watering modes per docs: Quality (FAO-56 100%), Eco (FAO-56 70%), Duration, Volume
        const wateringModes = [
          {
            value: 'quality' as const,
            label: t('zoneWizard.wateringMode.modes.quality.label'),
            badge: t('zoneWizard.wateringMode.badges.faoQuality'),
            badgeColor: 'bg-mobile-primary/20 text-mobile-primary',
            icon: 'psychology',
            desc: t('zoneWizard.wateringMode.modes.quality.desc'),
            recommended: true
          },
          {
            value: 'eco' as const,
            label: t('zoneWizard.wateringMode.modes.eco.label'),
            badge: t('zoneWizard.wateringMode.badges.faoEco'),
            badgeColor: 'bg-blue-400/20 text-blue-400',
            icon: 'eco',
            desc: t('zoneWizard.wateringMode.modes.eco.desc'),
            recommended: false
          },
          {
            value: 'duration' as const,
            label: t('zoneWizard.wateringMode.modes.duration.label'),
            badge: t('zoneWizard.wateringMode.badges.manual'),
            badgeColor: 'bg-orange-400/20 text-orange-400',
            icon: 'timer',
            desc: t('zoneWizard.wateringMode.modes.duration.desc'),
            recommended: false
          },
          {
            value: 'volume' as const,
            label: t('zoneWizard.wateringMode.modes.volume.label'),
            badge: t('zoneWizard.wateringMode.badges.manual'),
            badgeColor: 'bg-purple-400/20 text-purple-400',
            icon: 'water_drop',
            desc: t('zoneWizard.wateringMode.modes.volume.desc'),
            recommended: false
          },
        ];

        return (
          <div className="space-y-5 pb-4">
            <div className="pt-2 pb-4">
              <h1 className="text-white text-[32px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.wateringMode.title')}
              </h1>
              <p className="text-mobile-text-muted mt-3 text-base font-medium leading-relaxed">
                {t('zoneWizard.wateringMode.subtitle')}
              </p>
            </div>

            <div className="space-y-4">
              {wateringModes.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => updateZoneConfig({ wateringMode: mode.value })}
                  className={`w-full p-5 rounded-[2rem] border-2 text-left transition-all ${zoneConfig.wateringMode === mode.value
                    ? 'bg-mobile-primary/5 border-mobile-primary shadow-[0_0_20px_rgba(19,236,55,0.15)]'
                    : 'bg-mobile-surface-dark border-transparent hover:border-mobile-border-dark'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ${zoneConfig.wateringMode === mode.value
                      ? 'bg-mobile-primary/20 text-mobile-primary'
                      : 'bg-white/10 text-white'
                      }`}>
                      <span className="material-symbols-outlined text-[28px]">{mode.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="text-white font-bold text-xl">{mode.label}</h4>
                        {mode.recommended && (
                          <span className="px-2 py-0.5 rounded bg-mobile-primary text-black text-[10px] font-bold uppercase tracking-wider ml-2">
                            {t('zoneWizard.wateringMode.recommended')}
                          </span>
                        )}
                      </div>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold mb-2 ${mode.badgeColor}`}>
                        {mode.badge}
                      </span>
                      <p className="text-mobile-text-muted text-sm leading-relaxed">
                        {mode.desc}
                      </p>
                    </div>
                    {/* Radio indicator */}
                    <div className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${zoneConfig.wateringMode === mode.value
                      ? 'border-mobile-primary bg-mobile-primary'
                      : 'border-mobile-text-muted'
                      }`}>
                      {zoneConfig.wateringMode === mode.value && (
                        <span className="material-symbols-outlined text-black text-sm font-bold">check</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Info tip for FAO-56 modes */}
            {(zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco') && (
              <div className="bg-mobile-surface-light rounded-xl p-4 flex gap-3 text-sm text-mobile-text-muted mb-4">
                <span className="material-symbols-outlined text-mobile-primary shrink-0">info</span>
                <div>
                  <span className="text-white font-bold block mb-1">{t('zoneWizard.wateringMode.nextStepTip.title')}</span>
                  {t('zoneWizard.wateringMode.nextStepTip.text')}
                </div>
              </div>
            )}
          </div>
        );

      case 'schedule-config':
        // Schedule configuration - FAO-56 modes have AUTO option, manual modes need duration/volume
        const isFAO56Mode = zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco';
        const isDurationMode = zoneConfig.wateringMode === 'duration';
        const scheduleDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        return (
          <div className="space-y-4">
            <div className="pb-1">
              <h1 className="text-white text-[28px] font-extrabold leading-[1.1] tracking-tight">
                {t('zoneWizard.schedule.title')}
              </h1>
              <p className="text-mobile-text-muted mt-2 text-sm font-medium">
                {isFAO56Mode
                  ? t('zoneWizard.schedule.subtitleFao')
                  : t('zoneWizard.schedule.subtitleManual')}
              </p>
            </div>

            {/* SCHEDULE TYPE - for FAO-56 modes, offer AUTO as default */}
            {isFAO56Mode && (
              <div className="space-y-2">
                {/* AUTO mode - DEFAULT and recommended */}
                <button
                  onClick={() => updateZoneConfig({ scheduleType: 2 })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${zoneConfig.scheduleType === 2
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark'
                    }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center ${zoneConfig.scheduleType === 2 ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined">psychology</span>
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{t('zoneWizard.schedule.auto.title')}</p>
                      <span className="rounded-full bg-mobile-primary/20 px-2 py-0.5 text-[10px] font-bold text-mobile-primary">{t('zoneWizard.schedule.auto.recommended')}</span>
                    </div>
                    <p className="text-mobile-text-muted text-xs">{t('zoneWizard.schedule.auto.desc')}</p>
                  </div>
                  {zoneConfig.scheduleType === 2 && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>

                {/* Manual schedule option */}
                <button
                  onClick={() => updateZoneConfig({ scheduleType: 0 })}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${zoneConfig.scheduleType !== 2
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark'
                    }`}
                >
                  <div className={`size-10 rounded-full flex items-center justify-center ${zoneConfig.scheduleType !== 2 ? 'bg-mobile-primary/20 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined">edit_calendar</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold">{t('zoneWizard.schedule.custom.title')}</p>
                    <p className="text-mobile-text-muted text-xs">{t('zoneWizard.schedule.custom.desc')}</p>
                  </div>
                  {zoneConfig.scheduleType !== 2 && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              </div>
            )}

            {/* Duration/Volume input - ONLY for manual modes */}
            {!isFAO56Mode && (
              <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`size-9 rounded-full flex items-center justify-center ${isDurationMode ? 'bg-orange-400/20 text-orange-400' : 'bg-blue-400/20 text-blue-400'
                    }`}>
                    <span className="material-symbols-outlined text-lg">
                      {isDurationMode ? 'timer' : 'water_drop'}
                    </span>
                  </div>
                  <p className="text-white font-bold text-sm">
                    {isDurationMode ? t('zoneWizard.schedule.duration') : t('zoneWizard.schedule.volume')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => updateZoneConfig({ scheduleValue: Math.max(1, zoneConfig.scheduleValue - (isDurationMode ? 5 : 1)) })}
                    className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                  >
                    <span className="material-symbols-outlined text-lg">remove</span>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-3xl font-bold text-white">{zoneConfig.scheduleValue}</span>
                    <span className="text-mobile-text-muted ml-1">{isDurationMode ? t('common.minutesShort') : t('common.litersShort')}</span>
                  </div>
                  <button
                    onClick={() => updateZoneConfig({ scheduleValue: zoneConfig.scheduleValue + (isDurationMode ? 5 : 1) })}
                    className="size-10 rounded-full bg-white/10 flex items-center justify-center text-white"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                  </button>
                </div>
                <div className="flex gap-1.5 mt-3 justify-center flex-wrap">
                  {(isDurationMode ? [5, 10, 15, 20, 30] : [5, 10, 20, 50, 100]).map(val => (
                    <button
                      key={val}
                      onClick={() => updateZoneConfig({ scheduleValue: val })}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold ${zoneConfig.scheduleValue === val
                        ? 'bg-mobile-primary text-mobile-bg-dark'
                        : 'bg-white/10 text-mobile-text-muted'
                        }`}
                    >
                      {val}{isDurationMode ? t('common.minutesShort') : t('common.litersShort')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* MANUAL SCHEDULE OPTIONS - only show if not AUTO */}
            {(zoneConfig.scheduleType !== 2 || !isFAO56Mode) && (
              <>
                {/* Start Time - Solar or Fixed */}
                <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-purple-400/20 flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined text-lg">schedule</span>
                    </div>
                    <p className="text-white font-bold text-sm">{t('zoneWizard.schedule.startTime')}</p>
                  </div>

                  {/* Solar vs Fixed toggle */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateZoneConfig({ useSolarTiming: true })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${zoneConfig.useSolarTiming
                        ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                        : 'bg-white/5 text-mobile-text-muted border border-transparent'
                        }`}
                    >
                      <span className="material-symbols-outlined text-lg">wb_twilight</span>
                      {t('zoneWizard.schedule.solar')}
                    </button>
                    <button
                      onClick={() => updateZoneConfig({ useSolarTiming: false })}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${!zoneConfig.useSolarTiming
                        ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                        : 'bg-white/5 text-mobile-text-muted border border-transparent'
                        }`}
                    >
                      <span className="material-symbols-outlined text-lg">schedule</span>
                      {t('zoneWizard.schedule.fixedTime')}
                    </button>
                  </div>

                  {/* Solar timing options */}
                  {zoneConfig.useSolarTiming ? (
                    <div className="space-y-3 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateZoneConfig({ solarEvent: 0 })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${zoneConfig.solarEvent === 0
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500'
                            : 'bg-white/5 text-mobile-text-muted border border-transparent'
                            }`}
                        >
                          <span className="material-symbols-outlined">wb_twilight</span>
                          {t('zoneWizard.schedule.solarEvents.sunset')}
                        </button>
                        <button
                          onClick={() => updateZoneConfig({ solarEvent: 1 })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${zoneConfig.solarEvent === 1
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500'
                            : 'bg-white/5 text-mobile-text-muted border border-transparent'
                            }`}
                        >
                          <span className="material-symbols-outlined">wb_sunny</span>
                          {t('zoneWizard.schedule.solarEvents.sunrise')}
                        </button>
                      </div>
                      <div>
                        <p className="text-mobile-text-muted text-xs mb-2">{t('zoneWizard.schedule.solarOffset').replace('{event}', zoneConfig.solarEvent === 0 ? t('zoneWizard.schedule.solarEvents.sunset').toLowerCase() : t('zoneWizard.schedule.solarEvents.sunrise').toLowerCase())}</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {[-60, -30, 0, 30, 60].map(offset => (
                            <button
                              key={offset}
                              onClick={() => updateZoneConfig({ solarOffsetMinutes: offset })}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold ${zoneConfig.solarOffsetMinutes === offset
                                ? 'bg-mobile-primary text-mobile-bg-dark'
                                : 'bg-white/10 text-mobile-text-muted'
                                }`}
                            >
                              {offset === 0 ? t('zoneWizard.schedule.solarOffsetOptions.atEvent') : offset > 0 ? t('zoneWizard.schedule.solarOffsetOptions.after').replace('{offset}', offset.toString()) : t('zoneWizard.schedule.solarOffsetOptions.before').replace('{offset}', Math.abs(offset).toString())}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Fixed time picker */
                    <div className="flex justify-center mt-2">
                      <TimePicker
                        hour={zoneConfig.scheduleHour}
                        minute={zoneConfig.scheduleMinute}
                        minuteStep={15}
                        onChange={(h, m) => updateZoneConfig({ scheduleHour: h, scheduleMinute: m })}
                      />
                    </div>
                  )}
                </div>

                {/* Schedule frequency - DAILY vs PERIODIC */}
                <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-9 rounded-full bg-green-400/20 flex items-center justify-center text-green-400">
                      <span className="material-symbols-outlined text-lg">calendar_month</span>
                    </div>
                    <p className="text-white font-bold text-sm">{t('zoneWizard.schedule.frequency')}</p>
                  </div>

                  {/* DAILY vs PERIODIC toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => updateZoneConfig({ scheduleType: 0 })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${zoneConfig.scheduleType === 0
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-mobile-text-muted border border-transparent'
                        }`}
                    >
                      {t('zoneWizard.schedule.specificDays')}
                    </button>
                    <button
                      onClick={() => updateZoneConfig({ scheduleType: 1 })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${zoneConfig.scheduleType === 1
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-white/5 text-mobile-text-muted border border-transparent'
                        }`}
                    >
                      {t('zoneWizard.schedule.everyXDays')}
                    </button>
                  </div>

                  {/* DAILY - day picker */}
                  {zoneConfig.scheduleType === 0 && (
                    <>
                      <div className="flex justify-between gap-1">
                        {scheduleDayNames.map((day, index) => {
                          const isSelected = zoneConfig.scheduleDays.includes(index);
                          return (
                            <button
                              key={day}
                              onClick={() => {
                                const newDays = isSelected
                                  ? zoneConfig.scheduleDays.filter(d => d !== index)
                                  : [...zoneConfig.scheduleDays, index].sort();
                                updateZoneConfig({ scheduleDays: newDays });
                              }}
                              className={`size-9 rounded-full text-xs font-bold ${isSelected
                                ? 'bg-mobile-primary text-mobile-bg-dark'
                                : 'bg-white/10 text-mobile-text-muted'
                                }`}
                            >
                              {day.charAt(0)}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex gap-1.5 mt-2 justify-center">
                        <button
                          onClick={() => updateZoneConfig({ scheduleDays: [0, 1, 2, 3, 4, 5, 6] })}
                          className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-mobile-text-muted"
                        >
                          {t('zoneWizard.schedule.days.everyDay')}
                        </button>
                        <button
                          onClick={() => updateZoneConfig({ scheduleDays: [1, 3, 5] })}
                          className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-mobile-text-muted"
                        >
                          {t('zoneWizard.schedule.days.mwf')}
                        </button>
                        <button
                          onClick={() => updateZoneConfig({ scheduleDays: [2, 4, 6] })}
                          className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-mobile-text-muted"
                        >
                          {t('zoneWizard.schedule.days.tts')}
                        </button>
                      </div>
                    </>
                  )}

                  {/* PERIODIC - interval picker */}
                  {zoneConfig.scheduleType === 1 && (
                    <div>
                      <p className="text-mobile-text-muted text-xs mb-2">{t('zoneWizard.schedule.waterEvery')}</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {[1, 2, 3, 4, 5, 7, 10, 14].map(days => (
                          <button
                            key={days}
                            onClick={() => updateZoneConfig({ scheduleIntervalDays: days })}
                            className={`px-3 py-2 rounded-xl text-sm font-bold ${zoneConfig.scheduleIntervalDays === days
                              ? 'bg-mobile-primary text-mobile-bg-dark'
                              : 'bg-white/10 text-mobile-text-muted'
                              }`}
                          >
                            {days === 1 ? t('zoneWizard.schedule.daily') : t('zoneWizard.schedule.everyXDaysValue').replace('{days}', days.toString())}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* AUTO mode info */}
            {isFAO56Mode && zoneConfig.scheduleType === 2 && (
              <div className="rounded-2xl bg-mobile-primary/5 border border-mobile-primary/20 p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-mobile-primary mt-0.5">auto_awesome</span>
                  <div>
                    <p className="text-white font-bold text-sm">{t('zoneWizard.schedule.auto.howItWorks.title')}</p>
                    <p className="text-mobile-text-muted text-xs mt-1">
                      {t('zoneWizard.schedule.auto.howItWorks.text')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'weather-adjustments':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <div className="size-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-blue-400 text-3xl">cloud</span>
              </div>
              <p className="text-mobile-primary text-sm font-bold uppercase tracking-wider mb-1">
                {zoneConfig.name}
              </p>
              <h2 className="text-white text-2xl font-bold">{t('zoneWizard.weather.title')}</h2>
            </div>

            <div className="space-y-3">
              {[
                { key: 'rainSkip' as const, icon: 'water_drop', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-400', name: t('zoneWizard.weather.rainSkip.name'), desc: t('zoneWizard.weather.rainSkip.desc') },
                { key: 'tempAdjust' as const, icon: 'thermostat', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400', name: t('zoneWizard.weather.tempAdjust.name'), desc: t('zoneWizard.weather.tempAdjust.desc') },
                { key: 'windSkip' as const, icon: 'air', iconBg: 'bg-gray-500/20', iconColor: 'text-gray-400', name: t('zoneWizard.weather.windSkip.name'), desc: t('zoneWizard.weather.windSkip.desc') },
              ].map(adj => (
                <div
                  key={adj.key}
                  className="flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark"
                >
                  <div className="flex items-center gap-3">
                    <div className={`size-10 rounded-full ${adj.iconBg} flex items-center justify-center ${adj.iconColor}`}>
                      <span className="material-symbols-outlined">{adj.icon}</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{adj.name}</p>
                      <p className="text-mobile-text-muted text-sm">{adj.desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateZoneConfig({ [adj.key]: !zoneConfig[adj.key] })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${zoneConfig[adj.key] ? 'bg-mobile-primary' : 'bg-white/20'
                      }`}
                  >
                    <div className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform ${zoneConfig[adj.key] ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Advanced FAO-56 Settings - only show for Quality/Eco modes */}
            {(zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco') && (
              <div className="mt-6 space-y-4">
                <h3 className="text-mobile-text-muted text-sm font-semibold uppercase tracking-wider">{t('zoneWizard.weather.advanced')}</h3>

                {/* Cycle & Soak Toggle */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <span className="material-symbols-outlined">autorenew</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{t('zoneWizard.weather.cycleSoak.title')}</p>
                      <p className="text-mobile-text-muted text-sm">{t('zoneWizard.weather.cycleSoak.explanation')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => updateZoneConfig({ enableCycleSoak: !zoneConfig.enableCycleSoak })}
                    className={`w-12 h-7 rounded-full transition-colors relative ${zoneConfig.enableCycleSoak ? 'bg-mobile-primary' : 'bg-white/20'}`}
                  >
                    <div className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform ${zoneConfig.enableCycleSoak ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Max Volume Input */}
                <div className="p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
                      <span className="material-symbols-outlined">water</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold">{t('zoneWizard.weather.maxVolume.title')}</p>
                      <p className="text-mobile-text-muted text-sm">{t('zoneWizard.weather.maxVolume.desc')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={zoneConfig.maxVolumeLimitL}
                      onChange={(e) => updateZoneConfig({ maxVolumeLimitL: Math.max(1, parseInt(e.target.value) || 50) })}
                      className="flex-1 bg-black/30 border border-mobile-border-dark rounded-lg px-4 py-3 text-white text-lg text-center"
                      min="1"
                      max="1000"
                    />
                    <span className="text-mobile-text-muted text-lg">{t('common.litersShort')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'zone-summary':
        // Map watering mode to display name
        const wateringModeLabels: Record<string, string> = {
          'quality': t('zoneWizard.summary.wateringModes.quality'),
          'eco': t('zoneWizard.summary.wateringModes.eco'),
          'duration': t('zoneWizard.summary.wateringModes.duration'),
          'volume': t('zoneWizard.summary.wateringModes.volume'),
        };

        // Get soil display info
        const soilDisplay = zoneConfig.customSoilFromDetection?.enabled
          ? `${zoneConfig.customSoilFromDetection.name} (${t('zoneWizard.summary.gps')})`
          : zoneConfig.soilType?.soil_type || t('zoneWizard.summary.notSet');

        // Schedule display helpers
        const dayNames = [t('zoneWizard.summary.days.sun'), t('zoneWizard.summary.days.mon'), t('zoneWizard.summary.days.tue'), t('zoneWizard.summary.days.wed'), t('zoneWizard.summary.days.thu'), t('zoneWizard.summary.days.fri'), t('zoneWizard.summary.days.sat')];
        const isFAO56Summary = zoneConfig.wateringMode === 'quality' || zoneConfig.wateringMode === 'eco';

        // Get schedule description
        let scheduleDesc = '';
        if (isFAO56Summary && zoneConfig.scheduleType === 2) {
          scheduleDesc = t('zoneWizard.summary.scheduleTypes.fullyAutomatic');
        } else if (zoneConfig.scheduleType === 0) {
          scheduleDesc = zoneConfig.scheduleDays.length === 7
            ? t('zoneWizard.summary.scheduleTypes.everyDay')
            : zoneConfig.scheduleDays.map(d => dayNames[d]).join(', ');
        } else if (zoneConfig.scheduleType === 1) {
          scheduleDesc = zoneConfig.scheduleIntervalDays === 1
            ? t('zoneWizard.summary.scheduleTypes.daily')
            : t('zoneWizard.summary.scheduleTypes.everyXDays').replace('{days}', zoneConfig.scheduleIntervalDays.toString());
        }

        // Get time description
        let timeDesc = '';
        if (isFAO56Summary && zoneConfig.scheduleType === 2) {
          timeDesc = t('zoneWizard.summary.timeDescriptions.sunsetAuto');
        } else if (zoneConfig.useSolarTiming) {
          const eventName = zoneConfig.solarEvent === 0 ? t('zoneWizard.summary.solarEvents.sunset') : t('zoneWizard.summary.solarEvents.sunrise');
          if (zoneConfig.solarOffsetMinutes === 0) {
            timeDesc = t('zoneWizard.summary.timeDescriptions.atEvent').replace('{event}', eventName.toLowerCase());
          } else if (zoneConfig.solarOffsetMinutes > 0) {
            timeDesc = t('zoneWizard.summary.timeDescriptions.afterEvent').replace('{offset}', zoneConfig.solarOffsetMinutes.toString()).replace('{event}', eventName.toLowerCase());
          } else {
            timeDesc = t('zoneWizard.summary.timeDescriptions.beforeEvent').replace('{offset}', Math.abs(zoneConfig.solarOffsetMinutes).toString()).replace('{event}', eventName.toLowerCase());
          }
        } else {
          timeDesc = `${zoneConfig.scheduleHour.toString().padStart(2, '0')}:${zoneConfig.scheduleMinute.toString().padStart(2, '0')}`;
        }

        // Build summary items based on watering mode
        const summaryItems = [
          { label: t('zoneWizard.summary.items.channel'), value: `${t('zoneWizard.summary.channel')} ${zoneConfig.channelId + 1}`, icon: 'tag' },
          { label: t('zoneWizard.summary.items.mode'), value: wateringModeLabels[zoneConfig.wateringMode] || zoneConfig.wateringMode, icon: 'settings_suggest' },
        ];

        // FAO-56 modes show plant/soil info
        if (isFAO56Summary) {
          summaryItems.push(
            { label: t('zoneWizard.summary.items.plantType'), value: zoneConfig.plantType?.common_name_en || t('zoneWizard.summary.notSet'), icon: 'eco' },
            { label: t('zoneWizard.summary.items.soilType'), value: soilDisplay, icon: 'landscape' },
            { label: t('zoneWizard.summary.items.sunExposure'), value: zoneConfig.sunExposure === 'full' ? t('zoneWizard.summary.sunExposure.full') : zoneConfig.sunExposure === 'partial' ? t('zoneWizard.summary.sunExposure.partial') : t('zoneWizard.summary.sunExposure.shade'), icon: 'wb_sunny' },
            { label: t('zoneWizard.summary.items.maxVolume'), value: `${zoneConfig.maxVolumeLimitL} ${t('common.litersShort')}`, icon: 'water' },
            { label: t('zoneWizard.summary.items.cycleSoak'), value: zoneConfig.enableCycleSoak ? t('zoneWizard.summary.enabled') : t('zoneWizard.summary.disabled'), icon: 'autorenew' },
          );
        }

        // All modes show coverage and irrigation
        summaryItems.push(
          {
            label: t('zoneWizard.summary.items.coverage'),
            value: zoneConfig.coverageType === 'area'
              ? `${zoneConfig.coverageValue} ${t('zoneWizard.coverage.areaUnit')}`
              : `${zoneConfig.coverageValue} ${t('zoneWizard.coverage.plantsUnit')}`,
            icon: zoneConfig.coverageType === 'area' ? 'square_foot' : 'potted_plant'
          },
          { label: t('zoneWizard.summary.items.irrigation'), value: zoneConfig.irrigationMethodEntry?.name || zoneConfig.irrigationMethod.charAt(0).toUpperCase() + zoneConfig.irrigationMethod.slice(1), icon: 'water_drop' },
        );

        // Duration/Volume modes show duration/volume value
        if (!isFAO56Summary) {
          summaryItems.push({
            label: zoneConfig.wateringMode === 'duration' ? t('zoneWizard.schedule.duration') : t('zoneWizard.schedule.volume'),
            value: zoneConfig.wateringMode === 'duration'
              ? `${zoneConfig.scheduleValue} ${t('common.minutesShort')}`
              : `${zoneConfig.scheduleValue} ${t('common.litersShort')}`,
            icon: zoneConfig.wateringMode === 'duration' ? 'timer' : 'water_drop'
          });
        }

        // Schedule info - different display based on AUTO vs manual
        summaryItems.push(
          { label: t('zoneWizard.summary.items.schedule'), value: scheduleDesc, icon: 'calendar_month' },
          { label: t('zoneWizard.summary.items.startTime'), value: timeDesc, icon: zoneConfig.useSolarTiming || (isFAO56Summary && zoneConfig.scheduleType === 2) ? 'wb_twilight' : 'schedule' },
        );

        return (
          <div className="space-y-4">
            <div className="text-center mb-3">
              <div className="size-14 rounded-full bg-mobile-primary/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-mobile-primary text-2xl">check_circle</span>
              </div>
              <h2 className="text-white text-xl font-bold">{zoneConfig.name}</h2>
              <p className="text-mobile-text-muted text-xs">{t('zoneWizard.summary.subtitle')}</p>
            </div>

            {/* Custom soil details card */}
            {zoneConfig.customSoilFromDetection?.enabled && (
              <div className="rounded-2xl bg-mobile-primary/5 border border-mobile-primary/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-mobile-primary text-sm">science</span>
                  <span className="text-mobile-primary text-[10px] font-bold uppercase tracking-wider">
                    {t('zoneWizard.soilType.customProfile')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-1.5 rounded-lg bg-white/5">
                    <p className="text-orange-400 font-bold">{zoneConfig.customSoilFromDetection.clay.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-[10px]">{t('zoneWizard.soilType.clay')}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5">
                    <p className="text-yellow-400 font-bold">{zoneConfig.customSoilFromDetection.sand.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-[10px]">{t('zoneWizard.soilType.sand')}</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/5">
                    <p className="text-blue-400 font-bold">{zoneConfig.customSoilFromDetection.silt.toFixed(0)}{t('common.percent')}</p>
                    <p className="text-mobile-text-muted text-[10px]">{t('zoneWizard.soilType.silt')}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark divide-y divide-mobile-border-dark overflow-hidden">
              {summaryItems.map(item => (
                <div key={item.label} className="flex items-center justify-between p-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-mobile-text-muted text-base">{item.icon}</span>
                    <span className="text-mobile-text-muted text-xs">{item.label}</span>
                  </div>
                  <span className="text-white font-semibold text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (unconfiguredChannels.length === 0 && preselectedChannel === null) {
    return (
      <div className="min-h-screen bg-mobile-bg-dark font-manrope flex flex-col items-center justify-center p-4">
        <div className="size-24 rounded-full bg-mobile-primary/10 flex items-center justify-center mb-6">
          <span className="material-symbols-outlined text-mobile-primary text-5xl">check_circle</span>
        </div>
        <h2 className="text-white text-2xl font-bold mb-2 text-center">{t('zoneWizard.allConfigured.title')}</h2>
        <p className="text-mobile-text-muted text-center mb-6">{t('zoneWizard.allConfigured.message')}</p>
        <button
          onClick={() => history.goBack()}
          className="px-8 py-3 bg-mobile-primary text-mobile-bg-dark font-bold rounded-xl"
        >
          {t('zoneWizard.allConfigured.button')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-mobile-bg-dark font-manrope flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 z-50 bg-mobile-bg-dark/90 backdrop-blur-md p-4 safe-area-top">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={goBack}
            className="text-white flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>

          <h1 className="text-white font-bold">{t('zoneWizard.header.addZone')}</h1>

          <button
            onClick={() => history.push('/zones')}
            className="text-mobile-text-muted flex items-center justify-center text-sm font-medium hover:text-white transition-colors"
          >
            {t('zoneWizard.header.cancel')}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-mobile-border-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-mobile-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content - scrollable area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overscroll-contain -webkit-overflow-scrolling-touch">
        <div className="px-4 py-4 pb-6">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'tween', duration: 0.25 }}
            >
              {renderStep()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer - fixed at bottom */}
      <div className="shrink-0 p-4 bg-mobile-bg-dark safe-area-bottom">
        <button
          onClick={goNext}
          disabled={!canProceed() || saving}
          className={`w-full h-14 rounded-xl font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${!canProceed() || saving
            ? 'bg-white/10 text-white/30 cursor-not-allowed'
            : 'bg-mobile-primary text-mobile-bg-dark shadow-lg shadow-mobile-primary/20'
            }`}
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t('zoneWizard.summary.saving')}...
            </>
          ) : currentStep === 'zone-summary' ? (
            <>
              <span className="material-symbols-outlined">check</span>
              {t('zoneWizard.summary.save')}
            </>
          ) : (
            <>
              {t('zoneWizard.common.continue')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>
      {/* Plant Selection Sheet */}
      <MobileBottomSheet
        isOpen={showPlantSheet}
        onClose={() => setShowPlantSheet(false)}
        title={t('zoneWizard.plantSelection.title')}
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
            <input
              type="text"
              value={plantSearch}
              onChange={(e) => setPlantSearch(e.target.value)}
              placeholder={t('zoneWizard.plantSelection.searchPlaceholder')}
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-mobile-border-dark">
          {filteredPlants.slice(0, 30).map((plant: PlantDBEntry) => (
            <button
              key={plant.id}
              onClick={() => {
                updateZoneConfig({ plantType: plant });
                setShowPlantSheet(false);
                setPlantSearch('');
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="size-10 rounded-full bg-mobile-primary/10 flex items-center justify-center text-mobile-primary">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-white font-semibold">{plant.common_name_en}</span>
                {plant.scientific_name && (
                  <p className="text-mobile-text-muted text-xs italic">{plant.scientific_name}</p>
                )}
              </div>
              <span className="text-mobile-text-muted text-xs bg-white/5 px-2 py-1 rounded">{plant.category}</span>
            </button>
          ))}
        </div>
      </MobileBottomSheet>

      {/* Soil Selection Sheet */}
      <MobileBottomSheet
        isOpen={showSoilSheet}
        onClose={() => setShowSoilSheet(false)}
        title={t('zoneWizard.soilType.title')}
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
            <input
              type="text"
              value={soilSearch}
              onChange={(e) => setSoilSearch(e.target.value)}
              placeholder={t('zoneWizard.soilType.searchPlaceholder')}
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-mobile-border-dark">
          {filteredSoils.map((soil: SoilDBEntry) => (
            <button
              key={soil.id}
              onClick={() => {
                updateZoneConfig({ soilType: soil });
                setShowSoilSheet(false);
                setSoilSearch('');
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <span className="material-symbols-outlined">landscape</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-white font-semibold">{soil.soil_type}</span>
                {soil.texture && (
                  <p className="text-mobile-text-muted text-xs">{soil.texture}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </MobileBottomSheet>

      {/* Irrigation Method Sheet */}
      <MobileBottomSheet
        isOpen={showIrrigationSheet}
        onClose={() => setShowIrrigationSheet(false)}
        title={t('zoneWizard.irrigation.title')}
      >
        <div className="max-h-[60vh] overflow-y-auto divide-y divide-mobile-border-dark">
          {irrigationMethodDb.map((method: IrrigationMethodEntry) => (
            <button
              key={method.id}
              onClick={() => {
                updateZoneConfig({ irrigationMethodEntry: method });
                setShowIrrigationSheet(false);
              }}
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined">water_drop</span>
              </div>
              <div className="flex-1 text-left">
                <span className="text-white font-semibold">{method.name}</span>
                {method.efficiency_pct && (
                  <p className="text-mobile-text-muted text-xs">{t('zoneWizard.irrigation.efficiency')}: {method.efficiency_pct}{t('common.percent')}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default MobileZoneAddWizard;
