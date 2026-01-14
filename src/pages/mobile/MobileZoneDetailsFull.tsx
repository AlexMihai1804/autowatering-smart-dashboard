import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { TaskStatus, ResetOpcode, ScheduleConfigData, GrowingEnvData, isChannelConfigComplete, ChannelCompensationConfigData } from '../../types/firmware_structs';
import { PlantDBEntry, SoilDBEntry, IrrigationMethodEntry, PLANT_CATEGORIES } from '../../services/DatabaseService';
import { LocationData } from '../../types/wizard';
import SoilGridsServiceInstance, { estimateSoilParametersFromTexture } from '../../services/SoilGridsService';
import { registerBackInterceptor } from '../../lib/backInterceptors';
import { useI18n } from '../../i18n';

type TabType = 'overview' | 'schedule' | 'compensation' | 'history';
type EditSheetType = 'schedule' | 'watering-mode' | 'plant' | 'soil' | 'irrigation' | 'coverage' | 'sun' | 'rain-compensation' | 'temp-compensation' | 'water-management' | null;
type WateringModeType = 'fao56_auto' | 'fao56_eco' | 'duration' | 'volume';

import HydraulicDetailsCard from '../../components/HydraulicDetailsCard';
import { SoilTankWidget } from '../../components/SoilTankWidget';

