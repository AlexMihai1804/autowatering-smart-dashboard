import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useSettings } from '../../hooks/useSettings';
import { useI18n } from '../../i18n';
import type { CustomSoilConfigData, GrowingEnvData } from '../../types/firmware_structs';
import {
  calcAverageSoilMoisturePercentPreferred,
  calcSoilMoisturePercentPreferred,
  calcSoilMoisturePercentFromVwc,
  getSoilMoistureLabel
} from '../../utils/soilMoisture';
import { OpenMeteoService } from '../../services/OpenMeteoService';
import { readStoredLocation, writeStoredLocation } from '../../services/LocationStorage';

const MobileWeatherDetails: React.FC = () => {
  const history = useHistory();
  const bleService = BleService.getInstance();
  const openMeteo = OpenMeteoService.getInstance();
  const { formatTemperature, useCelsius } = useSettings();
  const { t } = useI18n();
  const percentUnit = t('common.percent');
  const {
    envData,
    rainData,
    zones,
    autoCalcStatus,
    globalAutoCalcStatus,
    soilMoistureConfig,
    globalSoilMoistureConfig,
    customSoilConfigs,
    growingEnv,
    onboardingState,
    soilDb,
    rainHistoryHourly,
    envHistoryHourly,
    connectionState
  } = useAppStore();

  const isConnected = connectionState === 'connected';

  const [showSoilMoistureOverride, setShowSoilMoistureOverride] = useState(false);
  const [soilMoistureOverrideChannelId, setSoilMoistureOverrideChannelId] = useState<number | null>(null);
  const [soilMoistureOverrideEnabled, setSoilMoistureOverrideEnabled] = useState(false);
  const [soilMoistureOverridePct, setSoilMoistureOverridePct] = useState(50);
  const [soilMoistureOverrideLoading, setSoilMoistureOverrideLoading] = useState(false);
  const [soilMoistureOverrideSaving, setSoilMoistureOverrideSaving] = useState(false);
  const [soilMoistureOverrideError, setSoilMoistureOverrideError] = useState<string | null>(null);
  const overrideChannelRef = useRef<number>(0);

  const [soilMoistureModelLoading, setSoilMoistureModelLoading] = useState(false);
  const [soilMoistureModelError, setSoilMoistureModelError] = useState<'no_location' | 'no_soil' | 'failed' | null>(null);
  const [soilMoistureModelSuggestion, setSoilMoistureModelSuggestion] = useState<{
    suggestedPct: number;
    vwc0to9PctVolume: number;
    modelTimeEpoch: number;
  } | null>(null);

  const soilMoistureModelErrorMessage = useMemo(() => {
    if (soilMoistureModelError === 'no_location') return t('mobileWeatherDetails.soilMoistureOverride.modelNoLocation');
    if (soilMoistureModelError === 'no_soil') return t('mobileWeatherDetails.soilMoistureOverride.modelNoSoilParams');
    if (soilMoistureModelError === 'failed') return t('mobileWeatherDetails.soilMoistureOverride.modelFailed');
    return null;
  }, [soilMoistureModelError, t]);

  const configuredZones = useMemo(() => {
    if (!onboardingState) return zones;

    const baseFlags = onboardingState.channel_config_flags ?? BigInt(0);
    const extFlags = onboardingState.channel_extended_flags ?? BigInt(0);

    return zones.filter((z) => {
      const baseByte = Number((baseFlags >> BigInt(z.channel_id * 8)) & BigInt(0xFF));
      const extByte = Number((extFlags >> BigInt(z.channel_id * 8)) & BigInt(0xFF));
      return baseByte > 0 || extByte > 0;
    });
  }, [onboardingState, zones]);

  const activeOverrideChannelId = useMemo(() => {
    if (typeof soilMoistureOverrideChannelId === 'number') {
      const exists = configuredZones.some((z) => z.channel_id === soilMoistureOverrideChannelId);
      if (exists) return soilMoistureOverrideChannelId;
    }
    // Default to the first configured zone when possible.
    return configuredZones[0]?.channel_id ?? zones[0]?.channel_id ?? 0;
  }, [soilMoistureOverrideChannelId, configuredZones, zones]);

  const activeOverrideScopeLabel = useMemo(() => {
    if (configuredZones.length === 0) return t('zones.noZonesConfigured');
    const zoneName = zones.find((z) => z.channel_id === activeOverrideChannelId)?.name;
    if (zoneName && zoneName.trim()) return zoneName;
    return `${t('zones.zone')} ${activeOverrideChannelId + 1}`;
  }, [activeOverrideChannelId, configuredZones.length, zones, t]);

  const soilMoistureOverrideUi = useMemo(() => {
    const key = getSoilMoistureLabel(soilMoistureOverridePct).toLowerCase() as 'optimal' | 'fair' | 'low';
    if (key === 'fair') {
      return {
        key,
        colorHex: '#fbbf24',
        valueClass: 'text-amber-300',
        selectedPillClass: 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold',
      };
    }
    if (key === 'low') {
      return {
        key,
        colorHex: '#f87171',
        valueClass: 'text-red-300',
        selectedPillClass: 'bg-red-400/20 text-red-300 border border-red-400/30 font-bold',
      };
    }
    return {
      key,
      colorHex: '#13ec37',
      valueClass: 'text-mobile-primary',
      selectedPillClass: 'bg-mobile-primary/20 text-mobile-primary border border-mobile-primary/30 font-bold',
    };
  }, [soilMoistureOverridePct]);

  const loadSoilMoistureModelSuggestion = async (
    channelId: number,
    overrides?: {
      growing?: GrowingEnvData | null;
      customSoil?: CustomSoilConfigData | null;
    }
  ) => {
    try {
      setSoilMoistureModelLoading(true);
      setSoilMoistureModelError(null);
      setSoilMoistureModelSuggestion(null);

      // 1) Get best available location: storage first, then GPS (if permitted).
      let location = readStoredLocation();
      if (!location) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 7000,
              maximumAge: 6 * 60 * 60 * 1000,
            });
          });
          const loc = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            source: 'gps' as const,
            accuracy: position.coords.accuracy,
          };
          writeStoredLocation(loc);
          location = { ...loc, updatedAt: Date.now() };
        } catch {
          // No GPS or permission denied; keep null and show CTA.
        }
      }

      if (!location) {
        if (overrideChannelRef.current === channelId) setSoilMoistureModelError('no_location');
        return;
      }

      // 2) Determine soil params.
      let fieldCapacityPct: number | null = null;
      let wiltingPointPct: number | null = null;

      const customSoil = overrides?.customSoil ?? (customSoilConfigs.get(channelId) ?? null);
      const ge = overrides?.growing ?? (growingEnv.get(channelId) ?? null);
      const soilId = ge ? ge.soil_db_index : null;
      const dbSoil = soilId != null ? (soilDb.find((s) => s.id === soilId) ?? null) : null;

      fieldCapacityPct = customSoil?.field_capacity ?? dbSoil?.field_capacity_pct ?? null;
      wiltingPointPct = customSoil?.wilting_point ?? dbSoil?.wilting_point_pct ?? null;

      if (fieldCapacityPct == null || wiltingPointPct == null) {
        if (overrideChannelRef.current === channelId) setSoilMoistureModelError('no_soil');
        return;
      }

      // 3) Fetch model VWC and convert to the app's 0-100% scale using FC/WP.
      const now = await openMeteo.getSoilMoistureNow(location.latitude, location.longitude);
      if (now.timeEpoch == null || now.vwc0to9cm_m3_m3 == null) {
        if (overrideChannelRef.current === channelId) setSoilMoistureModelError('failed');
        return;
      }

      const suggested = calcSoilMoisturePercentFromVwc({
        vwc_m3_m3: now.vwc0to9cm_m3_m3,
        fieldCapacityPct,
        wiltingPointPct,
      });

      if (suggested == null) {
        if (overrideChannelRef.current === channelId) setSoilMoistureModelError('failed');
        return;
      }

      if (overrideChannelRef.current !== channelId) return;

      setSoilMoistureModelSuggestion({
        suggestedPct: suggested,
        vwc0to9PctVolume: Math.round(now.vwc0to9cm_m3_m3 * 1000) / 10, // 1 decimal % volume
        modelTimeEpoch: now.timeEpoch,
      });
    } catch (e) {
      console.warn('[MobileWeatherDetails] Open-Meteo soil moisture failed:', e);
      if (overrideChannelRef.current === channelId) setSoilMoistureModelError('failed');
    } finally {
      if (overrideChannelRef.current === channelId) setSoilMoistureModelLoading(false);
    }
  };

  const seedSoilMoistureOverrideFromStore = (channelId: number) => {
    const cfg = soilMoistureConfig.get(channelId) ?? null;
    setSoilMoistureOverrideEnabled(cfg?.enabled ?? false);
    setSoilMoistureOverridePct(cfg?.moisture_pct ?? 50);
  };

  const selectSoilMoistureOverrideChannel = async (channelId: number) => {
    overrideChannelRef.current = channelId;
    setSoilMoistureOverrideChannelId(channelId);
    setSoilMoistureOverrideError(null);

    seedSoilMoistureOverrideFromStore(channelId);

    if (!isConnected) {
      setSoilMoistureOverrideError(t('mobileWeatherDetails.soilMoistureOverride.notConnected'));
      void loadSoilMoistureModelSuggestion(channelId);
      return;
    }

    setSoilMoistureOverrideLoading(true);
    try {
      const cfg = await bleService.readSoilMoistureConfig(channelId);
      if (overrideChannelRef.current !== channelId) return;
      setSoilMoistureOverrideEnabled(cfg.enabled);
      setSoilMoistureOverridePct(cfg.moisture_pct);

      // Ensure we have soil parameters available (GrowingEnv + optional Custom Soil)
      let growing: GrowingEnvData | null = null;
      try {
        growing = await bleService.readGrowingEnvironment(channelId);
      } catch (e) {
        console.warn('[MobileWeatherDetails] Failed to read Growing Environment:', e);
      }

      if (overrideChannelRef.current !== channelId) return;

      let customSoil: CustomSoilConfigData | null = customSoilConfigs.get(channelId) ?? null;
      const soilDbIndex = growing?.soil_db_index ?? null;
      const usesCustomSoil = soilDbIndex === 255 || (typeof soilDbIndex === 'number' && soilDbIndex >= 200 && soilDbIndex < 255);

      if (usesCustomSoil && customSoil == null) {
        try {
          customSoil = await bleService.readCustomSoilConfig(channelId);
          useAppStore.getState().updateCustomSoilConfig(channelId, customSoil);
        } catch (e) {
          console.warn('[MobileWeatherDetails] Failed to read Custom Soil Config:', e);
        }
      }

      if (overrideChannelRef.current !== channelId) return;
      void loadSoilMoistureModelSuggestion(channelId, { growing, customSoil });
    } catch (error) {
      if (overrideChannelRef.current !== channelId) return;
      console.warn('[MobileWeatherDetails] Failed to read soil moisture override:', error);
      setSoilMoistureOverrideError(t('mobileWeatherDetails.soilMoistureOverride.loadFailed'));
    } finally {
      if (overrideChannelRef.current === channelId) setSoilMoistureOverrideLoading(false);
    }
  };

  const openSoilMoistureOverride = async () => {
    setSoilMoistureOverrideError(null);
    setShowSoilMoistureOverride(true);

    // Default to a zone, not global. Keep the last-used selection if available.
    const last = soilMoistureOverrideChannelId;
    const hasLast = typeof last === 'number' && configuredZones.some((z) => z.channel_id === last);
    const initialChannelId = hasLast ? (last as number) : (configuredZones[0]?.channel_id ?? zones[0]?.channel_id ?? 0);
    void selectSoilMoistureOverrideChannel(initialChannelId);
  };

  const handleSaveSoilMoistureOverride = async () => {
    if (!isConnected) {
      setSoilMoistureOverrideError(t('mobileWeatherDetails.soilMoistureOverride.notConnected'));
      return;
    }

    setSoilMoistureOverrideSaving(true);
    setSoilMoistureOverrideError(null);
    try {
      await bleService.writeSoilMoistureConfig({
        channelId: activeOverrideChannelId,
        enabled: soilMoistureOverrideEnabled,
        moisture_pct: soilMoistureOverridePct,
      });
      setShowSoilMoistureOverride(false);
    } catch (error) {
      console.warn('[MobileWeatherDetails] Failed to save soil moisture override:', error);
      setSoilMoistureOverrideError(t('mobileWeatherDetails.soilMoistureOverride.saveFailed'));
    } finally {
      setSoilMoistureOverrideSaving(false);
    }
  };

  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (rainHistoryHourly.length === 0) {
      void bleService.getRainHourlyHistory(24).catch((error) => {
        console.warn('[MobileWeatherDetails] Failed to load rain hourly history:', error);
      });
    }
    if (envHistoryHourly.length === 0) {
      void bleService.getEnvHourlyHistory(24).catch((error) => {
        console.warn('[MobileWeatherDetails] Failed to load environment hourly history:', error);
      });
    }
  }, [connectionState]);

  // Soil moisture: prefer device-provided config (if present/enabled), otherwise FAO-derived estimate
  const moistureFromZones = calcAverageSoilMoisturePercentPreferred(
    zones.map((z) => ({
      autoCalc: autoCalcStatus.get(z.channel_id) ?? null,
      perChannelConfig: soilMoistureConfig.get(z.channel_id) ?? null
    })),
    globalSoilMoistureConfig
  );
  const moistureFromGlobal = calcSoilMoisturePercentPreferred({
    perChannelConfig: null,
    globalConfig: globalSoilMoistureConfig,
    autoCalc: globalAutoCalcStatus
  });
  const estimatedMoisture = moistureFromZones ?? moistureFromGlobal;
  const moistureStatusKey = estimatedMoisture === null ? null : getSoilMoistureLabel(estimatedMoisture).toLowerCase();
  const moistureStatus = moistureStatusKey ? t(`soilMoisture.${moistureStatusKey}`) : null;

  const moistureUi = useMemo(() => {
    const key = moistureStatusKey as 'optimal' | 'fair' | 'low' | null;
    if (key === 'fair') {
      return {
        ringClass: 'text-amber-400',
        textClass: 'text-amber-300',
        barClass: 'bg-amber-400',
      };
    }
    if (key === 'low') {
      return {
        ringClass: 'text-red-400',
        textClass: 'text-red-300',
        barClass: 'bg-red-400',
      };
    }
    // Default: optimal/unknown -> green
    return {
      ringClass: 'text-mobile-primary',
      textClass: 'text-mobile-primary',
      barClass: 'bg-mobile-primary',
    };
  }, [moistureStatusKey]);

  const moistureInfo = useMemo(() => {
    if (estimatedMoisture === null) {
      return { icon: 'help', iconClass: 'text-white/60' };
    }
    if (estimatedMoisture >= 60) {
      return { icon: 'check_circle', iconClass: 'text-mobile-primary' };
    }
    if (estimatedMoisture > 30) {
      return { icon: 'warning', iconClass: 'text-amber-400' };
    }
    return { icon: 'error', iconClass: 'text-red-400' };
  }, [estimatedMoisture]);
  
  const temperature = envData?.temperature ?? 24;
  const humidity = envData?.humidity ?? 45;
  const rainfall24h = rainData?.last_24h_mm ?? 0;

  const lastUpdatedEpoch = useMemo(() => {
    const epochs = [
      envData?.timestamp ?? 0,
      rainData?.last_pulse_time ?? 0,
      ...rainHistoryHourly.map((entry) => entry.hour_epoch)
    ].filter((value) => value > 0);
    return epochs.length > 0 ? Math.max(...epochs) : 0;
  }, [envData?.timestamp, rainData?.last_pulse_time, rainHistoryHourly]);

  const updatedMinutes = lastUpdatedEpoch > 0
    ? Math.max(0, Math.floor((Date.now() / 1000 - lastUpdatedEpoch) / 60))
    : null;

  const forecastPoints = useMemo(() => {
    const rainPoints = [...rainHistoryHourly]
      .sort((a, b) => a.hour_epoch - b.hour_epoch)
      .slice(-8);

    if (rainPoints.length === 0) return [];

    const envByHour = new Map<string, number>();
    envHistoryHourly.forEach((entry) => {
      const d = new Date(entry.timestamp * 1000);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      envByHour.set(key, entry.temp_avg_x100 / 100);
    });

    return rainPoints.map((entry) => {
      const date = new Date(entry.hour_epoch * 1000);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
      return {
        label: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        rainMm: entry.rainfall_mm_x100 / 100,
        tempC: envByHour.get(key) ?? temperature
      };
    });
  }, [rainHistoryHourly, envHistoryHourly, temperature]);

  const maxForecastRain = useMemo(
    () => Math.max(0.1, ...forecastPoints.map((point) => point.rainMm)),
    [forecastPoints]
  );
  
  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark font-manrope overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 flex items-center bg-mobile-bg-dark/95 backdrop-blur-md p-4 pb-2 justify-between shrink-0">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex w-12 h-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          {t('mobileWeatherDetails.title')}
        </h2>
      </div>
      
      {/* Last updated */}
      <p className="text-mobile-text-muted text-xs font-medium leading-normal pb-4 px-4 text-center flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-sm">sync</span>
        {updatedMinutes !== null
          ? t('mobileWeatherDetails.updated').replace('{minutes}', String(updatedMinutes))
          : t('common.notAvailable')}
      </p>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        {/* Main Content */}
        <div className="flex flex-col gap-5 px-4">
        {estimatedMoisture !== null && moistureStatus && (
          <>
            {/* Soil moisture card */}
            <div className="flex flex-col items-stretch rounded-2xl shadow-sm bg-mobile-card-dark overflow-hidden ring-1 ring-white/5">
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-xl font-bold leading-tight">{t('mobileWeatherDetails.soilMoisture.title')}</p>
                    <p className="text-mobile-text-muted text-sm font-medium mt-1">
                      {t('mobileWeatherDetails.zoneOverview')
                        .replace('{zone}', zones[0]?.name ?? `${t('zones.zone')} 1`)
                        .replace('{overview}', t('zones.overview'))}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => void openSoilMoistureOverride()}
                      className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center"
                      aria-label={t('mobileWeatherDetails.soilMoistureOverride.title')}
                    >
                      <span className="material-symbols-outlined text-white/80">tune</span>
                    </button>
                    <div className="w-10 h-10 rounded-full bg-mobile-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-mobile-primary">grass</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-row items-center gap-6">
                  {/* SVG Gauge */}
                  <div className="relative w-32 h-32 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="text-white/10"
                        cx="50" cy="50" r="42"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                      />
                      <circle
                        className={moistureUi.ringClass}
                        cx="50" cy="50" r="42"
                        fill="transparent"
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="263.89"
                        strokeDashoffset={263.89 * (1 - estimatedMoisture / 100)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-white">{estimatedMoisture}{percentUnit}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${moistureUi.textClass}`}>
                        {moistureStatus}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className={`material-symbols-outlined text-xl mt-0.5 ${moistureInfo.iconClass}`}>{moistureInfo.icon}</span>
                      <div>
                        <p className="text-white text-sm font-bold leading-snug">
                          {estimatedMoisture >= 60
                            ? t('mobileWeatherDetails.soilMoisture.wateringSkipped')
                            : t('mobileWeatherDetails.soilMoisture.wateringNeeded')}
                        </p>
                        <p className="text-mobile-text-muted text-xs leading-relaxed mt-1">
                          {estimatedMoisture >= 60
                            ? t('mobileWeatherDetails.soilMoisture.sufficient')
                            : t('mobileWeatherDetails.soilMoisture.consider')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
               {/* Progress bar */}
               <div className="h-1.5 w-full bg-white/5">
                 <div 
                   className={`h-full rounded-r-full transition-all ${moistureUi.barClass}`} 
                  style={{ width: `${estimatedMoisture}%` }}
                />
              </div>
            </div>
          </>
        )}
        
         {/* Sensor Grid */}
         <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 flex items-center justify-center bg-red-500/20 rounded-full text-red-400">
                <span className="material-symbols-outlined text-xl leading-none">thermostat</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">
                {t('mobileWeatherDetails.highLabel').replace('{value}', formatTemperature(temperature + 4))}
              </span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">{t('mobileWeatherDetails.temperature')}</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {formatTemperature(temperature, false)}
                <span className="text-lg align-top text-mobile-text-muted">{useCelsius ? t('common.degreesC') : t('common.degreesF')}</span>
              </p>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 flex items-center justify-center bg-blue-500/20 rounded-full text-blue-400">
                <span className="material-symbols-outlined text-xl leading-none">humidity_percentage</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">
                {t('mobileWeatherDetails.dewLabel').replace('{value}', formatTemperature(temperature - 8))}
              </span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">{t('mobileWeatherDetails.humidity')}</p>
                <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                  {humidity.toFixed(0)}
                <span className="text-lg align-top text-mobile-text-muted">{percentUnit}</span>
              </p>
            </div>
          </div>
          
          {/* Rainfall */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 flex items-center justify-center bg-mobile-primary/10 rounded-full text-mobile-primary">
                <span className="material-symbols-outlined text-xl leading-none">rainy</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">{t('mobileWeatherDetails.last24h')}</span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">{t('mobileWeatherDetails.rainfall')}</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {rainfall24h.toFixed(1)}
                <span className="text-lg align-top text-mobile-text-muted font-medium pl-1">{t('mobileWeatherDetails.units.mm')}</span>
              </p>
            </div>
          </div>
          
          {/* Pressure */}
          <div className="flex flex-col gap-3 rounded-2xl p-5 bg-mobile-card-dark ring-1 ring-white/5">
            <div className="flex justify-between items-start">
              <div className="w-10 h-10 flex items-center justify-center bg-gray-500/20 rounded-full text-gray-400">
                <span className="material-symbols-outlined text-xl leading-none">speed</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-mobile-text-muted">
                {updatedMinutes !== null ? `${updatedMinutes}m` : '--'}
              </span>
            </div>
            <div>
              <p className="text-mobile-text-muted text-sm font-medium">{t('labels.pressure')}</p>
              <p className="text-white tracking-tight text-3xl font-extrabold leading-tight mt-1">
                {envData?.pressure ? envData.pressure.toFixed(0) : '--'}
                <span className="text-lg align-top text-mobile-text-muted font-medium pl-1">{t('common.hPa')}</span>
              </p>
            </div>
          </div>
        </div>
        
        {/* Forecast Chart */}
        <div className="flex flex-col gap-2 rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white text-base font-bold leading-normal">{t('mobileWeatherDetails.forecast.title')}</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-mobile-primary" />
                <span className="text-[10px] uppercase font-bold text-mobile-text-muted">{t('mobileWeatherDetails.forecast.rainPercent')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full border border-white/50" />
                <span className="text-[10px] uppercase font-bold text-mobile-text-muted">{t('mobileWeatherDetails.forecast.temp')}</span>
              </div>
            </div>
          </div>
          
          {forecastPoints.length === 0 ? (
            <div className="h-[120px] flex items-center justify-center text-mobile-text-muted text-sm">
              {t('common.notAvailable')}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {forecastPoints.map((point, idx) => (
                <div key={`${point.label}-${idx}`} className="flex flex-col items-center gap-2">
                  <span className="text-[10px] text-white/70 font-medium">
                    {formatTemperature(point.tempC, false)}{useCelsius ? t('common.degreesC') : t('common.degreesF')}
                  </span>
                  <div className="h-20 w-full flex items-end justify-center">
                    <div
                      className="w-6 rounded-t-md bg-mobile-primary/70"
                      style={{ height: `${Math.max(8, (point.rainMm / maxForecastRain) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-mobile-text-muted">{point.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Soil Moisture Override Modal */}
      {showSoilMoistureOverride && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm">
          <div
            className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 pb-3 border-b border-white/10"
            style={{
              paddingTop: 'calc(0.75rem + max(var(--ion-safe-area-top, 0px), var(--app-safe-area-top-min, 0px)))',
              paddingLeft: 'calc(1rem + var(--ion-safe-area-left, 0px))',
              paddingRight: 'calc(1rem + var(--ion-safe-area-right, 0px))',
            }}
          >
            <button
              type="button"
              onClick={() => setShowSoilMoistureOverride(false)}
              disabled={soilMoistureOverrideSaving}
              className="justify-self-start px-3 py-2 rounded-lg text-mobile-text-muted hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <h3 className="justify-self-center text-center max-w-[18rem]">
              <span className="block text-white font-bold text-base leading-tight">
                {t('mobileWeatherDetails.soilMoistureOverride.title')}
              </span>
              <span className="block text-mobile-text-muted text-xs font-medium mt-0.5">
                {activeOverrideScopeLabel}
              </span>
            </h3>
            <button
              type="button"
              onClick={() => void handleSaveSoilMoistureOverride()}
              disabled={soilMoistureOverrideSaving || soilMoistureOverrideLoading || configuredZones.length === 0}
              className="justify-self-end px-3 py-2 rounded-lg text-mobile-primary font-bold hover:text-green-300 hover:bg-white/5 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              {soilMoistureOverrideSaving || soilMoistureOverrideLoading ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                t('common.save')
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {soilMoistureOverrideLoading && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-2">
                <span className="material-symbols-outlined animate-spin text-white/70">progress_activity</span>
                <p className="text-white/80 text-sm">{t('common.loading')}</p>
              </div>
            )}

            {soilMoistureOverrideError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-red-200 text-sm">{soilMoistureOverrideError}</p>
              </div>
            )}

            {globalSoilMoistureConfig && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm">
                      {t('mobileWeatherDetails.soilMoistureOverride.scopeGlobal')}
                    </p>
                    <p className="text-mobile-text-muted text-xs mt-1">
                      {t('mobileWeatherDetails.soilMoistureOverride.globalDerived')}
                    </p>
                  </div>
                  <span className="shrink-0 text-white font-bold">
                    {globalSoilMoistureConfig.moisture_pct}{t('common.percent')}
                  </span>
                </div>
              </div>
            )}

            {configuredZones.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-white font-semibold">{t('zones.noZonesConfigured')}</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-5 space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                  {configuredZones.map((zone) => {
                    const isActive = activeOverrideChannelId === zone.channel_id;
                    const zoneLabel = zone.name?.trim()
                      ? zone.name.trim()
                      : `${t('zones.zone')} ${zone.channel_id + 1}`;
                    return (
                      <button
                        key={zone.channel_id}
                        type="button"
                        onClick={() => void selectSoilMoistureOverrideChannel(zone.channel_id)}
                        disabled={soilMoistureOverrideSaving}
                        className={`shrink-0 px-3 py-1.5 rounded-full border text-sm font-semibold transition-colors ${isActive
                          ? 'bg-mobile-primary/15 text-mobile-primary border-mobile-primary/30'
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                          } disabled:opacity-50`}
                      >
                        {zoneLabel}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-bold">{t('mobileWeatherDetails.soilMoistureOverride.enabledLabel')}</p>
                    <p className="text-mobile-text-muted text-sm">{t('mobileWeatherDetails.soilMoistureOverride.subtitle')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSoilMoistureOverrideEnabled(!soilMoistureOverrideEnabled)}
                    disabled={soilMoistureOverrideLoading || soilMoistureOverrideSaving}
                    aria-pressed={soilMoistureOverrideEnabled}
                    className={[
                      'relative inline-flex h-8 w-14 shrink-0 rounded-full border transition-colors',
                      'disabled:opacity-50',
                      soilMoistureOverrideEnabled
                        ? 'bg-mobile-primary/90 border-mobile-primary/30'
                        : 'bg-white/10 border-white/10'
                    ].join(' ')}
                    aria-label={t('mobileWeatherDetails.soilMoistureOverride.enabledLabel')}
                  >
                    <span
                      aria-hidden="true"
                      className={[
                        'absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow',
                        'transition-transform duration-150 ease-out',
                        soilMoistureOverrideEnabled ? 'translate-x-6' : 'translate-x-0'
                      ].join(' ')}
                    />
                  </button>
                </div>

                {soilMoistureOverrideEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                        {t('mobileWeatherDetails.soilMoistureOverride.valueLabel')}
                      </label>
                      <span className={`font-bold text-xl ${soilMoistureOverrideUi.valueClass}`}>
                        {soilMoistureOverridePct}{t('common.percent')}
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={soilMoistureOverridePct}
                      onChange={(e) => setSoilMoistureOverridePct(Number(e.target.value))}
                      disabled={soilMoistureOverrideLoading || soilMoistureOverrideSaving}
                      className="soil-moisture-range w-full h-8 bg-transparent cursor-pointer disabled:opacity-60"
                      style={{
                        ['--sm-color' as any]: soilMoistureOverrideUi.colorHex,
                        ['--sm-pct' as any]: `${soilMoistureOverridePct}%`,
                        WebkitAppearance: 'none',
                      }}
                    />

                    <style>{`
                      .soil-moisture-range {
                        appearance: none;
                        -webkit-appearance: none;
                        background: transparent;
                      }
                      .soil-moisture-range:focus {
                        outline: none;
                      }
                      .soil-moisture-range::-webkit-slider-runnable-track {
                        height: 6px;
                        border-radius: 999px;
                        background: linear-gradient(to right,
                          var(--sm-color) 0%,
                          var(--sm-color) var(--sm-pct),
                          rgba(255,255,255,0.14) var(--sm-pct),
                          rgba(255,255,255,0.14) 100%);
                      }
                      .soil-moisture-range::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        height: 24px;
                        width: 24px;
                        border-radius: 50%;
                        background: var(--sm-color);
                        border: 3px solid rgba(255,255,255,0.9);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                        margin-top: -9px; /* center thumb over 6px track */
                      }
                      .soil-moisture-range::-moz-range-track {
                        height: 6px;
                        border-radius: 999px;
                        background: rgba(255,255,255,0.14);
                      }
                      .soil-moisture-range::-moz-range-progress {
                        height: 6px;
                        border-radius: 999px;
                        background: var(--sm-color);
                      }
                      .soil-moisture-range::-moz-range-thumb {
                        height: 24px;
                        width: 24px;
                        border-radius: 50%;
                        background: var(--sm-color);
                        border: 3px solid rgba(255,255,255,0.9);
                        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
                      }
                    `}</style>

                    <div className="flex flex-wrap gap-2">
                      {[20, 50, 80].map((val) => {
                        const key = getSoilMoistureLabel(val).toLowerCase() as 'optimal' | 'fair' | 'low';
                        const selectedClass =
                          key === 'fair'
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 font-bold'
                            : key === 'low'
                              ? 'bg-red-400/20 text-red-300 border border-red-400/30 font-bold'
                              : 'bg-mobile-primary/20 text-mobile-primary border border-mobile-primary/30 font-bold';

                        return (
                          <button
                            type="button"
                            key={val}
                            onClick={() => setSoilMoistureOverridePct(val)}
                            disabled={soilMoistureOverrideLoading || soilMoistureOverrideSaving}
                            className={`px-4 py-2 rounded-full transition-colors ${soilMoistureOverridePct === val
                              ? selectedClass
                              : 'bg-white/10 text-white/90 hover:bg-white/20 border border-white/10'
                              } disabled:opacity-50`}
                          >
                            {val}{t('common.percent')}
                          </button>
                        );
                      })}
                    </div>

                    {(soilMoistureModelLoading || soilMoistureModelError || soilMoistureModelSuggestion) && (
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm">
                              {t('mobileWeatherDetails.soilMoistureOverride.modelTitle')}
                            </p>
                            {soilMoistureModelLoading ? (
                              <p className="text-mobile-text-muted text-xs mt-1">{t('common.loading')}</p>
                            ) : soilMoistureModelErrorMessage ? (
                              <p className="text-mobile-text-muted text-xs mt-1">{soilMoistureModelErrorMessage}</p>
                            ) : soilMoistureModelSuggestion ? (
                              <p className="text-mobile-text-muted text-xs mt-1">
                                {t('mobileWeatherDetails.soilMoistureOverride.modelValue')
                                  .replace('{value}', `${soilMoistureModelSuggestion.suggestedPct}${t('common.percent')}`)
                                  .replace('{vwc}', `${soilMoistureModelSuggestion.vwc0to9PctVolume}${t('common.percent')}`)
                                  .replace('{time}', new Date(soilMoistureModelSuggestion.modelTimeEpoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))}
                              </p>
                            ) : null}
                          </div>

                          {soilMoistureModelSuggestion && (
                            <button
                              type="button"
                              onClick={() => setSoilMoistureOverridePct(soilMoistureModelSuggestion.suggestedPct)}
                              disabled={soilMoistureOverrideLoading || soilMoistureOverrideSaving}
                              className="shrink-0 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                            >
                              {t('common.apply')}
                            </button>
                          )}
                        </div>

                        {!soilMoistureModelSuggestion && soilMoistureModelError === 'no_location' && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSoilMoistureOverride(false);
                              history.push('/device/time');
                            }}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 py-3 text-sm font-semibold text-white/95 hover:bg-white/20"
                          >
                            {t('mobileWeatherDetails.soilMoistureOverride.modelSetLocation')}
                          </button>
                        )}

                        {!soilMoistureModelSuggestion && soilMoistureModelError === 'no_soil' && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowSoilMoistureOverride(false);
                              history.push(`/zones/${activeOverrideChannelId}/config`);
                            }}
                            className="mt-3 w-full rounded-xl border border-white/10 bg-white/10 py-3 text-sm font-semibold text-white/95 hover:bg-white/20"
                          >
                            {t('mobileWeatherDetails.soilMoistureOverride.modelSetSoil')}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl bg-white/5 p-4">
                      <p className="text-mobile-text-muted text-sm">
                        {t('mobileWeatherDetails.soilMoistureOverride.hint')}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSoilMoistureOverrideEnabled(false);
                        setSoilMoistureOverridePct(50);
                      }}
                      disabled={soilMoistureOverrideLoading || soilMoistureOverrideSaving}
                      className="w-full rounded-xl border border-white/10 bg-white/10 py-3 text-sm font-semibold text-white/95 hover:bg-white/20 disabled:opacity-50"
                    >
                      {t('mobileWeatherDetails.soilMoistureOverride.reset')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileWeatherDetails;