const MobileZoneDetailsFull: React.FC = () => {
  const history = useHistory();
  const { channelId } = useParams<{ channelId: string }>();
  const {
    zones,
    currentTask,
    autoCalcStatus,
    schedules,
    growingEnv,
    compensationStatus,
    channelCompensationConfig,
    hydraulicStatus,
    connectionState,
    wateringHistory,
    plantDb,
    soilDb,
    irrigationMethodDb,
    statistics,
    onboardingState,
    customSoilConfigs,
    updateCustomSoilConfig,
  } = useAppStore();

  const channelIdNum = parseInt(channelId, 10);
  const bleService = BleService.getInstance();
  const { t, language } = useI18n();
  const plantCategoryLabels: Record<string, string> = useMemo(() => ({
    Agriculture: t('plantCategories.agriculture'),
    Gardening: t('plantCategories.gardening'),
    Landscaping: t('plantCategories.landscaping'),
    Indoor: t('plantCategories.indoor'),
    Succulent: t('plantCategories.succulent'),
    Fruit: t('plantCategories.fruit'),
    Vegetable: t('plantCategories.vegetable'),
    Herb: t('plantCategories.herb'),
    Lawn: t('plantCategories.lawn'),
    Shrub: t('plantCategories.shrub'),
  }), [t]);

  // Derived state
  const zone = useMemo(() => zones.find(z => z.channel_id === channelIdNum), [zones, channelIdNum]);
  const autoCalc = autoCalcStatus.get(channelIdNum);
  const schedule = schedules.get(channelIdNum);
  const growing = growingEnv.get(channelIdNum);
  const compensation = compensationStatus.get(channelIdNum);
  const compConfig = channelCompensationConfig.get(channelIdNum);
  const zoneStats = statistics.get(channelIdNum);
  const hydraulic = hydraulicStatus?.channel_id === channelIdNum ? hydraulicStatus : null;
  const customSoilConfig = customSoilConfigs.get(channelIdNum);

  // Check if channel is properly configured (using onboarding flags)
  const isChannelInitialized = useMemo(() => {
    if (onboardingState?.channel_extended_flags !== undefined) {
      return isChannelConfigComplete(onboardingState.channel_extended_flags, channelIdNum);
    }
    // Fallback: check if growing env has meaningful data
    return growing !== undefined && growing.plant_db_index > 0;
  }, [onboardingState, channelIdNum, growing]);

  // Component state
  const [loading, setLoading] = useState(false);

  // Tab state with internal history tracking for back navigation
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const tabNavRef = useRef<{ stack: TabType[]; index: number }>({ stack: ['overview'], index: 0 });
  const [selectedDuration, setSelectedDuration] = useState(10);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [editSheet, setEditSheet] = useState<EditSheetType>(null);
  const [saving, setSaving] = useState(false);

  // Note: "Press back again to exit" is handled ONLY by AndroidBackButtonHandler on Dashboard
  // In zone details, back navigates through tabs then back to zones list


  // Tab selection that maintains history for back navigation.
  // Use a functional update so rapid taps can't suffer from stale closures.
  const selectTab = useCallback((tab: TabType) => {
    setActiveTab((prev) => {
      if (tab === prev) return prev;
      const nav = tabNavRef.current;
      // If the user went "back" in tabs then selects a new tab, drop forward history.
      if (nav.index < nav.stack.length - 1) {
        nav.stack = nav.stack.slice(0, nav.index + 1);
      }
      // Avoid duplicate consecutive entries.
      if (nav.stack[nav.stack.length - 1] !== tab) {
        nav.stack.push(tab);
        nav.index = nav.stack.length - 1;
      } else {
        nav.index = nav.stack.length - 1;
      }
      return tab;
    });
  }, []);

  // Keep stack in sync even if some code changes tabs without calling selectTab().
  useEffect(() => {
    const nav = tabNavRef.current;
    if (nav.stack.length === 0) {
      nav.stack = [activeTab];
      nav.index = 0;
      return;
    }

    // If something sets activeTab directly, align the nav pointer.
    if (nav.stack[nav.index] === activeTab) return;
    const last = nav.stack[nav.stack.length - 1];
    if (last !== activeTab) {
      nav.stack.push(activeTab);
      nav.index = nav.stack.length - 1;
    } else {
      nav.index = nav.stack.length - 1;
    }
  }, [activeTab]);

  const goBackInTabs = useCallback((): boolean => {
    const nav = tabNavRef.current;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[ZoneDetails] goBackInTabs called', {
        stack: [...nav.stack],
        index: nav.index,
        canGoBack: nav.index > 0
      });
    }

    // If we can go back in tabs, do it
    if (nav.index > 0) {
      nav.index -= 1;
      const previousTab = nav.stack[nav.index] ?? 'overview';
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[ZoneDetails] going to previous tab:', previousTab);
      }
      setActiveTab(previousTab);
      return true;
    }

    // We're on the first tab - let the navigation handler take over
    // (AndroidBackButtonHandler will navigate back to /zones)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[ZoneDetails] on first tab, allowing navigation');
    }
    return false;
  }, []);



  const handleBack = useCallback(() => {
    if (goBackInTabs()) return;
    const browserCanGoBack = typeof window !== 'undefined' && window.history && window.history.length > 1;
    if (browserCanGoBack) {
      history.goBack();
      return;
    }
    history.replace('/zones');
  }, [goBackInTabs, history]);



  // Intercept Android back: go to previous tab first, then let global handler navigate routes.
  useEffect(() => {
    const unregister = registerBackInterceptor({
      id: `zone-details-${channelId}`,
      isActive: (pathname) => pathname === `/zones/${channelId}` || pathname === `/zones/${channelId}/`,
      onBack: () => {
        return goBackInTabs();
      },
    });
    return unregister;
  }, [channelId, goBackInTabs]);

  // Edit form state
  const [selectedWateringMode, setSelectedWateringMode] = useState<WateringModeType>('fao56_auto');
  const [scheduleForm, setScheduleForm] = useState<ScheduleConfigData | null>(null);
  const [selectedPlant, setSelectedPlant] = useState<PlantDBEntry | null>(null);
  const [selectedSoil, setSelectedSoil] = useState<SoilDBEntry | null>(null);
  const [selectedIrrigation, setSelectedIrrigation] = useState<IrrigationMethodEntry | null>(null);
  const [growingForm, setGrowingForm] = useState<GrowingEnvData | null>(null);
  const [sunLevel, setSunLevel] = useState<'shade' | 'partial' | 'full'>('full');

  // Plant search state
  const [plantSearchTerm, setPlantSearchTerm] = useState('');
  const [plantCategory, setPlantCategory] = useState<string | null>(null);

  // Soil search/custom state
  const [soilSearchTerm, setSoilSearchTerm] = useState('');
  const [soilUseCustom, setSoilUseCustom] = useState(false);
  const [pendingCustomSoil, setPendingCustomSoil] = useState<{
    name: string;
    field_capacity: number;
    wilting_point: number;
    infiltration_rate: number;
    bulk_density: number;
    organic_matter: number;
    clay?: number;
    sand?: number;
    silt?: number;
  } | null>(null);
  const [existingCustomSoilName, setExistingCustomSoilName] = useState<string | null>(null);
  const [detectingSoil, setDetectingSoil] = useState(false);
  const [soilDetectError, setSoilDetectError] = useState<string | null>(null);
  const [zoneLocation, setZoneLocation] = useState<LocationData | null>(null);

  // Coverage editing state
  const [coverageText, setCoverageText] = useState('10');
  const coverageHoldIntervalRef = useRef<number | null>(null);
  const coverageHoldStartRef = useRef<number>(0);

  // Compensation editing state
  const [rainCompForm, setRainCompForm] = useState<ChannelCompensationConfigData['rain'] | null>(null);
  const [tempCompForm, setTempCompForm] = useState<ChannelCompensationConfigData['temp'] | null>(null);

  // Water management editing state (Cycle & Soak + Max Volume)
  const [waterManagementForm, setWaterManagementForm] = useState<{
    enableCycleSoak: boolean;
    cycleMinutes: number;
    soakMinutes: number;
    maxVolumeLimitL: number;
  } | null>(null);

  const zoneFetchInFlightRef = useRef<Promise<void> | null>(null);

  // Fetch zone data on mount and connection changes
  useEffect(() => {
    if (connectionState !== 'connected') return;
    const fetchZoneData = async () => {
      if (zoneFetchInFlightRef.current) return;
      setLoading(true);
      const promise = (async () => {
        try {
          // Read custom soil config and update store (null if not found)
          const customSoil = await bleService.readCustomSoilConfig(channelIdNum).catch(() => null);
          updateCustomSoilConfig(channelIdNum, customSoil);

          // Kick off state reads first; watering history should be requested last so its
          // timeout doesn't start while still waiting behind queued GATT operations.
          await Promise.all([
            bleService.readAutoCalcStatus(channelIdNum).catch(() => { }),
            bleService.readScheduleConfig(channelIdNum).catch(() => { }),
            bleService.readGrowingEnvironment(channelIdNum).catch(() => { }),
            bleService.readCompensationStatus(channelIdNum).catch(() => { }),
            bleService.readChannelCompensationConfig(channelIdNum).catch(() => { }),
            bleService.readStatistics(channelIdNum).catch(() => { }),
            bleService.readHydraulicStatus(channelIdNum).catch(() => { }),
          ]);

          await bleService.fetchWateringHistory(0, channelIdNum, 0, 20, 0, 0, 12000).catch(() => { });
        } catch (e) {
          console.warn('[ZoneDetails] Failed to fetch zone data:', e);
        } finally {
          setLoading(false);
        }
      })();

      zoneFetchInFlightRef.current = promise;
      try {
        await promise;
      } finally {
        zoneFetchInFlightRef.current = null;
      }
    };
    fetchZoneData();
  }, [bleService, channelIdNum, connectionState, updateCustomSoilConfig]);

  // Filter watering history for this zone
  const zoneHistory = useMemo(() => {
    return wateringHistory
      .filter(h => h.channel_id === channelIdNum)
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [wateringHistory, channelIdNum]);

  // Lookup helpers - respect initialization state
  const plantName = useMemo(() => {
    if (!isChannelInitialized || !growing) return t('zoneDetails.notConfigured');
    // Show the actual plant name from database, NOT the custom zone name
    // plant_db_index 0 is valid (Wheat). Only show "Not configured" if truly uninitialized
    // which is already handled by isChannelInitialized check above
    const entry = plantDb.find(p => p.id === growing.plant_db_index);
    return entry?.common_name_en || t('mobileZoneDetails.plantId').replace('{id}', String(growing.plant_db_index));
  }, [growing, plantDb, isChannelInitialized, t]);

  // Check if we have custom soil (from GPS detection or manual custom config)
  const isCustomSoil = useMemo(() => {
    if (customSoilConfig && customSoilConfig.status === 0 && customSoilConfig.name) return true;
    if (pendingCustomSoil?.name) return true;
    if (growing?.soil_db_index && growing.soil_db_index >= 200 && growing.soil_db_index < 255) return true;
    return false;
  }, [customSoilConfig, pendingCustomSoil, growing?.soil_db_index]);

  const soilName = useMemo(() => {
    if (!isChannelInitialized || !growing) return t('zoneDetails.notConfigured');

    // Check if we have a custom soil configuration from store (from device read)
    // Just show the name directly, badge will indicate it's custom
    if (customSoilConfig && customSoilConfig.status === 0 && customSoilConfig.name) {
      return customSoilConfig.name;
    }

    // If we have pending custom soil detection info (during edit), show it
    if (pendingCustomSoil?.name) {
      return pendingCustomSoil.name;
    }

    // soil_db_index >= 200 was old way to indicate custom/satellite soil (legacy)
    if (growing.soil_db_index >= 200 && growing.soil_db_index < 255) {
      return t('mobileZoneDetails.customSatellite');
    }

    if (growing.soil_db_index === 0) return t('zoneDetails.notConfigured');

    // Clamp to valid range for lookup (firmware uses 0-7)
    const lookupIndex = growing.soil_db_index <= 7 ? growing.soil_db_index : (growing.soil_db_index % 8);
    const entry = soilDb.find(s => s.id === lookupIndex);
    return entry?.soil_type || t('mobileZoneDetails.soilId').replace('{id}', String(growing.soil_db_index));
  }, [growing, soilDb, isChannelInitialized, pendingCustomSoil, customSoilConfig, t]);

  const irrigationMethodName = useMemo(() => {
    if (!isChannelInitialized || !growing) return t('zoneDetails.notConfigured');
    if (growing.irrigation_method_index === 0) return t('zoneDetails.notConfigured');
    const entry = irrigationMethodDb.find(m => m.id === growing.irrigation_method_index);
    return entry?.name || t('mobileZoneDetails.methodId').replace('{id}', String(growing.irrigation_method_index));
  }, [growing, irrigationMethodDb, isChannelInitialized, t]);

  // Next watering time from auto calc
  const nextWateringDisplay = useMemo(() => {
    const nextEpoch = autoCalc?.next_irrigation_time ?? 0;
    if (!nextEpoch) return { time: '--:--', date: t('zoneDetails.notScheduled') };
    const d = new Date(nextEpoch * 1000);
    return {
      time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  }, [autoCalc?.next_irrigation_time, t]);

  // Is FAO-56 auto mode (schedule type 2 or growing auto_mode > 0)
  const isFao56 = schedule?.schedule_type === 2 || (growing?.auto_mode ?? 0) > 0;

  // Schedule type label
  const scheduleTypeLabel = useMemo(() => {
    if (!schedule) return t('zoneDetails.unknown');
    switch (schedule.schedule_type) {
      case 0: return t('zoneDetails.daily');
      case 1: return t('zoneDetails.periodic');
      case 2: return t('zoneDetails.autoFao56');
      default: return t('mobileZoneDetails.typeValue').replace('{value}', String(schedule.schedule_type));
    }
  }, [schedule, t]);

  // Watering mode label
  const wateringModeLabel = useMemo(() => {
    if (!schedule) return t('zoneDetails.unknown');
    switch (schedule.watering_mode) {
      case 0: return t('zoneDetails.duration');
      case 1: return t('zoneDetails.volume');
      default: return t('mobileZoneDetails.modeValue').replace('{value}', String(schedule.watering_mode));
    }
  }, [schedule, t]);

  // Auto mode label
  const autoModeLabel = useMemo(() => {
    if (!growing) return t('zoneDetails.unknown');
    switch (growing.auto_mode) {
      case 0: return t('zoneDetails.manual');
      case 1: return t('zoneDetails.autoQuality');
      case 2: return t('zoneDetails.autoEco');
      default: return t('mobileZoneDetails.modeValue').replace('{value}', String(growing.auto_mode));
    }
  }, [growing, t]);

  // Days mask to weekday labels
  const scheduleDaysLabel = useMemo(() => {
    if (!schedule) return '';
    if (schedule.schedule_type === 1) {
      return t('mobileZoneDetails.everyXDays').replace('{count}', String(schedule.days_mask));
    }
    if (schedule.schedule_type === 2) return t('zones.auto');
    const days = [
      t('mobileZoneDetails.days.sun'),
      t('mobileZoneDetails.days.mon'),
      t('mobileZoneDetails.days.tue'),
      t('mobileZoneDetails.days.wed'),
      t('mobileZoneDetails.days.thu'),
      t('mobileZoneDetails.days.fri'),
      t('mobileZoneDetails.days.sat'),
    ];
    const active = days.filter((_, i) => (schedule.days_mask >> i) & 1);
    return active.length === 7 ? t('zoneDetails.everyDay') : active.join(', ');
  }, [schedule, t]);

  // Formatted schedule time
  const scheduleTimeLabel = useMemo(() => {
    if (!schedule) return '--:--';
    const h = schedule.hour % 12 || 12;
    const m = String(schedule.minute).padStart(2, '0');
    const ampm = schedule.hour >= 12 ? t('common.pm') : t('common.am');
    return `${h}:${m} ${ampm}`;
  }, [schedule, t]);

  // Compensation helpers
  const totalCompensationFactor = useMemo(() => {
    if (!compensation) return 100;
    // Temperature factor is typically in range 0.5-1.5, multiply by 100 to get percentage
    const tempFactor = compensation.temperature.active ? (compensation.temperature.factor * 100) : 100;
    // Rain reduction is subtracted
    const rainReduction = compensation.rain.active ? compensation.rain.reduction_percentage : 0;
    // Combined: temp factor adjusted by rain reduction
    return Math.max(0, Math.round(tempFactor - rainReduction));
  }, [compensation]);

  const compensationDelta = totalCompensationFactor - 100;

  // CurrentTaskData has status as number (0=Idle, 1=Running, 2=Paused)
  const isWatering = currentTask?.channel_id === channelIdNum && currentTask?.status === TaskStatus.RUNNING;
  // Calculate remaining time from current_value (elapsed) and target_value (total)
  const remainingTimeSec = currentTask ? Math.max(0, currentTask.target_value - currentTask.current_value) : 0;
  const totalDuration = currentTask?.target_value ?? 1;

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: t('zoneDetails.overview'), icon: 'dashboard' },
    { key: 'schedule', label: t('zoneDetails.schedule'), icon: 'calendar_month' },
    { key: 'compensation', label: t('zoneDetails.adjust'), icon: 'tune' },
    { key: 'history', label: t('zoneDetails.history'), icon: 'history' },
  ];

  const durations = [
    { label: t('zoneDetails.quick'), value: 5 },
    { label: t('zoneDetails.standard'), value: 10 },
    { label: t('zoneDetails.deep'), value: 20 },
    { label: t('zoneDetails.custom'), value: 0 },
  ];

  const handleStartWatering = async () => {
    if (!zone) return;
    try {
      await bleService.writeValveControl(zone.channel_id, 1, selectedDuration);
    } catch (err) {
      console.error('Failed to start watering:', err);
    }
  };

  const handleStopWatering = async () => {
    if (!zone) return;
    try {
      await bleService.stopCurrentWatering();
    } catch (err) {
      console.error('Failed to stop watering:', err);
    }
  };

  const handleResetZone = async () => {
    if (!zone) return;
    setResetPending(true);
    try {
      // Reset channel config (schedules, growing env, etc.)
      await bleService.requestReset(ResetOpcode.RESET_CHANNEL_CONFIG, zone.channel_id);
      // Also reset channel schedules
      await bleService.requestReset(ResetOpcode.RESET_CHANNEL_SCHEDULES, zone.channel_id);
      setShowResetConfirm(false);
      // Refresh data after reset
      await Promise.all([
        bleService.readScheduleConfig(channelIdNum).catch(() => { }),
        bleService.readGrowingEnvironment(channelIdNum).catch(() => { }),
        bleService.readAutoCalcStatus(channelIdNum).catch(() => { }),
      ]);
    } catch (err) {
      console.error('Failed to reset zone:', err);
    } finally {
      setResetPending(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Derive current watering mode from schedule/growing data
  const currentWateringMode = useMemo((): WateringModeType => {
    if (schedule?.schedule_type === 2 || (growing?.auto_mode ?? 0) > 0) {
      return growing?.auto_mode === 2 ? 'fao56_eco' : 'fao56_auto';
    }
    return schedule?.watering_mode === 1 ? 'volume' : 'duration';
  }, [schedule, growing]);

  // Sun level from percentage
  const currentSunLevel = useMemo((): 'shade' | 'partial' | 'full' => {
    const pct = growing?.sun_exposure_pct ?? 100;
    if (pct <= 30) return 'shade';
    if (pct <= 70) return 'partial';
    return 'full';
  }, [growing]);

  // Find plant/soil/irrigation from DB
  const currentPlant = useMemo(() => {
    if (!growing) return null;
    return plantDb.find(p => p.id === growing.plant_db_index) || null;
  }, [growing, plantDb]);

  const currentSoil = useMemo(() => {
    if (!growing) return null;
    if (growing.soil_db_index >= 200) return null; // Satellite soil
    return soilDb.find(s => s.id === growing.soil_db_index) || null;
  }, [growing, soilDb]);

  const filteredSoils = useMemo(() => {
    if (!soilSearchTerm.trim()) return soilDb;
    const lower = soilSearchTerm.trim().toLowerCase();
    return soilDb.filter(s =>
      s.soil_type?.toLowerCase().includes(lower) ||
      s.texture?.toLowerCase().includes(lower)
    );
  }, [soilDb, soilSearchTerm]);

  const currentIrrigation = useMemo(() => {
    if (!growing) return null;
    return irrigationMethodDb.find(m => m.id === growing.irrigation_method_index) || null;
  }, [growing, irrigationMethodDb]);

  // Open edit sheets with current values
  const openWateringModeEdit = useCallback(() => {
    setSelectedWateringMode(currentWateringMode);
    setEditSheet('watering-mode');
  }, [currentWateringMode]);

  const openScheduleEdit = useCallback(() => {
    if (schedule) {
      setScheduleForm({ ...schedule });
    } else {
      setScheduleForm({
        channel_id: channelIdNum,
        schedule_type: 0,
        days_mask: 0b1111111,
        hour: 6,
        minute: 0,
        watering_mode: 0,
        value: 10,
        auto_enabled: true,
        use_solar_timing: false,
        solar_event: 0,
        solar_offset_minutes: 0,
      });
    }
    setEditSheet('schedule');
  }, [schedule, channelIdNum]);

  const openPlantEdit = useCallback(() => {
    setSelectedPlant(currentPlant);
    setEditSheet('plant');
  }, [currentPlant]);

  const openSoilEdit = useCallback(() => {
    const isCustom = (growing?.soil_db_index ?? 0) >= 200;
    setSelectedSoil(currentSoil || soilDb[0] || null);
    setSoilSearchTerm('');
    setSoilDetectError(null);
    setSoilUseCustom(isCustom);
    setPendingCustomSoil(null);
    setExistingCustomSoilName(null);
    // Get zone location from growing env (only latitude is stored)
    if (growing?.latitude_deg) {
      setZoneLocation({ latitude: growing.latitude_deg, longitude: 0, source: 'gps' });
    }
    setEditSheet('soil');
  }, [currentSoil, growing, soilDb]);

  useEffect(() => {
    if (editSheet !== 'soil') return;
    let cancelled = false;

    (async () => {
      try {
        const cfg = await bleService.readCustomSoilConfig(channelIdNum);
        if (cancelled) return;
        setExistingCustomSoilName(cfg?.name || null);
      } catch {
        if (cancelled) return;
        setExistingCustomSoilName(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editSheet, bleService, channelIdNum]);

  const openIrrigationEdit = useCallback(() => {
    setSelectedIrrigation(currentIrrigation);
    setEditSheet('irrigation');
  }, [currentIrrigation]);

  const openCoverageEdit = useCallback(() => {
    if (growing) {
      setGrowingForm({ ...growing });
    }
    setEditSheet('coverage');
  }, [growing]);

  useEffect(() => {
    if (editSheet !== 'coverage' || !growingForm) return;
    const value = growingForm.use_area_based
      ? Math.round(growingForm.coverage.area_m2 || 10)
      : (growingForm.coverage.plant_count || 10);
    setCoverageText(String(value));
  }, [editSheet, growingForm?.use_area_based]);

  const stopCoverageHold = useCallback(() => {
    if (coverageHoldIntervalRef.current != null) {
      window.clearInterval(coverageHoldIntervalRef.current);
      coverageHoldIntervalRef.current = null;
    }
  }, []);

  const bumpCoverage = useCallback((direction: -1 | 1, step: number) => {
    setGrowingForm(prev => {
      if (!prev) return prev;
      if (prev.use_area_based) {
        const current = prev.coverage.area_m2 || 10;
        const next = Math.max(0.5, Math.min(1000, current + direction * step));
        setCoverageText(String(Math.round(next)));
        return { ...prev, coverage: { area_m2: next } };
      }
      const current = prev.coverage.plant_count || 10;
      const next = Math.max(1, Math.min(500, current + direction * step));
      setCoverageText(String(Math.round(next)));
      return { ...prev, coverage: { plant_count: next } };
    });
  }, []);

  const startCoverageHold = useCallback((direction: -1 | 1) => {
    stopCoverageHold();
    coverageHoldStartRef.current = Date.now();

    // First bump immediately
    bumpCoverage(direction, 1);

    coverageHoldIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - coverageHoldStartRef.current;
      const step = elapsed > 1800 ? 10 : elapsed > 900 ? 5 : 2;
      bumpCoverage(direction, step);
    }, 140);
  }, [bumpCoverage, stopCoverageHold]);

  useEffect(() => {
    if (editSheet !== 'coverage') stopCoverageHold();
    return () => stopCoverageHold();
  }, [editSheet, stopCoverageHold]);

  const detectSoilFromGPS = useCallback(async () => {
    if (detectingSoil) return;
    setDetectingSoil(true);
    setSoilDetectError(null);

    const getPosition = async (): Promise<{ lat: number; lon: number }> => {
      try {
        const { Geolocation } = await import('@capacitor/geolocation');
        const permission = await Geolocation.checkPermissions();
        if (permission.location === 'denied') throw new Error('GPS_DENIED');
        if (permission.location === 'prompt' || permission.location === 'prompt-with-rationale') {
          const requested = await Geolocation.requestPermissions();
          if (requested.location === 'denied') throw new Error('GPS_DENIED');
        }
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        return { lat: position.coords.latitude, lon: position.coords.longitude };
      } catch (_capErr) {
        if (!navigator.geolocation) throw new Error('GPS_NOT_AVAILABLE');
        return new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (position) => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
            (error) => {
              if (error.code === error.PERMISSION_DENIED) reject(new Error('GPS_DENIED'));
              else if (error.code === error.POSITION_UNAVAILABLE) reject(new Error('GPS_NOT_AVAILABLE'));
              else reject(new Error('GPS_TIMEOUT'));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
          );
        });
      }
    };

    try {
      const { lat, lon } = await getPosition();
      setZoneLocation({ latitude: lat, longitude: lon, source: 'gps' });

      const plantForRootDepth = selectedPlant || currentPlant;
      const rootDepthCm = (plantForRootDepth?.root_depth_max_m ? plantForRootDepth.root_depth_max_m * 100 : 30);
      const soilResult = await SoilGridsServiceInstance.detectSoilFromLocation(lat, lon, rootDepthCm);
      const isRealDetection = soilResult?.source === 'api' || soilResult?.source === 'cache';
      if (soilResult && isRealDetection && soilResult.matchedSoil && soilResult.clay > 0) {
        setSelectedSoil(soilResult.matchedSoil);
        const customParams = estimateSoilParametersFromTexture(
          soilResult.clay,
          soilResult.sand,
          soilResult.silt,
          { language }
        );
        setPendingCustomSoil({
          name: customParams.name,
          field_capacity: customParams.field_capacity,
          wilting_point: customParams.wilting_point,
          infiltration_rate: customParams.infiltration_rate,
          bulk_density: customParams.bulk_density,
          organic_matter: customParams.organic_matter,
          clay: soilResult.clay,
          sand: soilResult.sand,
          silt: soilResult.silt,
        });
        setSoilUseCustom(true);
      } else {
        const loamSoil = soilDb.find(s => s.soil_type?.toLowerCase().includes('loam'));
        setSelectedSoil(loamSoil || soilDb[0] || null);
        setPendingCustomSoil(null);
        setSoilUseCustom(false);
        setSoilDetectError(t('mobileZoneDetails.soilDetectUnavailable'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === 'GPS_DENIED') {
        setSoilDetectError(t('mobileZoneDetails.soilDetectGpsDenied'));
      } else if (message === 'GPS_NOT_AVAILABLE') {
        setSoilDetectError(t('mobileZoneDetails.soilDetectNotAvailable'));
      } else {
        setSoilDetectError(t('mobileZoneDetails.soilDetectFailed'));
      }
    } finally {
      setDetectingSoil(false);
    }
  }, [detectingSoil, selectedPlant, currentPlant, soilDb, t]);

  const openSunEdit = useCallback(() => {
    setSunLevel(currentSunLevel);
    setEditSheet('sun');
  }, [currentSunLevel]);

  // Save handlers
  const handleSaveWateringMode = async () => {
    setSaving(true);
    try {
      // Build growing env update
      const newAutoMode = selectedWateringMode === 'fao56_auto' ? 1 :
        selectedWateringMode === 'fao56_eco' ? 2 : 0;
      const isFao56 = selectedWateringMode.startsWith('fao56');

      // Build schedule update
      const newSchedule: ScheduleConfigData = {
        channel_id: channelIdNum,
        schedule_type: isFao56 ? 2 : 0, // 2 = Auto/FAO-56
        days_mask: schedule?.days_mask ?? 0b1111111,
        hour: schedule?.hour ?? 6,
        minute: schedule?.minute ?? 0,
        watering_mode: selectedWateringMode === 'volume' ? 1 : 0,
        value: schedule?.value ?? 10,
        auto_enabled: true,
        use_solar_timing: schedule?.use_solar_timing ?? false,
        solar_event: schedule?.solar_event ?? 0,
        solar_offset_minutes: schedule?.solar_offset_minutes ?? 0,
      };

      await bleService.writeScheduleConfig(newSchedule);

      // Update growing env auto_mode if FAO-56
      if (growing) {
        const newGrowing: GrowingEnvData = {
          ...growing,
          auto_mode: newAutoMode,
        };
        await bleService.writeGrowingEnvironment(newGrowing);
      }

      // Re-read
      await bleService.readScheduleConfig(channelIdNum);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save watering mode:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm) return;
    setSaving(true);
    try {
      await bleService.writeScheduleConfig(scheduleForm);
      await bleService.readScheduleConfig(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save schedule:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlant = async () => {
    if (!selectedPlant || !growing) return;
    setSaving(true);
    try {
      const newGrowing: GrowingEnvData = {
        ...growing,
        plant_db_index: selectedPlant.id,
        // Keep the zone name, not the plant name!
        custom_name: zone?.name || growing.custom_name,
      };
      await bleService.writeGrowingEnvironment(newGrowing);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save plant:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSoil = async () => {
    if (!growing) return;
    setSaving(true);
    try {
      if (soilUseCustom) {
        if (pendingCustomSoil) {
          try {
            await bleService.updateCustomSoilConfig({
              channel_id: channelIdNum,
              name: pendingCustomSoil.name,
              field_capacity: pendingCustomSoil.field_capacity,
              wilting_point: pendingCustomSoil.wilting_point,
              infiltration_rate: pendingCustomSoil.infiltration_rate,
              bulk_density: pendingCustomSoil.bulk_density,
              organic_matter: pendingCustomSoil.organic_matter,
            });
          } catch {
            await bleService.createCustomSoilConfig({
              channel_id: channelIdNum,
              name: pendingCustomSoil.name,
              field_capacity: pendingCustomSoil.field_capacity,
              wilting_point: pendingCustomSoil.wilting_point,
              infiltration_rate: pendingCustomSoil.infiltration_rate,
              bulk_density: pendingCustomSoil.bulk_density,
              organic_matter: pendingCustomSoil.organic_matter,
            });
          }
        } else if (!existingCustomSoilName) {
          throw new Error(t('mobileZoneDetails.noCustomSoilProfile'));
        }

        const newGrowing: GrowingEnvData = {
          ...growing,
          soil_db_index: 255,
        };
        await bleService.writeGrowingEnvironment(newGrowing);
      } else {
        if (!selectedSoil) throw new Error(t('wizard.validation.soilRequired'));
        try {
          await bleService.deleteCustomSoilConfig(channelIdNum);
        } catch {
          // ignore
        }
        const newGrowing: GrowingEnvData = {
          ...growing,
          soil_db_index: selectedSoil.id,
        };
        await bleService.writeGrowingEnvironment(newGrowing);
      }
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save soil:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIrrigation = async () => {
    if (!selectedIrrigation || !growing) return;
    setSaving(true);
    try {
      const newGrowing: GrowingEnvData = {
        ...growing,
        irrigation_method_index: selectedIrrigation.id,
      };
      await bleService.writeGrowingEnvironment(newGrowing);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save irrigation:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCoverage = async () => {
    if (!growingForm) return;
    setSaving(true);
    try {
      await bleService.writeGrowingEnvironment(growingForm);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save coverage:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSun = async () => {
    if (!growing) return;
    setSaving(true);
    try {
      const sunPct = sunLevel === 'shade' ? 20 : sunLevel === 'partial' ? 50 : 100;
      const newGrowing: GrowingEnvData = {
        ...growing,
        sun_exposure_pct: sunPct,
        sun_percentage: sunPct,
      };
      await bleService.writeGrowingEnvironment(newGrowing);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save sun exposure:', err);
    } finally {
      setSaving(false);
    }
  };

  // Keep legacy for schedule
  const handleSaveGrowing = async () => {
    if (!growingForm) return;
    setSaving(true);
    try {
      await bleService.writeGrowingEnvironment(growingForm);
      await bleService.readGrowingEnvironment(channelIdNum);
      await bleService.readAutoCalcStatus(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save growing environment:', err);
    } finally {
      setSaving(false);
    }
  };

  // Open rain compensation edit
  const openRainCompEdit = () => {
    const current = compConfig?.rain ?? {
      enabled: false,
      sensitivity: 0.5,
      lookback_hours: 24,
      skip_threshold_mm: 10,
      reduction_factor: 0.5,
    };
    setRainCompForm(current);
    setEditSheet('rain-compensation');
  };

  // Open temp compensation edit
  const openTempCompEdit = () => {
    const current = compConfig?.temp ?? {
      enabled: false,
      base_temperature: 25,
      sensitivity: 1.0,
      min_factor: 0.7,
      max_factor: 1.5,
    };
    setTempCompForm(current);
    setEditSheet('temp-compensation');
  };

  const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

  const sanitizeRainComp = (rain: ChannelCompensationConfigData['rain']): ChannelCompensationConfigData['rain'] => {
    return {
      enabled: !!rain.enabled,
      sensitivity: clamp(rain.sensitivity, 0.0, 1.0),
      lookback_hours: Math.round(clamp(rain.lookback_hours, 1, 72)),
      skip_threshold_mm: clamp(rain.skip_threshold_mm, 0.0, 100.0),
      reduction_factor: clamp(rain.reduction_factor, 0.0, 1.0),
    };
  };

  const sanitizeTempComp = (temp: ChannelCompensationConfigData['temp']): ChannelCompensationConfigData['temp'] => {
    return {
      enabled: !!temp.enabled,
      base_temperature: clamp(temp.base_temperature, -40.0, 60.0),
      sensitivity: clamp(temp.sensitivity, 0.1, 2.0),
      min_factor: clamp(temp.min_factor, 0.5, 1.0),
      max_factor: clamp(temp.max_factor, 1.0, 2.0),
    };
  };

  const formatTimeAgo = (unixSeconds?: number) => {
    if (!unixSeconds) return '--';
    const diffMs = Date.now() - unixSeconds * 1000;
    if (!Number.isFinite(diffMs)) return '--';
    if (diffMs < 30_000) return t('alarmHistory.time.justNow');
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return t('statistics.timeAgoMinutes').replace('{minutes}', String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return t('statistics.timeAgoHours').replace('{hours}', String(hours));
    const days = Math.floor(hours / 24);
    return t('statistics.timeAgoDays').replace('{days}', String(days));
  };

  // Save rain compensation
  const handleSaveRainComp = async () => {
    if (!rainCompForm) return;
    setSaving(true);
    try {
      const newConfig: ChannelCompensationConfigData = {
        channel_id: channelIdNum,
        rain: sanitizeRainComp(rainCompForm),
        temp: compConfig?.temp ?? {
          enabled: false,
          base_temperature: 25,
          sensitivity: 1.0,
          min_factor: 0.7,
          max_factor: 1.5,
        },
        last_rain_calc_time: compConfig?.last_rain_calc_time ?? 0,
        last_temp_calc_time: compConfig?.last_temp_calc_time ?? 0,
      };
      newConfig.temp = sanitizeTempComp(newConfig.temp);
      await bleService.writeChannelCompensationConfig(newConfig);
      await bleService.readChannelCompensationConfig(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save rain compensation:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save temp compensation
  const handleSaveTempComp = async () => {
    if (!tempCompForm) return;
    setSaving(true);
    try {
      const newConfig: ChannelCompensationConfigData = {
        channel_id: channelIdNum,
        rain: compConfig?.rain ?? {
          enabled: false,
          sensitivity: 0.5,
          lookback_hours: 24,
          skip_threshold_mm: 10,
          reduction_factor: 0.5,
        },
        temp: sanitizeTempComp(tempCompForm),
        last_rain_calc_time: compConfig?.last_rain_calc_time ?? 0,
        last_temp_calc_time: compConfig?.last_temp_calc_time ?? 0,
      };
      newConfig.rain = sanitizeRainComp(newConfig.rain);
      await bleService.writeChannelCompensationConfig(newConfig);
      await bleService.readChannelCompensationConfig(channelIdNum);
      setEditSheet(null);
    } catch (err) {
      console.error('Failed to save temperature compensation:', err);
    } finally {
      setSaving(false);
    }
  };

  // Save water management (Cycle & Soak + Max Volume)
  const handleSaveWaterManagement = async () => {
    if (!waterManagementForm || !growing) return;
    setSaving(true);
    try {
      // Update enable_cycle_soak and max_volume_limit_l in Growing Environment
      const updatedGrowing: GrowingEnvData = {
        ...growing,
        enable_cycle_soak: waterManagementForm.enableCycleSoak,
        max_volume_limit_l: waterManagementForm.maxVolumeLimitL,
      };
      await bleService.writeGrowingEnvironment(updatedGrowing);

      // Write Interval Mode Config for cycle/soak durations (Characteristic #32)
      await bleService.writeIntervalModeConfig({
        channel_id: channelIdNum,
        enabled: waterManagementForm.enableCycleSoak,
        watering_minutes: waterManagementForm.cycleMinutes,
        watering_seconds: 0,
        pause_minutes: waterManagementForm.soakMinutes,
        pause_seconds: 0,
        configured: true,
        last_update: 0,
      });

      await bleService.readGrowingEnvironment(channelIdNum);
      setEditSheet(null);
      console.log(`[ZoneDetails] Saved Water Management: cycleSoak=${waterManagementForm.enableCycleSoak}, ` +
        `cycle=${waterManagementForm.cycleMinutes}min, soak=${waterManagementForm.soakMinutes}min, ` +
        `maxVolume=${waterManagementForm.maxVolumeLimitL}L`);
    } catch (err) {
      console.error('Failed to save water management:', err);
    } finally {
      setSaving(false);
    }
  };

  // Day toggle helper
  const toggleDay = (dayIndex: number) => {
    if (!scheduleForm) return;
    const newMask = scheduleForm.days_mask ^ (1 << dayIndex);
    setScheduleForm({ ...scheduleForm, days_mask: newMask });
  };

  if (!zone) {
    return (
      <div className="min-h-screen bg-mobile-bg-dark font-manrope flex items-center justify-center">
        <p className="text-mobile-text-muted">{t('mobileZoneDetails.zoneNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-mobile-bg-dark font-manrope flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 pb-2 justify-between shrink-0">
        <button
          onClick={handleBack}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-white text-lg font-bold leading-tight">{zone.name}</h2>
          <p className="text-mobile-text-muted text-xs">{t('zones.zone')} {zone.channel_id + 1}</p>
        </div>
        {/* Empty spacer for symmetry */}
        <div className="size-12" />
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-mobile-primary text-xs font-medium text-center py-1 animate-pulse shrink-0">
          {t('mobileZoneDetails.loadingZone')}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="px-4 mb-4 shrink-0">
        <div className="flex gap-1 bg-mobile-surface-dark rounded-full p-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full text-sm font-semibold transition-all ${activeTab === tab.key
                ? 'bg-mobile-primary text-mobile-bg-dark'
                : 'text-mobile-text-muted hover:text-white'
                }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {/* Status Card */}
            <div className="relative overflow-hidden rounded-3xl bg-mobile-surface-dark border border-mobile-border-dark">
              <div className="relative flex flex-col items-center justify-center p-8 z-10">
                {/* Status Badge */}
                <div className={`mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm border ${isWatering
                  ? 'bg-mobile-primary/20 border-mobile-primary/30'
                  : 'bg-white/10 border-white/20'
                  }`}>
                  {isWatering && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary" />
                    </span>
                  )}
                  <span className={`text-sm font-bold tracking-wide uppercase ${isWatering ? 'text-mobile-primary' : 'text-white'
                    }`}>
                    {isWatering ? t('zoneDetails.wateringActive') : t('zoneDetails.idle')}
                  </span>
                </div>

                {/* Timer Ring */}
                <div className="relative mb-4 flex items-center justify-center">
                  <div className="size-48 rounded-full border-[6px] border-mobile-border-dark flex items-center justify-center relative">
                    {isWatering && (
                      <svg className="absolute inset-0 size-full -rotate-90 transform" viewBox="0 0 100 100">
                        <circle
                          cx="50" cy="50" r="46"
                          fill="transparent"
                          stroke="#13ec37"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray="290"
                          strokeDashoffset={290 * (1 - remainingTimeSec / totalDuration)}
                        />
                      </svg>
                    )}
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-mobile-primary text-4xl mb-1">
                        water_drop
                      </span>
                      <span className="text-5xl font-black text-white tracking-tighter font-manrope">
                        {isWatering ? formatTime(remainingTimeSec) : '--:--'}
                      </span>
                      <span className="text-mobile-text-muted text-sm font-medium mt-1">
                        {isWatering ? t('mobileZoneDetails.remainingLabel') : t('mobileZoneDetails.idleLabel')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Next Watering Info Card */}
                <div className="mt-6 mb-2">
                  <div className="relative overflow-hidden rounded-2xl bg-white/5 border border-white/10 p-5 min-h-[72px]">
                    <div className="absolute inset-0 bg-gradient-to-r from-mobile-primary/10 to-transparent opacity-50" />
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-mobile-primary/20 text-mobile-primary">
                          <span className="material-symbols-outlined text-2xl">event</span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-sm">
                            {autoCalc?.next_irrigation_time ? t('zoneDetails.nextWatering') : t('zoneDetails.schedule')}
                          </h3>
                          <div className="flex items-center gap-2">
                            <span className="text-mobile-primary/80 text-xs">
                              {autoCalc?.next_irrigation_time
                                ? `${nextWateringDisplay.date}${t('mobileZoneDetails.inlineSeparator')}${nextWateringDisplay.time}`
                                : schedule?.auto_enabled
                                  ? `${scheduleDaysLabel}${t('mobileZoneDetails.inlineSeparator')}${scheduleTimeLabel}`
                                  : t('zoneDetails.notScheduled')}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Decoration Icon */}
                      {(autoCalc?.next_irrigation_time || schedule?.auto_enabled) && (
                        <div className="text-white/10">
                          <span className="material-symbols-outlined text-3xl">schedule</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hydraulic Status Card */}
            {hydraulic && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                <HydraulicDetailsCard data={hydraulic} />
              </div>
            )}

            {/* Soil Tank Widget */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
              <SoilTankWidget channelId={channelIdNum} />
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-white text-base font-bold mb-4 px-1">{t('dashboard.quickActions')}</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={handleStopWatering}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-mobile-surface-dark p-4 hover:bg-red-500/10 transition-all active:scale-95 border border-mobile-border-dark"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-[28px]">stop_circle</span>
                  </div>
                  <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('zoneDetails.stopWatering')}</span>
                </button>

                <button className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-mobile-surface-dark p-4 hover:bg-mobile-primary/10 transition-all active:scale-95 border border-mobile-border-dark">
                  <div className="flex size-12 items-center justify-center rounded-full bg-mobile-primary/10 text-mobile-primary group-hover:bg-mobile-primary group-hover:text-mobile-bg-dark transition-colors">
                    <span className="material-symbols-outlined text-[28px]">skip_next</span>
                  </div>
                  <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('common.skip')}</span>
                </button>

                <button
                  onClick={() => selectTab('schedule')}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl bg-mobile-surface-dark p-4 hover:bg-white/10 transition-all active:scale-95 border border-mobile-border-dark"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-white/5 text-white group-hover:bg-white group-hover:text-mobile-bg-dark transition-colors">
                    <span className="material-symbols-outlined text-[28px]">calendar_clock</span>
                  </div>
                  <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('zoneDetails.schedule')}</span>
                </button>
              </div>
            </div>

            {/* Stats Grid - FAO-56 mode only */}
            {isFao56 && (
              <div>
                <h3 className="text-white text-base font-bold mb-4 px-1">{t('mobileZoneDetails.smartStatsTitle')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Water Loss (ET0) */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                        <span className="material-symbols-outlined">wb_sunny</span>
                      </div>
                      {autoCalc?.calculation_active && (
                        <span className="text-xs font-medium text-mobile-primary bg-mobile-primary/10 px-2 py-1 rounded-full">{t('labels.active')}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.et0_mm_day?.toFixed(1) ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.waterLossPerDay')}</span>
                    </div>
                  </div>

                  {/* Plant Needs (ETc) */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-green-500/20 text-green-400">
                        <span className="material-symbols-outlined">eco</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                        Kc={autoCalc?.crop_coefficient?.toFixed(2) ?? '--'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.etc_mm_day?.toFixed(1) ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.plantNeedsPerDay')}</span>
                    </div>
                  </div>

                  {/* Water Deficit */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                        <span className="material-symbols-outlined">trending_down</span>
                      </div>
                      {autoCalc?.irrigation_needed && (
                        <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-1 rounded-full">{t('mobileZoneDetails.needBadge')}</span>
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.current_deficit_mm?.toFixed(1) ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.waterDeficit')}</span>
                    </div>
                  </div>

                  {/* Volume */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-mobile-primary/20 text-mobile-primary">
                        <span className="material-symbols-outlined">water_drop</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.calculated_volume_l?.toFixed(1) ?? zoneStats?.total_volume?.toFixed(0) ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('common.litersShort')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.calculatedVolume')}</span>
                    </div>
                  </div>

                  {/* Days After Planting */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                        <span className="material-symbols-outlined">calendar_today</span>
                      </div>
                      <span className="text-xs font-medium text-gray-400 bg-white/5 px-2 py-1 rounded-full">
                        {t('mobileZoneDetails.stageLabel').replace('{stage}', String(autoCalc?.phenological_stage ?? '--'))}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.days_after_planting ?? growing?.days_after_planting ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.days')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.afterPlanting')}</span>
                    </div>
                  </div>

                  {/* Effective Rain */}
                  <div className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                        <span className="material-symbols-outlined">rainy</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {autoCalc?.effective_rain_mm?.toFixed(1) ?? '--'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.rainBenefit')}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cycle & Soak Status (FAO-56 only) - CLICKABLE */}
            {isFao56 && growing && (
              <div>
                <div className="flex items-center justify-between mb-4 px-1">
                  <h3 className="text-white text-base font-bold">{t('mobileZoneDetails.waterManagement')}</h3>
                  <button
                    onClick={() => {
                      setWaterManagementForm({
                        enableCycleSoak: growing.enable_cycle_soak ?? false,
                        cycleMinutes: 5,  // Default - firmware doesn't store this yet
                        soakMinutes: 10,  // Default - firmware doesn't store this yet
                        maxVolumeLimitL: growing.max_volume_limit_l ?? 50,
                      });
                      setEditSheet('water-management');
                    }}
                    className="text-mobile-primary text-sm font-medium flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                    {t('common.edit')}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cycle & Soak - Clickable */}
                  <button
                    onClick={() => {
                      setWaterManagementForm({
                        enableCycleSoak: growing.enable_cycle_soak ?? false,
                        cycleMinutes: 5,
                        soakMinutes: 10,
                        maxVolumeLimitL: growing.max_volume_limit_l ?? 50,
                      });
                      setEditSheet('water-management');
                    }}
                    className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark hover:border-mobile-primary/50 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`flex size-10 items-center justify-center rounded-full ${growing.enable_cycle_soak ? 'bg-cyan-500/20 text-cyan-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        <span className="material-symbols-outlined">waves</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${growing.enable_cycle_soak ? 'text-cyan-400 bg-cyan-500/10' : 'text-gray-400 bg-white/5'}`}>
                        {growing.enable_cycle_soak ? t('labels.active') : t('common.off')}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-bold text-white">
                        {t('cycleSoak.title')}
                      </span>
                      <span className="text-sm text-mobile-text-muted">
                        {growing.enable_cycle_soak ? t('zoneDetails.preventsRunoff') : t('labels.inactive')}
                      </span>
                    </div>
                  </button>

                  {/* Max Volume Limit - Clickable */}
                  <button
                    onClick={() => {
                      setWaterManagementForm({
                        enableCycleSoak: growing.enable_cycle_soak ?? false,
                        cycleMinutes: 5,
                        soakMinutes: 10,
                        maxVolumeLimitL: growing.max_volume_limit_l ?? 50,
                      });
                      setEditSheet('water-management');
                    }}
                    className="flex flex-col rounded-2xl bg-mobile-surface-dark p-5 border border-mobile-border-dark hover:border-mobile-primary/50 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex size-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400">
                        <span className="material-symbols-outlined">water_full</span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-3xl font-bold text-white">
                        {growing.max_volume_limit_l?.toFixed(0) ?? '50'}
                        <span className="text-lg font-medium text-mobile-text-muted ml-1">{t('common.litersShort')}</span>
                      </span>
                      <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.maxVolumePerWatering')}</span>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Manual Start */}
            <div>
              <h3 className="text-white text-base font-bold mb-4 px-1">{t('mobileZoneDetails.manualControl')}</h3>
              <div className="flex gap-3 mb-4 overflow-x-auto pb-2">
                {durations.map(d => (
                  <button
                    key={d.value}
                    onClick={() => d.value > 0 && setSelectedDuration(d.value)}
                    className={`flex-1 min-w-[80px] py-3 rounded-xl text-sm transition-all active:scale-95 ${selectedDuration === d.value
                      ? 'bg-mobile-primary/20 border-2 border-mobile-primary text-mobile-primary font-bold'
                      : 'bg-white/5 border border-transparent hover:border-mobile-primary/50 text-white font-semibold'
                      }`}
                  >
                    <span className="block text-xs text-mobile-text-muted mb-0.5">{d.label}</span>
                    {d.value > 0 ? `${d.value}${t('common.minutesShort')}` : '...'}
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartWatering}
                disabled={isWatering}
                className={`w-full h-16 rounded-full font-extrabold text-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${isWatering
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-mobile-primary text-mobile-bg-dark shadow-[0_0_20px_rgba(19,236,55,0.3)] hover:shadow-[0_0_30px_rgba(19,236,55,0.4)]'
                  }`}
              >
                <span className="material-symbols-outlined text-[28px]">water_drop</span>
                <span className="uppercase tracking-wide">{t('zoneDetails.startWatering')}</span>
              </button>
              <p className="text-center text-white/30 text-xs mt-4">
                {t('mobileZoneDetails.tapToStartCycle').replace('{minutes}', String(selectedDuration))}
              </p>
            </div>

            {/* Reset Zone Section */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <button
                onClick={() => setShowResetConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-3 text-red-400 hover:text-red-300 transition-colors"
              >
                <span className="material-symbols-outlined">restart_alt</span>
                <span className="font-medium">{t('zoneDetails.resetZone')}</span>
              </button>
            </div>
          </div>
        )}

        {/* Reset Confirmation Modal */}
        {showResetConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-mobile-card-dark rounded-2xl p-6 max-w-sm w-full border border-white/10">
              <div className="flex items-center justify-center mb-4">
                <div className="size-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
                </div>
              </div>
              <h3 className="text-white text-lg font-bold text-center mb-2">{t('zoneDetails.resetZone')}?</h3>
              <p className="text-mobile-text-muted text-sm text-center mb-6">
                {t('mobileZoneDetails.resetConfirmBody')
                  .replace('{zone}', String(zone.channel_id + 1))
                  .replace('{name}', zone.name)}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetPending}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleResetZone}
                  disabled={resetPending}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-400 transition-colors flex items-center justify-center gap-2"
                >
                  {resetPending ? (
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">restart_alt</span>
                      {t('common.confirm')}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Watering Mode Edit Sheet */}
        {editSheet === 'watering-mode' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.wateringModeTitle')}</h3>
              <button
                onClick={handleSaveWateringMode}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-mobile-text-muted text-sm mb-4">
                {t('mobileZoneDetails.wateringModeSubtitle')}
              </p>

              {/* FAO-56 Auto */}
              <button
                onClick={() => setSelectedWateringMode('fao56_auto')}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedWateringMode === 'fao56_auto'
                  ? 'bg-green-500/20 border-green-500 ring-2 ring-green-500/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${selectedWateringMode === 'fao56_auto' ? 'bg-green-500/30' : 'bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-3xl text-green-400">eco</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold text-lg">{t('mobileZoneDetails.smartAutoTitle')}</h4>
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-bold rounded-full">{t('mobileZoneDetails.recommendedBadge')}</span>
                    </div>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.smartAutoDesc')}
                    </p>
                  </div>
                  {selectedWateringMode === 'fao56_auto' && (
                    <span className="material-symbols-outlined text-green-400">check_circle</span>
                  )}
                </div>
              </button>

              {/* FAO-56 Eco */}
              <button
                onClick={() => setSelectedWateringMode('fao56_eco')}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedWateringMode === 'fao56_eco'
                  ? 'bg-cyan-500/20 border-cyan-500 ring-2 ring-cyan-500/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${selectedWateringMode === 'fao56_eco' ? 'bg-cyan-500/30' : 'bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-3xl text-cyan-400">savings</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-white font-bold text-lg">{t('mobileZoneDetails.smartEcoTitle')}</h4>
                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs font-bold rounded-full">{t('mobileZoneDetails.waterSaverBadge')}</span>
                    </div>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.smartEcoDesc')}
                    </p>
                  </div>
                  {selectedWateringMode === 'fao56_eco' && (
                    <span className="material-symbols-outlined text-cyan-400">check_circle</span>
                  )}
                </div>
              </button>

              {/* Duration */}
              <button
                onClick={() => setSelectedWateringMode('duration')}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedWateringMode === 'duration'
                  ? 'bg-blue-500/20 border-blue-500 ring-2 ring-blue-500/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${selectedWateringMode === 'duration' ? 'bg-blue-500/30' : 'bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-3xl text-blue-400">timer</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('zoneDetails.fixedDuration')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.fixedDurationDesc')}
                    </p>
                  </div>
                  {selectedWateringMode === 'duration' && (
                    <span className="material-symbols-outlined text-blue-400">check_circle</span>
                  )}
                </div>
              </button>

              {/* Volume */}
              <button
                onClick={() => setSelectedWateringMode('volume')}
                className={`w-full p-5 rounded-2xl border text-left transition-all ${selectedWateringMode === 'volume'
                  ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${selectedWateringMode === 'volume' ? 'bg-purple-500/30' : 'bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-3xl text-purple-400">water_drop</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('zoneDetails.fixedVolume')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.fixedVolumeDesc')}
                    </p>
                  </div>
                  {selectedWateringMode === 'volume' && (
                    <span className="material-symbols-outlined text-purple-400">check_circle</span>
                  )}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Schedule Edit Sheet */}
        {editSheet === 'schedule' && scheduleForm && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('zoneDetails.schedule')}</h3>
              <button
                onClick={handleSaveSchedule}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Schedule Enabled Toggle */}
              <div className="flex items-center justify-between p-4 bg-mobile-surface-dark rounded-2xl border border-mobile-border-dark">
                <div>
                  <p className="text-white font-bold">{t('mobileZoneDetails.scheduleActiveTitle')}</p>
                  <p className="text-mobile-text-muted text-sm">{t('mobileZoneDetails.scheduleActiveSubtitle')}</p>
                </div>
                <button
                  onClick={() => setScheduleForm({ ...scheduleForm, auto_enabled: !scheduleForm.auto_enabled })}
                  className={`w-14 h-8 rounded-full relative transition-colors ${scheduleForm.auto_enabled ? 'bg-mobile-primary' : 'bg-white/20'
                    }`}
                >
                  <span className={`absolute top-1 size-6 rounded-full bg-white transition-all ${scheduleForm.auto_enabled ? 'left-7' : 'left-1'
                    }`} />
                </button>
              </div>

              {/* Days Selection */}
              {scheduleForm.schedule_type !== 2 && (
                <div>
                  <label className="text-white font-bold mb-3 block">{t('mobileZoneDetails.wateringDaysLabel')}</label>
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      t('mobileZoneDetails.days.sun'),
                      t('mobileZoneDetails.days.mon'),
                      t('mobileZoneDetails.days.tue'),
                      t('mobileZoneDetails.days.wed'),
                      t('mobileZoneDetails.days.thu'),
                      t('mobileZoneDetails.days.fri'),
                      t('mobileZoneDetails.days.sat'),
                    ].map((day, i) => (
                      <button
                        key={i}
                        onClick={() => toggleDay(i)}
                        className={`flex flex-col items-center p-3 rounded-xl transition-all ${(scheduleForm.days_mask >> i) & 1
                          ? 'bg-mobile-primary text-black'
                          : 'bg-mobile-surface-dark text-mobile-text-muted border border-mobile-border-dark hover:bg-white/10'
                          }`}
                      >
                        <span className="text-xs font-bold">{day}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Time Picker */}
              {scheduleForm.schedule_type !== 2 && (
                <div>
                  <label className="text-white font-bold mb-3 block">{t('mobileZoneDetails.startTimeLabel')}</label>
                  <div className="flex items-center justify-center gap-4 bg-mobile-surface-dark rounded-2xl p-6 border border-mobile-border-dark">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, hour: (scheduleForm.hour + 1) % 24 })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">expand_less</span>
                      </button>
                      <span className="text-5xl font-bold text-white my-2 w-20 text-center">
                        {String(scheduleForm.hour).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, hour: (scheduleForm.hour - 1 + 24) % 24 })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>
                    <span className="text-4xl font-bold text-white">:</span>
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, minute: (scheduleForm.minute + 5) % 60 })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">expand_less</span>
                      </button>
                      <span className="text-5xl font-bold text-white my-2 w-20 text-center">
                        {String(scheduleForm.minute).padStart(2, '0')}
                      </span>
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, minute: (scheduleForm.minute - 5 + 60) % 60 })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined">expand_more</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Duration/Volume Value */}
              {scheduleForm.schedule_type !== 2 && (
                <div>
                  <label className="text-white font-bold mb-3 block">
                    {scheduleForm.watering_mode === 0 ? t('zoneDetails.duration') : t('zoneDetails.volume')}
                  </label>
                  <div className="flex items-center gap-4 bg-mobile-surface-dark rounded-2xl p-6 border border-mobile-border-dark">
                    <button
                      onClick={() => setScheduleForm({ ...scheduleForm, value: Math.max(1, scheduleForm.value - (scheduleForm.watering_mode === 0 ? 1 : 5)) })}
                      className="size-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-2xl">remove</span>
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-5xl font-bold text-white">{scheduleForm.value}</span>
                      <span className="text-mobile-text-muted ml-2 text-lg">
                        {scheduleForm.watering_mode === 0 ? t('common.minutesShort') : t('common.litersShort')}
                      </span>
                    </div>
                    <button
                      onClick={() => setScheduleForm({ ...scheduleForm, value: Math.min(500, scheduleForm.value + (scheduleForm.watering_mode === 0 ? 1 : 5)) })}
                      className="size-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-2xl">add</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Solar Timing */}
              {scheduleForm.schedule_type !== 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-mobile-surface-dark rounded-2xl border border-mobile-border-dark">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-orange-400">wb_sunny</span>
                      <div>
                        <p className="text-white font-bold">{t('mobileZoneDetails.solarTimingTitle')}</p>
                        <p className="text-mobile-text-muted text-sm">{t('mobileZoneDetails.solarTimingSubtitle')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setScheduleForm({ ...scheduleForm, use_solar_timing: !scheduleForm.use_solar_timing })}
                      className={`w-14 h-8 rounded-full relative transition-colors ${scheduleForm.use_solar_timing ? 'bg-mobile-primary' : 'bg-white/20'
                        }`}
                    >
                      <span className={`absolute top-1 size-6 rounded-full bg-white transition-all ${scheduleForm.use_solar_timing ? 'left-7' : 'left-1'
                        }`} />
                    </button>
                  </div>

                  {scheduleForm.use_solar_timing && (
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, solar_event: 1 })}
                        className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${scheduleForm.solar_event === 1
                          ? 'bg-orange-500/20 border-orange-500'
                          : 'bg-mobile-surface-dark border-mobile-border-dark'
                          }`}
                      >
                        <span className="material-symbols-outlined text-4xl">wb_sunny</span>
                        <span className={`font-bold ${scheduleForm.solar_event === 1 ? 'text-orange-400' : 'text-white'}`}>{t('wizard.schedule.sunrise')}</span>
                      </button>
                      <button
                        onClick={() => setScheduleForm({ ...scheduleForm, solar_event: 0 })}
                        className={`flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all ${scheduleForm.solar_event === 0
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-mobile-surface-dark border-mobile-border-dark'
                          }`}
                      >
                        <span className="material-symbols-outlined text-4xl">dark_mode</span>
                        <span className={`font-bold ${scheduleForm.solar_event === 0 ? 'text-purple-400' : 'text-white'}`}>{t('wizard.schedule.sunset')}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plant Edit Sheet - Native Mobile Style */}
        {editSheet === 'plant' && (() => {
          const categoryIcons: Record<string, string> = {
            'Agriculture': 'agriculture',
            'Gardening': 'local_florist',
            'Landscaping': 'park',
            'Indoor': 'potted_plant',
            // NOTE: Some Material Symbols names render as raw text if unsupported.
            // Use a safe icon to avoid showing the literal word "cactus".
            'Succulent': 'spa',
            'Fruit': 'nutrition',
            'Vegetable': 'grocery',
            'Herb': 'spa',
            'Lawn': 'grass',
            'Shrub': 'forest',
          };
          return (
            <div className="fixed inset-0 z-[100] flex flex-col bg-mobile-bg-dark">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <button
                  onClick={() => setEditSheet(null)}
                  disabled={saving}
                  className="text-mobile-text-muted hover:text-white transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.plantTitle')}</h3>
                <button
                  onClick={handleSavePlant}
                  disabled={saving || !selectedPlant}
                  className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1 disabled:opacity-50"
                >
                  {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* Camera Option */}
                <button
                  onClick={() => {
                    alert(t('mobileZoneDetails.cameraComingSoon'));
                  }}
                  className="w-full flex items-center gap-4 p-5 rounded-[2rem] border-2 border-transparent bg-mobile-surface-dark hover:border-mobile-border-dark transition-all"
                >
                  <div className="size-16 rounded-full flex items-center justify-center bg-white/5 text-mobile-text-muted">
                    <span className="material-symbols-outlined text-[32px]">photo_camera</span>
                  </div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-white">{t('mobileZoneDetails.cameraTitle')}</h3>
                    <p className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.cameraSubtitle')}</p>
                  </div>
                  <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-mobile-text-muted text-xs uppercase">{t('mobileZoneDetails.browseDatabase')}</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                {/* Search */}
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">search</span>
                  <input
                    type="text"
                    placeholder={t('mobileZoneDetails.searchPlantsPlaceholder')}
                    value={plantSearchTerm}
                    onChange={(e) => setPlantSearchTerm(e.target.value)}
                    className="w-full h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary text-lg"
                  />
                </div>

                {/* Category pills - horizontal scroll */}
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4">
                  <div className="flex gap-2 pb-2">
                    <button
                      onClick={() => setPlantCategory(null)}
                      className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${plantCategory === null
                        ? 'bg-mobile-primary text-mobile-bg-dark'
                        : 'bg-mobile-surface-dark text-mobile-text-muted hover:bg-white/10'
                        }`}
                    >
                      {t('mobileZoneDetails.allLabel')}
                    </button>
                    {PLANT_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setPlantCategory(cat)}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${plantCategory === cat
                          ? 'bg-mobile-primary text-mobile-bg-dark'
                          : 'bg-mobile-surface-dark text-mobile-text-muted hover:bg-white/10'
                          }`}
                      >
                        <span className="material-symbols-outlined text-base">{categoryIcons[cat] || 'eco'}</span>
                        {plantCategoryLabels[cat] || cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected plant display */}
                {selectedPlant && (
                  <div className="p-4 rounded-2xl bg-mobile-primary/10 border border-mobile-primary flex items-center gap-4">
                    <div className="size-12 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary">
                      <span className="material-symbols-outlined">eco</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-bold">{selectedPlant.common_name_en || selectedPlant.common_name_ro}</p>
                      <p className="text-mobile-text-muted text-sm italic">{selectedPlant.scientific_name}</p>
                    </div>
                    <button
                      onClick={() => setSelectedPlant(null)}
                      className="text-mobile-text-muted hover:text-white"
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                )}

                {/* Plant List */}
                <div className="space-y-2">
                  {plantDb
                    .filter(p => {
                      const matchesSearch = !plantSearchTerm ||
                        p.common_name_en?.toLowerCase().includes(plantSearchTerm.toLowerCase()) ||
                        p.common_name_ro?.toLowerCase().includes(plantSearchTerm.toLowerCase()) ||
                        p.scientific_name?.toLowerCase().includes(plantSearchTerm.toLowerCase());
                      const matchesCategory = !plantCategory || p.category === plantCategory;
                      return matchesSearch && matchesCategory;
                    })
                    .slice(0, 50)
                    .map(plant => (
                      <button
                        key={plant.id}
                        onClick={() => setSelectedPlant(plant)}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${selectedPlant?.id === plant.id
                          ? 'bg-mobile-primary/10 border-mobile-primary'
                          : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                          }`}
                      >
                        <div className={`size-10 rounded-full flex items-center justify-center ${selectedPlant?.id === plant.id
                          ? 'bg-mobile-primary/20 text-mobile-primary'
                          : 'bg-white/5 text-mobile-text-muted'
                          }`}>
                          <span className="material-symbols-outlined">{categoryIcons[plant.category] || 'eco'}</span>
                        </div>
                        <div className="flex-1 text-left">
                          <p className={`font-semibold ${selectedPlant?.id === plant.id ? 'text-white' : 'text-white'}`}>
                            {plant.common_name_en || plant.common_name_ro}
                          </p>
                          <p className="text-mobile-text-muted text-xs italic">{plant.scientific_name}</p>
                        </div>
                        <span className="text-mobile-text-muted text-xs bg-white/5 px-2 py-1 rounded">
                          {plantCategoryLabels[plant.category] || plant.category}
                        </span>
                        {selectedPlant?.id === plant.id && (
                          <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                        )}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Soil Edit Sheet - Native Mobile Style */}
        {editSheet === 'soil' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-mobile-bg-dark">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.soilTitle')}</h3>
              <button
                onClick={handleSaveSoil}
                disabled={saving || (!soilUseCustom && !selectedSoil)}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* GPS Option */}
              <button
                onClick={detectSoilFromGPS}
                disabled={detectingSoil}
                className="w-full flex items-center gap-4 p-5 rounded-[2rem] border-2 border-transparent bg-mobile-surface-dark hover:border-mobile-border-dark transition-all disabled:opacity-60"
              >
                <div className="size-16 rounded-full flex items-center justify-center bg-white/5 text-mobile-text-muted">
                  <span className="material-symbols-outlined text-[32px]">satellite_alt</span>
                </div>
                <div className="text-left flex-1">
                  <h3 className="text-lg font-bold text-white">{t('mobileZoneDetails.detectFromGpsTitle')}</h3>
                  <p className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.detectFromGpsSubtitle')}</p>
                </div>
                {detectingSoil ? (
                  <span className="material-symbols-outlined animate-spin text-mobile-text-muted">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
                )}
              </button>

              {soilDetectError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <span className="material-symbols-outlined text-red-400">warning</span>
                  <p className="text-red-200 text-sm leading-relaxed">{soilDetectError}</p>
                </div>
              )}

              {(soilUseCustom || existingCustomSoilName || pendingCustomSoil) && (
                <div className="p-4 rounded-2xl border border-mobile-primary/30 bg-mobile-primary/10">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-mobile-primary">satellite_alt</span>
                    <div className="flex-1">
                      <p className="text-white font-bold">{t('mobileZoneDetails.customSoilTitle')}</p>
                      <p className="text-mobile-text-muted text-sm">
                        {pendingCustomSoil
                          ? t('mobileZoneDetails.customSoilGps').replace('{name}', pendingCustomSoil.name)
                          : existingCustomSoilName
                            ? t('mobileZoneDetails.customSoilSaved').replace('{name}', existingCustomSoilName)
                            : t('mobileZoneDetails.customSoilEnabled')}
                      </p>
                      {pendingCustomSoil && (
                        <p className="text-mobile-text-muted text-xs mt-2">
                          {t('mobileZoneDetails.soilComposition')
                            .replace('{clay}', String(pendingCustomSoil.clay?.toFixed(0) ?? '?'))
                            .replace('{sand}', String(pendingCustomSoil.sand?.toFixed(0) ?? '?'))
                            .replace('{silt}', String(pendingCustomSoil.silt?.toFixed(0) ?? '?'))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSoilUseCustom(false);
                        setPendingCustomSoil(null);
                      }}
                      className="text-xs font-bold text-mobile-text-muted hover:text-white transition-colors"
                    >
                      {t('mobileZoneDetails.disableButton')}
                    </button>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-mobile-text-muted text-xs uppercase">{t('mobileZoneDetails.orSelectType')}</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Satellite soil indicator */}
              {growing?.soil_db_index && growing.soil_db_index >= 200 && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-mobile-primary/10 border border-mobile-primary/30">
                  <span className="material-symbols-outlined text-mobile-primary">satellite_alt</span>
                  <div className="flex-1">
                    <p className="text-white font-bold">{t('mobileZoneDetails.satelliteDetectedTitle')}</p>
                    <p className="text-mobile-text-muted text-sm">{t('mobileZoneDetails.satelliteDetectedSubtitle')}</p>
                  </div>
                </div>
              )}

              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">
                  search
                </span>
                <input
                  value={soilSearchTerm}
                  onChange={e => setSoilSearchTerm(e.target.value)}
                  placeholder={t('mobileZoneDetails.searchSoilPlaceholder')}
                  className="w-full bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl pl-12 pr-4 py-4 text-white placeholder-mobile-text-muted focus:outline-none focus:border-mobile-primary/50"
                />
              </div>

              <div className="space-y-2">
                {filteredSoils.slice(0, 120).map(soil => {
                  const isSelected = selectedSoil?.id === soil.id;
                  return (
                    <button
                      key={soil.id}
                      onClick={() => {
                        setSelectedSoil(soil);
                        setSoilUseCustom(false);
                        setPendingCustomSoil(null);
                      }}
                      className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${isSelected
                        ? 'bg-mobile-primary/10 border-mobile-primary'
                        : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                        }`}
                    >
                      <div
                        className={`size-12 rounded-full flex items-center justify-center ${isSelected
                          ? 'bg-mobile-primary/20 text-mobile-primary'
                          : 'bg-white/5 text-mobile-text-muted'
                          }`}
                      >
                        <span className="material-symbols-outlined">landscape</span>
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-bold">{soil.soil_type}</p>
                        <p className="text-mobile-text-muted text-sm">{soil.texture}</p>
                      </div>
                      {isSelected && (
                        <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Irrigation Edit Sheet - Native Mobile Style */}
        {editSheet === 'irrigation' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-mobile-bg-dark">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.irrigationTitle')}</h3>
              <button
                onClick={handleSaveIrrigation}
                disabled={saving || !selectedIrrigation}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-mobile-text-muted text-sm">
                {t('mobileZoneDetails.irrigationSubtitle')}
              </p>

              {/* All irrigation methods from database */}
              <div className="space-y-2">
                {irrigationMethodDb.map(method => {
                  const isSelected = selectedIrrigation?.id === method.id;
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
                      onClick={() => setSelectedIrrigation(method)}
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
                            <span className="text-mobile-text-muted text-xs">
                              {t('mobileZoneDetails.efficiencyLabel').replace('{value}', String(method.efficiency_pct))}
                            </span>
                          )}
                          {method.application_rate_mm_h && (
                            <span className="text-mobile-text-muted text-xs">
                              {t('mobileZoneDetails.applicationRateLabel').replace('{value}', String(method.application_rate_mm_h))}
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
          </div>
        )}

        {/* Coverage Edit Sheet */}
        {editSheet === 'coverage' && growingForm && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.coverageTitle')}</h3>
              <button
                onClick={handleSaveCoverage}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Coverage Type Selection */}
              <div>
                <label className="text-white font-bold mb-4 block">{t('mobileZoneDetails.coverageQuestion')}</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setGrowingForm({
                      ...growingForm,
                      use_area_based: true,
                      coverage: { area_m2: growingForm.coverage.area_m2 || 10 }
                    })}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${growingForm.use_area_based
                      ? 'bg-mobile-primary/20 border-mobile-primary ring-2 ring-mobile-primary/30'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                      }`}
                  >
                    <span className="material-symbols-outlined text-5xl">square_foot</span>
                    <span className={`font-bold text-lg ${growingForm.use_area_based ? 'text-mobile-primary' : 'text-white'}`}>
                      {t('mobileZoneDetails.coverageAreaLabel')}
                    </span>
                    <span className="text-mobile-text-muted text-sm">{t('mobileZoneDetails.coverageAreaDesc')}</span>
                  </button>
                  <button
                    onClick={() => setGrowingForm({
                      ...growingForm,
                      use_area_based: false,
                      coverage: { plant_count: growingForm.coverage.plant_count || 10 }
                    })}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border transition-all ${!growingForm.use_area_based
                      ? 'bg-mobile-primary/20 border-mobile-primary ring-2 ring-mobile-primary/30'
                      : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                      }`}
                  >
                    <span className="material-symbols-outlined text-5xl">potted_plant</span>
                    <span className={`font-bold text-lg ${!growingForm.use_area_based ? 'text-mobile-primary' : 'text-white'}`}>
                      {t('mobileZoneDetails.coveragePlantsLabel')}
                    </span>
                    <span className="text-mobile-text-muted text-sm">{t('mobileZoneDetails.coveragePlantsDesc')}</span>
                  </button>
                </div>
              </div>

              {/* Coverage Value */}
              <div>
                <label className="text-white font-bold mb-4 block">
                  {growingForm.use_area_based ? t('zoneDetails.totalArea') : t('zoneDetails.totalPlants')}
                </label>
                <div className="flex items-center gap-6 bg-mobile-surface-dark rounded-2xl p-6 border border-mobile-border-dark">
                  <button
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                      startCoverageHold(-1);
                    }}
                    onPointerUp={stopCoverageHold}
                    onPointerCancel={stopCoverageHold}
                    onPointerLeave={stopCoverageHold}
                    className="size-16 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-3xl">remove</span>
                  </button>
                  <div className="flex-1 text-center">
                    <input
                      inputMode="numeric"
                      type="number"
                      min={growingForm.use_area_based ? 0.5 : 1}
                      max={growingForm.use_area_based ? 1000 : 500}
                      value={coverageText}
                      onChange={(e) => {
                        const nextText = e.target.value;
                        setCoverageText(nextText);
                        const parsed = Number(nextText);
                        if (Number.isFinite(parsed)) {
                          if (growingForm.use_area_based) {
                            const clamped = Math.max(0.5, Math.min(1000, parsed));
                            setGrowingForm({ ...growingForm, coverage: { area_m2: clamped } });
                          } else {
                            const clamped = Math.max(1, Math.min(500, Math.round(parsed)));
                            setGrowingForm({ ...growingForm, coverage: { plant_count: clamped } });
                          }
                        }
                      }}
                      className="w-full bg-transparent text-center text-6xl font-bold text-white focus:outline-none"
                    />
                    <p className="text-mobile-text-muted text-lg mt-1">
                      {growingForm.use_area_based ? t('mobileZoneDetails.units.squareMeters') : t('mobileZoneDetails.units.plants')}
                    </p>
                  </div>
                  <button
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture?.(e.pointerId);
                      startCoverageHold(1);
                    }}
                    onPointerUp={stopCoverageHold}
                    onPointerCancel={stopCoverageHold}
                    onPointerLeave={stopCoverageHold}
                    className="size-16 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-3xl">add</span>
                  </button>
                </div>
              </div>

              {/* Quick presets */}
              <div>
                <label className="text-mobile-text-muted text-sm mb-3 block">{t('mobileZoneDetails.quickPresets')}</label>
                <div className="flex flex-wrap gap-2">
                  {growingForm.use_area_based
                    ? [5, 10, 25, 50, 100].map(val => (
                      <button
                        key={val}
                        onClick={() => {
                          stopCoverageHold();
                          setCoverageText(String(val));
                          setGrowingForm({ ...growingForm, coverage: { area_m2: val } });
                        }}
                        className={`px-4 py-2 rounded-full transition-colors ${growingForm.coverage.area_m2 === val
                          ? 'bg-mobile-primary text-black font-bold'
                          : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                      >
                        {val} {t('mobileZoneDetails.units.squareMeters')}
                      </button>
                    ))
                    : [5, 10, 20, 50, 100].map(val => (
                      <button
                        key={val}
                        onClick={() => {
                          stopCoverageHold();
                          setCoverageText(String(val));
                          setGrowingForm({ ...growingForm, coverage: { plant_count: val } });
                        }}
                        className={`px-4 py-2 rounded-full transition-colors ${growingForm.coverage.plant_count === val
                          ? 'bg-mobile-primary text-black font-bold'
                          : 'bg-white/10 text-white hover:bg-white/20'
                          }`}
                      >
                        {val} {t('mobileZoneDetails.units.plants')}
                      </button>
                    ))
                  }
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sun Exposure Edit Sheet - 3 levels */}
        {editSheet === 'sun' && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.sunExposureTitle')}</h3>
              <button
                onClick={handleSaveSun}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="text-mobile-text-muted text-sm mb-4">
                {t('mobileZoneDetails.sunExposureQuestion')}
              </p>

              {/* Shade */}
              <button
                onClick={() => setSunLevel('shade')}
                className={`w-full p-6 rounded-2xl border text-left transition-all ${sunLevel === 'shade'
                  ? 'bg-slate-500/20 border-slate-400 ring-2 ring-slate-400/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-5xl">cloud</span>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('zoneDetails.shade')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.sunShadeDesc')}
                    </p>
                  </div>
                  {sunLevel === 'shade' && (
                    <span className="material-symbols-outlined text-slate-400 text-2xl">check_circle</span>
                  )}
                </div>
              </button>

              {/* Partial Sun */}
              <button
                onClick={() => setSunLevel('partial')}
                className={`w-full p-6 rounded-2xl border text-left transition-all ${sunLevel === 'partial'
                  ? 'bg-orange-500/20 border-orange-400 ring-2 ring-orange-400/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-5xl">partly_cloudy_day</span>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('zoneDetails.partialSun')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.sunPartialDesc')}
                    </p>
                  </div>
                  {sunLevel === 'partial' && (
                    <span className="material-symbols-outlined text-orange-400 text-2xl">check_circle</span>
                  )}
                </div>
              </button>

              {/* Full Sun */}
              <button
                onClick={() => setSunLevel('full')}
                className={`w-full p-6 rounded-2xl border text-left transition-all ${sunLevel === 'full'
                  ? 'bg-yellow-500/20 border-yellow-400 ring-2 ring-yellow-400/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-5xl">wb_sunny</span>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('zoneDetails.fullSun')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileZoneDetails.sunFullDesc')}
                    </p>
                  </div>
                  {sunLevel === 'full' && (
                    <span className="material-symbols-outlined text-yellow-400 text-2xl">check_circle</span>
                  )}
                </div>
              </button>

              {/* Info note */}
              <div className="bg-white/5 rounded-xl p-4 mt-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-400">info</span>
                  <p className="text-mobile-text-muted text-sm">
                    {t('mobileZoneDetails.sunInfoNote')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rain Compensation Edit Sheet */}
        {editSheet === 'rain-compensation' && rainCompForm && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.rainAdjustmentTitle')}</h3>
              <button
                onClick={handleSaveRainComp}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Big visual toggle */}
              <button
                onClick={() => setRainCompForm({ ...rainCompForm, enabled: !rainCompForm.enabled })}
                className={`w-full p-6 rounded-2xl border-2 transition-all ${rainCompForm.enabled
                  ? 'bg-blue-500/20 border-blue-400'
                  : 'bg-mobile-surface-dark border-mobile-border-dark'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-16 rounded-full flex items-center justify-center ${rainCompForm.enabled ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                    <span className="material-symbols-outlined text-3xl">water_drop</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold text-lg">
                      {rainCompForm.enabled ? t('mobileZoneDetails.rainAdjustmentOn') : t('mobileZoneDetails.rainAdjustmentOff')}
                    </p>
                    <p className="text-mobile-text-muted text-sm">
                      {rainCompForm.enabled ? t('mobileZoneDetails.rainAdjustmentOnDesc') : t('mobileZoneDetails.rainAdjustmentOffDesc')}
                    </p>
                  </div>
                  {rainCompForm.enabled && (
                    <span className="material-symbols-outlined text-blue-400 text-3xl">check_circle</span>
                  )}
                </div>
              </button>

              {rainCompForm.enabled && (
                <div className="space-y-4">
                  <p className="text-white font-bold text-center">{t('mobileZoneDetails.rainAdjustmentQuestion')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { sensitivity: 0.3, reduction: 0.3, skip: 15, hours: 24, label: t('mobileZoneDetails.rainPresets.lightLabel'), desc: t('mobileZoneDetails.rainPresets.lightDesc'), icon: 'water_drop' },
                      { sensitivity: 0.5, reduction: 0.5, skip: 10, hours: 24, label: t('mobileZoneDetails.rainPresets.normalLabel'), desc: t('mobileZoneDetails.rainPresets.normalDesc'), icon: 'water_drop' },
                      { sensitivity: 0.8, reduction: 0.8, skip: 5, hours: 48, label: t('mobileZoneDetails.rainPresets.strongLabel'), desc: t('mobileZoneDetails.rainPresets.strongDesc'), icon: 'water_drop' },
                    ].map(preset => {
                      const isSelected = Math.abs(rainCompForm.sensitivity - preset.sensitivity) < 0.1;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => setRainCompForm({
                            ...rainCompForm,
                            sensitivity: preset.sensitivity,
                            reduction_factor: preset.reduction,
                            skip_threshold_mm: preset.skip,
                            lookback_hours: preset.hours,
                          })}
                          className={`p-4 rounded-2xl border-2 transition-all ${isSelected
                            ? 'bg-blue-500/20 border-blue-400'
                            : 'bg-mobile-surface-dark border-mobile-border-dark'
                            }`}
                        >
                          <span className="material-symbols-outlined text-2xl mb-2">{preset.icon}</span>
                          <p className={`font-bold ${isSelected ? 'text-blue-400' : 'text-white'}`}>{preset.label}</p>
                          <p className="text-mobile-text-muted text-xs mt-1">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simple info */}
              <div className="bg-blue-500/10 rounded-xl p-4">
                <p className="text-blue-200 text-sm text-center">
                  {t('mobileZoneDetails.rainAdjustmentInfo')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Temperature Compensation Edit Sheet */}
        {editSheet === 'temp-compensation' && tempCompForm && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.tempAdjustmentTitle')}</h3>
              <button
                onClick={handleSaveTempComp}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Big visual toggle */}
              <button
                onClick={() => setTempCompForm({ ...tempCompForm, enabled: !tempCompForm.enabled })}
                className={`w-full p-6 rounded-2xl border-2 transition-all ${tempCompForm.enabled
                  ? 'bg-orange-500/20 border-orange-400'
                  : 'bg-mobile-surface-dark border-mobile-border-dark'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-16 rounded-full flex items-center justify-center ${tempCompForm.enabled ? 'bg-orange-500 text-white' : 'bg-white/10 text-gray-400'
                    }`}>
                    <span className="material-symbols-outlined text-3xl">thermostat</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-bold text-lg">
                      {tempCompForm.enabled ? t('mobileZoneDetails.tempAdjustmentOn') : t('mobileZoneDetails.tempAdjustmentOff')}
                    </p>
                    <p className="text-mobile-text-muted text-sm">
                      {tempCompForm.enabled ? t('mobileZoneDetails.tempAdjustmentOnDesc') : t('mobileZoneDetails.tempAdjustmentOffDesc')}
                    </p>
                  </div>
                  {tempCompForm.enabled && (
                    <span className="material-symbols-outlined text-orange-400 text-3xl">check_circle</span>
                  )}
                </div>
              </button>

              {tempCompForm.enabled && (
                <div className="space-y-4">
                  <p className="text-white font-bold text-center">{t('mobileZoneDetails.tempAdjustmentQuestion')}</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { sensitivity: 0.5, base: 25, min: 0.8, max: 1.3, label: t('mobileZoneDetails.tempPresets.lightLabel'), desc: t('mobileZoneDetails.tempPresets.lightDesc'), icon: 'thermostat' },
                      { sensitivity: 1.0, base: 25, min: 0.7, max: 1.5, label: t('mobileZoneDetails.tempPresets.normalLabel'), desc: t('mobileZoneDetails.tempPresets.normalDesc'), icon: 'thermostat' },
                      { sensitivity: 1.5, base: 25, min: 0.5, max: 2.0, label: t('mobileZoneDetails.tempPresets.strongLabel'), desc: t('mobileZoneDetails.tempPresets.strongDesc'), icon: 'thermostat' },
                    ].map(preset => {
                      const isSelected = Math.abs(tempCompForm.sensitivity - preset.sensitivity) < 0.2;
                      return (
                        <button
                          key={preset.label}
                          onClick={() => setTempCompForm({
                            ...tempCompForm,
                            sensitivity: preset.sensitivity,
                            base_temperature: preset.base,
                            min_factor: preset.min,
                            max_factor: preset.max,
                          })}
                          className={`p-4 rounded-2xl border-2 transition-all ${isSelected
                            ? 'bg-orange-500/20 border-orange-400'
                            : 'bg-mobile-surface-dark border-mobile-border-dark'
                            }`}
                        >
                          <span className="material-symbols-outlined text-2xl mb-2">{preset.icon}</span>
                          <p className={`font-bold ${isSelected ? 'text-orange-400' : 'text-white'}`}>{preset.label}</p>
                          <p className="text-mobile-text-muted text-xs mt-1">{preset.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Simple info */}
              <div className="bg-orange-500/10 rounded-xl p-4">
                <p className="text-orange-200 text-sm text-center">
                  {t('mobileZoneDetails.tempAdjustmentInfo')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Water Management Edit Sheet (Cycle & Soak + Max Volume) */}
        {editSheet === 'water-management' && waterManagementForm && (
          <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button
                onClick={() => setEditSheet(null)}
                disabled={saving}
                className="text-mobile-text-muted hover:text-white transition-colors"
              >
                {t('common.cancel')}
              </button>
              <h3 className="text-white font-bold text-lg">{t('mobileZoneDetails.waterManagement')}</h3>
              <button
                onClick={handleSaveWaterManagement}
                disabled={saving}
                className="text-mobile-primary font-bold hover:text-green-400 transition-colors flex items-center gap-1"
              >
                {saving ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : t('common.save')}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Cycle & Soak Toggle */}
              <button
                onClick={() => setWaterManagementForm({ ...waterManagementForm, enableCycleSoak: !waterManagementForm.enableCycleSoak })}
                className={`w-full p-6 rounded-2xl border-2 text-left transition-all ${waterManagementForm.enableCycleSoak
                  ? 'bg-cyan-500/20 border-cyan-400 ring-2 ring-cyan-400/30'
                  : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-white/30'
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${waterManagementForm.enableCycleSoak ? 'bg-cyan-500/30' : 'bg-white/10'
                    }`}>
                    <span className="material-symbols-outlined text-3xl text-cyan-400">waves</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-bold text-lg">{t('cycleSoak.title')}</h4>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {waterManagementForm.enableCycleSoak
                        ? t('mobileZoneDetails.cycleSoakEnabledDesc')
                        : t('mobileZoneDetails.cycleSoakDisabledDesc')}
                    </p>
                  </div>
                  <div className={`size-8 rounded-full flex items-center justify-center ${waterManagementForm.enableCycleSoak ? 'bg-cyan-500 text-white' : 'bg-white/10 text-mobile-text-muted'
                    }`}>
                    <span className="material-symbols-outlined text-xl">
                      {waterManagementForm.enableCycleSoak ? 'check' : 'close'}
                    </span>
                  </div>
                </div>
              </button>

              {/* Cycle & Soak Duration Settings - shown when enabled */}
              {waterManagementForm.enableCycleSoak && (
                <div className="space-y-4">
                  {/* Info */}
                  <div className="bg-cyan-500/10 rounded-xl p-4">
                    <p className="text-cyan-200 text-sm text-center">
                      {t('mobileZoneDetails.cycleSoakInfo')}
                    </p>
                  </div>

                  {/* Cycle Duration (Watering) */}
                  <div>
                    <label className="text-white font-bold mb-3 block">{t('mobileZoneDetails.cycleDurationLabel')}</label>
                    <div className="flex items-center gap-4 bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                      <button
                        onClick={() => setWaterManagementForm({ ...waterManagementForm, cycleMinutes: Math.max(2, waterManagementForm.cycleMinutes - 1) })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-xl">remove</span>
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-4xl font-bold text-white">{waterManagementForm.cycleMinutes}</span>
                        <span className="text-mobile-text-muted ml-2 text-lg">{t('common.minutesShort')}</span>
                      </div>
                      <button
                        onClick={() => setWaterManagementForm({ ...waterManagementForm, cycleMinutes: Math.min(15, waterManagementForm.cycleMinutes + 1) })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                    </div>
                    <p className="text-mobile-text-muted text-xs text-center mt-1">{t('mobileZoneDetails.cycleDurationHint')}</p>
                  </div>

                  {/* Soak Duration (Pause) */}
                  <div>
                    <label className="text-white font-bold mb-3 block">{t('mobileZoneDetails.soakDurationLabel')}</label>
                    <div className="flex items-center gap-4 bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                      <button
                        onClick={() => setWaterManagementForm({ ...waterManagementForm, soakMinutes: Math.max(5, waterManagementForm.soakMinutes - 5) })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-xl">remove</span>
                      </button>
                      <div className="flex-1 text-center">
                        <span className="text-4xl font-bold text-white">{waterManagementForm.soakMinutes}</span>
                        <span className="text-mobile-text-muted ml-2 text-lg">{t('common.minutesShort')}</span>
                      </div>
                      <button
                        onClick={() => setWaterManagementForm({ ...waterManagementForm, soakMinutes: Math.min(30, waterManagementForm.soakMinutes + 5) })}
                        className="size-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-xl">add</span>
                      </button>
                    </div>
                    <p className="text-mobile-text-muted text-xs text-center mt-1">{t('mobileZoneDetails.soakDurationHint')}</p>
                  </div>
                </div>
              )}

              {/* Max Volume Limit */}
              <div>
                <label className="text-white font-bold mb-4 block">{t('mobileZoneDetails.maxVolumePerWatering')}</label>
                <div className="flex items-center gap-4 bg-mobile-surface-dark rounded-2xl p-6 border border-mobile-border-dark">
                  <button
                    onClick={() => setWaterManagementForm({ ...waterManagementForm, maxVolumeLimitL: Math.max(10, waterManagementForm.maxVolumeLimitL - 10) })}
                    className="size-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-2xl">remove</span>
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-5xl font-bold text-white">{waterManagementForm.maxVolumeLimitL}</span>
                    <span className="text-mobile-text-muted ml-2 text-lg">{t('common.litersShort')}</span>
                  </div>
                  <button
                    onClick={() => setWaterManagementForm({ ...waterManagementForm, maxVolumeLimitL: Math.min(500, waterManagementForm.maxVolumeLimitL + 10) })}
                    className="size-14 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-2xl">add</span>
                  </button>
                </div>
                <p className="text-mobile-text-muted text-sm text-center mt-2">
                  {t('mobileZoneDetails.maxVolumeHint')}
                </p>
              </div>

              {/* Quick Presets */}
              <div>
                <label className="text-mobile-text-muted text-sm mb-3 block">{t('mobileZoneDetails.quickPresets')}</label>
                <div className="flex flex-wrap gap-2">
                  {[25, 50, 75, 100, 150].map(val => (
                    <button
                      key={val}
                      onClick={() => setWaterManagementForm({ ...waterManagementForm, maxVolumeLimitL: val })}
                      className={`px-4 py-2 rounded-full transition-colors ${waterManagementForm.maxVolumeLimitL === val
                        ? 'bg-purple-500 text-white font-bold'
                        : 'bg-mobile-surface-dark text-mobile-text-muted hover:bg-white/10'
                        }`}
                    >
                      {val}{t('common.litersShort')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Tab */}
        {activeTab === 'schedule' && (
          <div className="flex flex-col gap-4">
            {/* Watering Mode Card - Tappable */}
            <button
              onClick={openWateringModeEdit}
              className="bg-mobile-surface-dark rounded-2xl p-5 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-mobile-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-mobile-primary text-2xl">
                      {currentWateringMode.startsWith('fao56') ? 'eco' : currentWateringMode === 'volume' ? 'water_drop' : 'timer'}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{t('mobileZoneDetails.wateringModeTitle')}</p>
                    <p className="text-mobile-primary font-bold">
                      {currentWateringMode === 'fao56_auto' ? t('mobileZoneDetails.modeLabels.fao56Auto') :
                        currentWateringMode === 'fao56_eco' ? t('mobileZoneDetails.modeLabels.fao56Eco') :
                          currentWateringMode === 'duration' ? t('zoneDetails.fixedDuration') : t('zoneDetails.fixedVolume')}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
              <p className="text-mobile-text-muted text-sm">
                {currentWateringMode.startsWith('fao56')
                  ? t('mobileZoneDetails.wateringModeSmartDesc')
                  : t('mobileZoneDetails.wateringModeManualDesc')}
              </p>
            </button>

            {/* Schedule Settings - Only show if not full FAO-56 auto */}
            <button
              onClick={openScheduleEdit}
              className="bg-mobile-surface-dark rounded-2xl p-5 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-2xl">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-white font-bold">{t('zoneDetails.schedule')}</p>
                    <p className="text-blue-400 font-bold">
                      {isFao56 ? t('mobileZoneDetails.scheduleAutomatic') : scheduleTypeLabel}
                      {t('mobileZoneDetails.inlineSeparator')}
                      {schedule?.auto_enabled ? t('labels.active') : t('labels.inactive')}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
              {!isFao56 && (
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-white/10 px-2 py-1 rounded-full text-white">{scheduleDaysLabel || t('zoneDetails.everyDay')}</span>
                  <span className="bg-white/10 px-2 py-1 rounded-full text-white">{scheduleTimeLabel}</span>
                  {schedule?.use_solar_timing && (
                    <span className="bg-orange-500/20 px-2 py-1 rounded-full text-orange-400">
                      {schedule.solar_event === 1 ? t('wizard.schedule.sunrise') : t('wizard.schedule.sunset')}
                    </span>
                  )}
                </div>
              )}
              {isFao56 && (
                <p className="text-mobile-text-muted text-sm">
                  {t('mobileZoneDetails.scheduleAutoNote')}
                </p>
              )}
            </button>

            {/* Growing Environment Section Header */}
            <h3 className="text-mobile-text-muted text-xs font-bold uppercase tracking-wider mt-4 px-1">
              {t('mobileZoneDetails.growingEnvironmentTitle')}
            </h3>

            {/* Plant */}
            <button
              onClick={openPlantEdit}
              className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">potted_plant</span>
                  <div>
                    <p className="text-mobile-text-muted text-xs">{t('zones.plant')}</p>
                    <p className="text-white font-bold">{plantName}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
            </button>

            {/* Soil */}
            <button
              onClick={openSoilEdit}
              className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">landscape</span>
                  <div>
                    <p className="text-mobile-text-muted text-xs">{t('zones.soilType')}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold">{soilName}</p>
                      {isCustomSoil && (
                        <span className="inline-flex items-center gap-1 bg-mobile-primary/20 text-mobile-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          <span className="material-symbols-outlined text-xs">satellite_alt</span>
                          GPS
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
            </button>

            {/* Irrigation Method */}
            <button
              onClick={openIrrigationEdit}
              className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">water_drop</span>
                  <div>
                    <p className="text-mobile-text-muted text-xs">{t('zones.irrigationMethod')}</p>
                    <p className="text-white font-bold">{irrigationMethodName}</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
            </button>

            {/* Coverage */}
            <button
              onClick={openCoverageEdit}
              className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">square_foot</span>
                  <div>
                    <p className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.coverageTitle')}</p>
                    <p className="text-white font-bold">
                      {growing?.use_area_based
                        ? `${growing.coverage.area_m2?.toFixed(1) ?? '--'} ${t('mobileZoneDetails.units.squareMeters')}`
                        : `${growing?.coverage.plant_count ?? '--'} ${t('mobileZoneDetails.units.plants')}`}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
            </button>

            {/* Sun Exposure - 3 levels */}
            <button
              onClick={openSunEdit}
              className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-left w-full hover:border-mobile-primary/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl">
                    {currentSunLevel === 'shade' ? 'cloud' : currentSunLevel === 'partial' ? 'partly_cloudy_day' : 'wb_sunny'}
                  </span>
                  <div>
                    <p className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.sunExposureTitle')}</p>
                    <p className="text-white font-bold">
                      {currentSunLevel === 'shade' ? t('zoneDetails.shade') : currentSunLevel === 'partial' ? t('zoneDetails.partialSun') : t('zoneDetails.fullSun')}
                    </p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
              </div>
            </button>

            {/* Next Watering Preview */}
            {/* Next Watering Preview - show calculated volume only for FAO-56 */}
            <div className="bg-gradient-to-br from-mobile-primary/10 to-mobile-primary/5 rounded-2xl p-5 border border-mobile-primary/30 mt-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-mobile-primary">schedule</span>
                <span className="text-white font-bold">{t('zoneDetails.nextWatering')}</span>
              </div>
              <div className="text-center py-2">
                <p className="text-4xl font-bold text-white">{nextWateringDisplay.time}</p>
                <p className="text-mobile-text-muted">{nextWateringDisplay.date}</p>
                {isFao56 && autoCalc?.calculated_volume_l && (
                  <p className="text-mobile-primary text-sm mt-2">
                    {t('mobileZoneDetails.estimatedVolume')
                      .replace('{value}', autoCalc.calculated_volume_l.toFixed(1))
                      .replace('{unit}', t('common.litersShort'))}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Compensation Tab */}
        {activeTab === 'compensation' && (
          <div className="flex flex-col gap-6">
            {/* FAO-56 mode - smart adjustments explained simply */}
            {isFao56 ? (
              <div className="flex flex-col gap-4">
                {/* Smart Mode Banner */}
                <div className="bg-gradient-to-br from-mobile-primary/20 to-mobile-primary/5 rounded-2xl p-5 border border-mobile-primary/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="size-12 rounded-full bg-mobile-primary/30 flex items-center justify-center">
                      <span className="material-symbols-outlined text-mobile-primary text-2xl">auto_awesome</span>
                    </div>
                    <div>
                      <p className="text-white font-bold">{t('mobileZoneDetails.smartWateringActive')}</p>
                      <p className="text-mobile-primary text-sm">{t('mobileZoneDetails.adjustmentsAutomatic')}</p>
                    </div>
                  </div>
                  <p className="text-mobile-text-muted text-sm leading-relaxed">
                    {t('mobileZoneDetails.smartModeDescription')}
                  </p>
                </div>

                {/* Simple Weather Stats */}
                <h3 className="text-mobile-text-muted text-xs font-bold uppercase tracking-wider px-1">
                  {t('mobileZoneDetails.currentWeatherImpact')}
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  {/* Water Loss (ET0) */}
                  <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-orange-400">wb_sunny</span>
                      <span className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.waterLossLabel')}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {autoCalc?.et0_mm_day?.toFixed(1) ?? '--'}
                      <span className="text-sm text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mmPerDay')}</span>
                    </p>
                    <p className="text-xs text-mobile-text-muted mt-1">
                      {(autoCalc?.et0_mm_day ?? 0) > 5 ? t('zoneDetails.highEvaporation') :
                        (autoCalc?.et0_mm_day ?? 0) > 3 ? t('zoneDetails.normalEvaporation') : t('zoneDetails.lowEvaporation')}
                    </p>
                  </div>

                  {/* Plant Needs */}
                  <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-green-400">eco</span>
                      <span className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.plantNeedsLabel')}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {autoCalc?.etc_mm_day?.toFixed(1) ?? '--'}
                      <span className="text-sm text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mmPerDay')}</span>
                    </p>
                    <p className="text-xs text-mobile-text-muted mt-1">
                      {t('mobileZoneDetails.plantNeedsNote')}
                    </p>
                  </div>

                  {/* Rain Benefit */}
                  <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-blue-400">water_drop</span>
                      <span className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.rainBenefit')}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {autoCalc?.effective_rain_mm?.toFixed(1) ?? '0'}
                      <span className="text-sm text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                    </p>
                    <p className="text-xs text-mobile-text-muted mt-1">
                      {(autoCalc?.effective_rain_mm ?? 0) > 0
                        ? t('mobileZoneDetails.rainBenefitPositive')
                        : t('mobileZoneDetails.rainBenefitNone')}
                    </p>
                  </div>

                  {/* Current Deficit */}
                  <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-red-400">trending_down</span>
                      <span className="text-mobile-text-muted text-xs">{t('mobileZoneDetails.waterDeficit')}</span>
                    </div>
                    <p className="text-2xl font-bold text-white">
                      {autoCalc?.current_deficit_mm?.toFixed(1) ?? '0'}
                      <span className="text-sm text-mobile-text-muted ml-1">{t('mobileZoneDetails.units.mm')}</span>
                    </p>
                    <p className="text-xs text-mobile-text-muted mt-1">
                      {autoCalc?.irrigation_needed ? t('zoneDetails.irrigationNeeded') : t('zoneDetails.soilHasEnough')}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-mobile-card-dark rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-mobile-primary text-2xl">info</span>
                    <p className="text-white text-sm">
                      {autoCalc?.irrigation_needed
                        ? t('mobileZoneDetails.summaryNeeds')
                          .replace('{volume}', String(autoCalc?.calculated_volume_l?.toFixed(0) ?? '--'))
                          .replace('{unit}', t('common.litersShort'))
                        : t('mobileZoneDetails.summaryEnough')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Today's Compensation Card */}
                <div className="flex flex-col gap-4 rounded-2xl bg-mobile-card-dark p-6 border border-white/5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-mobile-text-muted text-sm font-medium mb-1">{t('mobileZoneDetails.todaysAdjustment')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tight text-white">{totalCompensationFactor}{t('common.percent')}</span>
                        {compensationDelta !== 0 && (
                          <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${compensationDelta > 0
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-blue-500/20 text-blue-400'
                            }`}>
                            {compensationDelta > 0 ? '+' : ''}{compensationDelta}{t('common.percent')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`size-12 rounded-full flex items-center justify-center ${compensation?.any_compensation_active
                      ? 'bg-mobile-primary/20 text-mobile-primary'
                      : 'bg-white/10 text-gray-500'
                      }`}>
                      <span className="material-symbols-outlined">tune</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-black/40 rounded-full overflow-hidden relative">
                      <div className="absolute left-[66%] top-0 bottom-0 w-0.5 bg-gray-400 z-10" />
                      <div
                        className={`h-full rounded-full transition-all ${totalCompensationFactor > 100 ? 'bg-orange-500' : totalCompensationFactor < 100 ? 'bg-blue-500' : 'bg-mobile-primary'
                          }`}
                        style={{ width: `${Math.min(100, (totalCompensationFactor / 150) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-mobile-text-muted font-medium">
                      <span>{t('mobileZoneDetails.lessWater')}</span>
                      <span>{t('mobileZoneDetails.normalWater')}</span>
                      <span>{t('mobileZoneDetails.moreWater')}</span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm leading-relaxed">
                    {!compensation?.any_compensation_active
                      ? t('mobileZoneDetails.noWeatherAdjustments')
                      : compensationDelta > 0
                        ? t('mobileZoneDetails.hotWeatherNote')
                        : t('mobileZoneDetails.rainWeatherNote')
                    }
                  </p>
                </div>

                {/* Compensation Rules */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted pl-2">
                    {t('mobileZoneDetails.weatherAdjustments')}
                  </h3>

                  {/* Rain Compensation */}
                  <div className={`flex items-center justify-between gap-4 rounded-2xl p-5 border border-white/5 relative overflow-hidden ${compConfig?.rain.enabled ? 'bg-mobile-card-dark' : 'bg-mobile-surface-dark/50 opacity-70'
                    }`}>
                    {compConfig?.rain.enabled && compensation?.rain.active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${compConfig?.rain.enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-500'
                        }`}>
                        <span className="material-symbols-outlined">water_drop</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`text-base font-bold ${compConfig?.rain.enabled ? 'text-white' : 'text-mobile-text-muted'}`}>
                            {t('mobileZoneDetails.rainAdjustmentTitle')}
                          </h4>
                          {compConfig?.rain.enabled && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${compensation?.rain.active
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-green-500/20 text-green-400'
                              }`}>
                              {compensation?.rain.active ? t('labels.active') : t('mobileZoneDetails.enabledLabel')}
                            </span>
                          )}
                        </div>
                        {compConfig?.rain.enabled ? (
                          compensation?.rain.active ? (
                            <>
                              <p className="text-xs text-mobile-text-muted font-medium">
                                {t('mobileZoneDetails.recentRain')
                                  .replace('{value}', compensation.rain.recent_rainfall_mm.toFixed(1))
                                  .replace('{unit}', t('mobileZoneDetails.units.mm'))}
                              </p>
                              <p className="text-xs text-blue-400 font-bold mt-1">
                                {compensation.rain.skip_watering
                                  ? t('mobileZoneDetails.skipNextWatering')
                                  : t('mobileZoneDetails.usingLessWater')
                                    .replace('{percent}', compensation.rain.reduction_percentage.toFixed(0))
                                }
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-mobile-text-muted font-medium">{t('mobileZoneDetails.waitingForRain')}</p>
                          )
                        ) : (
                          <p className="text-xs text-mobile-text-muted font-medium">{t('mobileZoneDetails.tapSettingsToEnable')}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-mobile-text-muted hover:text-mobile-primary transition-colors"
                      onClick={openRainCompEdit}
                    >
                      <span className="material-symbols-outlined">settings</span>
                    </button>
                  </div>

                  {/* Temperature Compensation */}
                  <div className={`flex items-center justify-between gap-4 rounded-2xl p-5 border border-white/5 relative overflow-hidden ${compConfig?.temp.enabled ? 'bg-mobile-card-dark' : 'bg-mobile-surface-dark/50 opacity-70'
                    }`}>
                    {compConfig?.temp.enabled && compensation?.temperature.active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500" />}
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`size-12 rounded-full flex items-center justify-center shrink-0 ${compConfig?.temp.enabled ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-gray-500'
                        }`}>
                        <span className="material-symbols-outlined">thermostat</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h4 className={`text-base font-bold ${compConfig?.temp.enabled ? 'text-white' : 'text-mobile-text-muted'}`}>
                            {t('mobileZoneDetails.tempAdjustmentTitle')}
                          </h4>
                          {compConfig?.temp.enabled && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${compensation?.temperature.active
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-green-500/20 text-green-400'
                              }`}>
                              {compensation?.temperature.active ? t('labels.active') : t('mobileZoneDetails.enabledLabel')}
                            </span>
                          )}
                        </div>
                        {compConfig?.temp.enabled ? (
                          compensation?.temperature.active ? (
                            <>
                              <p className="text-xs text-mobile-text-muted font-medium">
                                {t('mobileZoneDetails.currentTemp')
                                  .replace('{value}', compensation.temperature.current_temperature.toFixed(1))
                                  .replace('{unit}', t('common.degreesC'))}
                              </p>
                              <p className="text-xs text-orange-400 font-bold mt-1">
                                {t('mobileZoneDetails.tempFactor')
                                  .replace('{value}', (compensation.temperature.factor * 100).toFixed(0))}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-mobile-text-muted font-medium">
                              {t('mobileZoneDetails.baseTemp')
                                .replace('{value}', compConfig.temp.base_temperature.toFixed(0))
                                .replace('{unit}', t('common.degreesC'))}
                            </p>
                          )
                        ) : (
                          <p className="text-xs text-mobile-text-muted font-medium">{t('mobileZoneDetails.tapSettingsToEnable')}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className="text-mobile-text-muted hover:text-mobile-primary transition-colors"
                      onClick={openTempCompEdit}
                    >
                      <span className="material-symbols-outlined">settings</span>
                    </button>
                  </div>

                  {/* Summary info when no compensation configured */}
                  {!compConfig?.rain.enabled && !compConfig?.temp.enabled && (
                    <div className="text-center py-4 text-mobile-text-muted text-sm">
                      <p>{t('mobileZoneDetails.noCompensationConfigured')}</p>
                      <p className="mt-1">{t('mobileZoneDetails.enableCompensationHint')}</p>
                    </div>
                  )}
                </div>

                <button className="w-full bg-mobile-primary hover:bg-green-400 text-black font-bold py-4 rounded-xl shadow-lg shadow-mobile-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">tune</span>
                  {t('mobileZoneDetails.configureCompensation')}
                </button>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="flex flex-col gap-4">
            {/* Summary Stats from Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col rounded-2xl bg-mobile-card-dark p-5 border border-white/5">
                <span className="text-mobile-text-muted text-xs font-bold uppercase mb-2">{t('labels.totalVolume')}</span>
                <span className="text-2xl font-bold text-white">
                  {zoneStats ? (zoneStats.total_volume / 1000).toFixed(1) : '--'}{t('common.litersShort')}
                </span>
                <span className="text-xs text-mobile-text-muted">{t('mobileZoneDetails.allTime')}</span>
              </div>
              <div className="flex flex-col rounded-2xl bg-mobile-card-dark p-5 border border-white/5">
                <span className="text-mobile-text-muted text-xs font-bold uppercase mb-2">{t('labels.sessions')}</span>
                <span className="text-2xl font-bold text-white">{zoneStats?.count ?? '--'}</span>
                <span className="text-xs text-mobile-text-muted">{t('mobileZoneDetails.totalRuns')}</span>
              </div>
            </div>

            {/* Additional Stats - computed from available data */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col rounded-xl bg-mobile-surface-dark p-4 border border-white/5 text-center">
                <span className="text-mobile-primary text-lg font-bold">
                  {zoneStats && zoneStats.count > 0
                    ? ((zoneStats.total_volume / zoneStats.count) / 1000).toFixed(1)
                    : '--'}
                </span>
                <span className="text-xs text-mobile-text-muted">{t('mobileZoneDetails.avgLiters')}</span>
              </div>
              <div className="flex flex-col rounded-xl bg-mobile-surface-dark p-4 border border-white/5 text-center">
                <span className="text-mobile-primary text-lg font-bold">
                  {zoneStats?.last_volume
                    ? (zoneStats.last_volume / 1000).toFixed(1)
                    : '--'}
                </span>
                <span className="text-xs text-mobile-text-muted">{t('mobileZoneDetails.lastLiters')}</span>
              </div>
              <div className="flex flex-col rounded-xl bg-mobile-surface-dark p-4 border border-white/5 text-center">
                <span className="text-mobile-primary text-lg font-bold">
                  {zoneStats?.last_watering
                    ? new Date(zoneStats.last_watering * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : '--'}
                </span>
                <span className="text-xs text-mobile-text-muted">{t('mobileZoneDetails.lastRun')}</span>
              </div>
            </div>

            {/* Activity List */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">{t('mobileZoneDetails.recentActivity')}</h4>

              {zoneHistory.length === 0 ? (
                <div className="text-center py-8 text-mobile-text-muted">
                  <span className="material-symbols-outlined text-4xl mb-2 block">history</span>
                  <p>{t('mobileZoneDetails.noHistory')}</p>
                </div>
              ) : (
                zoneHistory.map((entry) => {
                  const date = new Date(entry.timestamp * 1000);
                  const isSuccess = entry.success_status === 1;
                  const isError = entry.event_type === 3;
                  const durationMin = Math.round(entry.actual_value_ml / (entry.flow_rate_avg || 100) / 60);
                  const volumeL = (entry.total_volume_ml / 1000).toFixed(1);
                  const triggerLabels = [t('labels.manual'), t('labels.schedule'), t('labels.remote')];

                  return (
                    <div key={entry.timestamp} className="flex items-center gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-white/5">
                      <div className={`size-10 rounded-full flex items-center justify-center ${isError ? 'bg-red-500/10 text-red-400' :
                        isSuccess ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                        <span className="material-symbols-outlined">
                          {isError ? 'error' : isSuccess ? 'check_circle' : 'warning'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-bold">
                          {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <p className="text-mobile-text-muted text-sm">
                          {isError
                            ? t('mobileZoneDetails.errorCode').replace('{code}', String(entry.error_code))
                            : `${durationMin} ${t('common.minutesShort')}${t('mobileZoneDetails.inlineSeparator')}${volumeL}${t('common.litersShort')}${t('mobileZoneDetails.inlineSeparator')}${triggerLabels[entry.trigger_type] ?? t('labels.unknown')}`
                          }
                        </p>
                      </div>
                      <span className={`text-xs font-bold uppercase px-2 py-1 rounded ${isError ? 'bg-red-500/10 text-red-400' :
                        isSuccess ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-yellow-500/10 text-yellow-400'
                        }`}>
                        {isError ? t('common.error') : isSuccess ? t('common.ok') : t('mobileZoneDetails.statusPartial')}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exit toast removed - double-back-to-exit is handled only in AndroidBackButtonHandler on Dashboard */}
    </div>

  );
};

export default MobileZoneDetailsFull;
