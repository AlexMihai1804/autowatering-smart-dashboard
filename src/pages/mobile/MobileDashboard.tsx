import React, { useState, useMemo, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { TaskStatus, SystemStatus } from '../../types/firmware_structs';
import MobileHeader from '../../components/mobile/MobileHeader';
import OnboardingWizard from '../../components/OnboardingWizard';
import AlarmPopup from '../../components/mobile/AlarmPopup';
import MobileAlarmCard from '../../components/mobile/MobileAlarmCard';
import { useSettings } from '../../hooks/useSettings';
import { useKnownDevices } from '../../hooks/useKnownDevices';
import { useI18n } from '../../i18n';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import {
  calcAverageSoilMoisturePercentPreferred,
  calcSoilMoisturePercentPreferred,
  getSoilMoistureLabel
} from '../../utils/soilMoisture';
import LoadingScreen from '../../components/mobile/LoadingScreen';

import HydraulicStatusWidget from '../../components/HydraulicStatusWidget';
import { EcoBadge } from '../../components/EcoBadge';

const MobileDashboard: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const percentUnit = t('common.percent');
  const { formatTemperature, useCelsius } = useSettings();
  const {
    zones,
    currentTask,
    envData,
    rainData,
    systemStatus,
    autoCalcStatus,
    globalAutoCalcStatus,
    soilMoistureConfig,
    globalSoilMoistureConfig,
    onboardingState,
    connectionState,
    connectedDeviceId,
    isInitialSyncComplete,
    setAlarmPopupDismissed
  } = useAppStore();
  const bleService = BleService.getInstance();
  const { devices, setAsLastConnected, renameDevice } = useKnownDevices();

  const [showWizard, setShowWizard] = useState(false);
  const [selectedZoneIndex, setSelectedZoneIndex] = useState(0);
  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [autoCalcRaw, setAutoCalcRaw] = useState<Uint8Array | null>(null);

  const bytesToHex = (bytes: Uint8Array) =>
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');

  // Find current device info
  const currentDevice = devices.find(d => d.id === connectedDeviceId);
  const otherDevices = devices.filter(d => d.id !== connectedDeviceId);

  const formatDeviceLabel = (id?: string | null) => {
    if (!id) return t('mobileWelcome.appName');
    if (id.length <= 14) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  // Ensure the currently connected device exists in known devices.
  useEffect(() => {
    if (!connectedDeviceId) return;
    if (devices.some(d => d.id === connectedDeviceId)) return;
    setAsLastConnected(connectedDeviceId);
  }, [connectedDeviceId, devices, setAsLastConnected]);

  const handleSwitchDevice = async (deviceId: string) => {
    if (deviceId === connectedDeviceId) return;
    setIsSwitchingDevice(true);
    try {
      await bleService.disconnect();
      await bleService.connect(deviceId);
      setAsLastConnected(deviceId);
    } catch (error) {
      console.error('Failed to switch device:', error);
    } finally {
      setIsSwitchingDevice(false);
    }
  };

  const handleAddNewDevice = async () => {
    await bleService.disconnect();
    history.push('/scan');
  };

  const handleStartRename = () => {
    setRenameValue(currentDevice?.name || '');
    setIsRenaming(true);
  };

  const handleSaveRename = () => {
    if (connectedDeviceId && renameValue.trim()) {
      renameDevice(connectedDeviceId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  // Get active/configured zones
  const configuredZones = useMemo(() => {
    return zones.filter(z => z.name && z.name.trim() !== '');
  }, [zones]);

  const activeZone = configuredZones[selectedZoneIndex] || configuredZones[0];
  const isWatering = currentTask?.status === TaskStatus.RUNNING;
  const activeWateringZone = isWatering ? zones.find(z => z.channel_id === currentTask?.channel_id) : null;

  // Read Auto Calc Status on mount and when connection changes
  useEffect(() => {
    if (connectionState !== 'connected') return;

    // Read global auto calc status (channel 0xFF)
    bleService.readAutoCalcStatusGlobal().catch((error) => {
      console.warn('[MobileDashboard] Failed to read GLOBAL Auto Calc Status:', error);
    });

    // Also read for active zone if available
    if (activeZone) {
      bleService.readAutoCalcStatus(activeZone.channel_id).catch((error) => {
        console.warn('[MobileDashboard] Failed to read Auto Calc Status for channel:', activeZone.channel_id, error);
      });
    }
  }, [connectionState, activeZone?.channel_id]);

  // Calculate watering progress
  const wateringProgress = isWatering && currentTask && currentTask.target_value > 0
    ? Math.round((currentTask.current_value / currentTask.target_value) * 100)
    : 0;

  const remainingTime = useMemo(() => {
    if (!isWatering || !currentTask) return null;
    const remaining = currentTask.target_value - currentTask.current_value;
    if (remaining <= 0) return '0:00';
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }, [isWatering, currentTask]);

  // Soil moisture: prefer device-provided config (if present/enabled), otherwise FAO-derived estimate
  const activeAutoCalc = activeZone ? autoCalcStatus.get(activeZone.channel_id) : null;
  const avgSoilMoisture = calcAverageSoilMoisturePercentPreferred(
    zones.map((z) => ({
      autoCalc: autoCalcStatus.get(z.channel_id) ?? null,
      perChannelConfig: soilMoistureConfig.get(z.channel_id) ?? null
    })),
    globalSoilMoistureConfig
  );

  const soilMoisture =
    avgSoilMoisture ??
    calcSoilMoisturePercentPreferred({
      perChannelConfig: activeZone ? soilMoistureConfig.get(activeZone.channel_id) ?? null : null,
      globalConfig: globalSoilMoistureConfig,
      autoCalc: activeAutoCalc
    }) ??
    calcSoilMoisturePercentPreferred({
      perChannelConfig: null,
      globalConfig: globalSoilMoistureConfig,
      autoCalc: globalAutoCalcStatus
    });
  const soilMoistureLabel = soilMoisture === null ? null : getSoilMoistureLabel(soilMoisture);

  const handleManualWater = async () => {
    if (!activeZone) return;
    try {
      await bleService.writeValveControl(activeZone.channel_id, 1, 5); // action=1 (start), 5 minutes
    } catch (error) {
      console.error('Failed to start watering:', error);
    }
  };

  const handlePauseSchedule = async () => {
    // Mock action - would pause schedules
    console.log('Pause schedule');
  };

  const handleEmergencyStop = async () => {
    try {
      await bleService.stopCurrentWatering();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  };

  // Temperature with proper formatting - show '--' when no data
  const tempC = envData?.temperature;
  const formattedTemp = tempC !== undefined ? formatTemperature(tempC, false) : '--';
  const tempUnit = useCelsius ? t('common.degreesC') : t('common.degreesF');

  const nextWatering = useMemo(() => {
    const fallback = systemStatus.nextRun || '';
    const nextEpoch = globalAutoCalcStatus?.next_irrigation_time ?? 0;

    if (!nextEpoch) {
      return { time: fallback || '--:--', meridiem: '', day: '' };
    }

    const nextDate = new Date(nextEpoch * 1000);
    const time = nextDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    });
    const day = nextDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });

    return { time, meridiem: '', day };
  }, [globalAutoCalcStatus?.next_irrigation_time, systemStatus.nextRun]);

  const nextWateringRaw = useMemo(() => {
    if (!autoCalcRaw || autoCalcRaw.length < 64) return null;
    const nextBytes = autoCalcRaw.slice(31, 35);
    const nextEpoch = new DataView(nextBytes.buffer, nextBytes.byteOffset, 4).getUint32(0, true);
    return {
      payloadHex: bytesToHex(autoCalcRaw),
      nextBytesHex: bytesToHex(nextBytes),
      nextEpoch,
    };
  }, [autoCalcRaw]);

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
      {/* Header with Device Selector */}
      <header className="pt-8 pb-4 px-4 flex items-center justify-between sticky top-0 z-20 bg-mobile-bg-dark/95 backdrop-blur-md safe-area-top shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex flex-col cursor-pointer group text-left">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {isSwitchingDevice ? t('dashboard.switching') : t('dashboard.device')}
              </span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">
                  {currentDevice?.name || formatDeviceLabel(connectedDeviceId)}
                </h1>
                <span className="material-symbols-outlined text-gray-400 group-hover:text-mobile-primary transition-colors text-[20px]">
                  expand_more
                </span>
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px]" align="start">
            <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('dashboard.device')}</div>
            <div className="flex flex-col gap-1">
              {/* Current device with rename */}
              {connectedDeviceId && (
                <div className="rounded-xl bg-mobile-primary/10 p-3">
                  {isRenaming ? (
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        placeholder={t('dashboard.deviceNamePlaceholder')}
                        autoFocus
                        className="w-full px-3 py-2 rounded-lg bg-mobile-bg-dark border border-mobile-border-dark text-white text-sm font-medium focus:outline-none focus:border-mobile-primary"
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveRename()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setIsRenaming(false)}
                          className="flex-1 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleSaveRename}
                          className="flex-1 py-2 rounded-lg bg-mobile-primary text-mobile-bg-dark text-sm font-bold"
                        >
                          {t('common.save')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-mobile-primary/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-mobile-primary">developer_board</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-mobile-primary">
                          {currentDevice?.name || formatDeviceLabel(connectedDeviceId)}
                        </p>
                        <p className="text-xs text-mobile-primary/60">{t('dashboard.connected')}</p>
                      </div>
                      <button
                        onClick={handleStartRename}
                        className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-mobile-primary/60 text-[18px]">edit</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Other devices */}
              {otherDevices.length > 0 && (
                <div className="text-xs font-bold text-mobile-text-muted mt-3 mb-1">{t('dashboard.otherDevices')}</div>
              )}
              {otherDevices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleSwitchDevice(device.id)}
                  disabled={isSwitchingDevice}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-gray-400 text-[18px]">developer_board</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-white">{device.name}</p>
                    <p className="text-xs text-gray-500">{t('dashboard.tapToConnect')}</p>
                  </div>
                </button>
              ))}

              {/* Add new device */}
              <button
                onClick={handleAddNewDevice}
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-white/5 transition-colors border-t border-white/5 mt-1 pt-3"
              >
                <div className="w-8 h-8 rounded-full bg-mobile-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-mobile-primary text-[18px]">add</span>
                </div>
                <p className="text-sm font-semibold text-mobile-primary">{t('dashboard.addNewDevice')}</p>
              </button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex items-center gap-2">
          {connectionState === 'connected' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 rounded-full border border-green-800/50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary"></span>
              </span>
              <span className="text-xs font-bold text-mobile-primary uppercase tracking-wide">{t('dashboard.online')}</span>
            </div>
          )}
        </div>
      </header>

      {/* Alarm Card - Persistent indicator when alarm is active */}
      <MobileAlarmCard onTap={() => setAlarmPopupDismissed(false)} />

      {/* Main Scrollable Content */}
      <main className="flex-1 flex flex-col p-4 gap-6 pb-24 overflow-y-auto">

        {/* Loading Screen while initial sync is in progress */}
        {!isInitialSyncComplete ? (
          <LoadingScreen />
        ) : (
          <>
            {/* Hydraulic Status Widget */}
            <HydraulicStatusWidget />

            {/* Eco/Rain Badge */}
            <EcoBadge />

            {/* Status Cards Row */}
            <div className="relative w-full rounded-3xl overflow-hidden bg-mobile-surface-dark shadow-sm border border-mobile-border-dark p-6 mb-6 min-h-[200px]">
              {/* Background decorative elements */}
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-mobile-primary/20 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl"></div>

              <div className="relative z-10">
                {isWatering ? (
                  // Watering Active State
                  <>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary"></span>
                          </span>
                          <span className="text-mobile-primary text-sm font-bold uppercase">{t('dashboard.wateringActive')}</span>
                        </div>
                        <h2 className="text-3xl font-extrabold text-white">
                          {remainingTime} <span className="text-lg font-bold text-gray-500">{t('dashboard.remaining')}</span>
                        </h2>
                        <p className="text-xs text-mobile-primary font-semibold mt-1">
                          {activeWateringZone?.name || `${t('zones.zone')} ${currentTask?.channel_id}`}
                        </p>
                      </div>
                      <button
                        onClick={handleEmergencyStop}
                        className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[28px]">stop</span>
                      </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-medium text-gray-400">
                        <span>{t('dashboard.progress')}</span>
                        <span className="text-mobile-primary">{wateringProgress}{percentUnit}</span>
                      </div>
                      <div className="h-3 w-full bg-mobile-border-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-mobile-primary rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${wateringProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Idle State
                  <>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <p className="text-sm font-medium text-gray-400 mb-1">{t('dashboard.nextWateringCycle')}</p>
                        {nextWatering.time ? (
                          <>
                            <h2 className="text-3xl font-extrabold text-white">
                              {nextWatering.time}{' '}
                              {nextWatering.meridiem && (
                                <span className="text-lg font-bold text-gray-500">{nextWatering.meridiem}</span>
                              )}
                            </h2>
                            {nextWatering.day && (
                              <p className="text-xs text-mobile-primary font-semibold mt-1">{nextWatering.day}</p>
                            )}
                          </>
                        ) : (
                          <>
                            <h2 className="text-2xl font-extrabold text-white/50">--:--</h2>
                            <p className="text-xs text-gray-500 font-medium mt-1">{t('dashboard.noScheduleConfigured')}</p>
                          </>
                        )}
                      </div>
                      <div className="h-12 w-12 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary">
                        <span className="material-symbols-outlined text-[28px]">water_drop</span>
                      </div>
                    </div>

                    {soilMoisture !== null && soilMoistureLabel && (
                      <>
                        {/* Soil Moisture Progress Bar */}
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between text-xs font-medium text-gray-400">
                            <span>{t('dashboard.soilMoisture')}</span>
                            <span className={soilMoisture > 60 ? 'text-mobile-primary' : soilMoisture > 30 ? 'text-yellow-500' : 'text-red-500'}>
                              {soilMoistureLabel} ({soilMoisture}{percentUnit})
                            </span>
                          </div>
                          <div className="h-3 w-full bg-mobile-border-dark rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-1000 ease-out ${soilMoisture > 60 ? 'bg-gradient-to-r from-green-400 to-mobile-primary' :
                                soilMoisture > 30 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                                  'bg-gradient-to-r from-red-400 to-red-500'
                                }`}
                              style={{ width: `${soilMoisture}%` }}
                            ></div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Sensor Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {/* Temperature */}
              <div className="col-span-1 bg-mobile-surface-dark p-5 rounded-3xl border border-mobile-border-dark flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-4xl text-orange-400">thermostat</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">thermostat</span>
                  </span>
                  <span className="text-xs font-medium text-gray-400">{t('dashboard.temp')}</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{formattedTemp}{tempUnit}</span>
                </div>
              </div>

              {/* Humidity */}
              <div className="col-span-1 bg-mobile-surface-dark p-5 rounded-3xl border border-mobile-border-dark flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-4xl text-blue-400">humidity_percentage</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[20px]">water_drop</span>
                  </span>
                  <span className="text-xs font-medium text-gray-400">{t('dashboard.humidity')}</span>
                </div>
                <div>
                  <span className="text-2xl font-bold">{envData?.humidity?.toFixed(0) ?? '--'}{percentUnit}</span>
                  <span className="text-xs text-gray-400 ml-1">{(envData?.humidity ?? 50) < 40 ? t('dashboard.humidityDry') : t('dashboard.humidityNormal')}</span>
                </div>
              </div>

              {/* Rainfall (Full Width) */}
              <div className="col-span-2 bg-mobile-surface-dark p-5 rounded-3xl border border-mobile-border-dark flex items-center justify-between relative overflow-hidden">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">rainy</span>
                    </span>
                    <span className="text-xs font-medium text-gray-400">{t('dashboard.rainfall24h')}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-2xl font-bold">{rainData?.today_total_mm?.toFixed(1) ?? '0.0'}</span>
                    <span className="text-sm text-gray-400 font-medium ml-1">{t('common.mm')}</span>
                  </div>
                </div>

                {/* Mini chart visualization */}
                <div className="h-10 w-24">
                  <div className="flex items-end justify-between h-full gap-1">
                    {[30, 50, 20, 60, 80, 40, 35].map((h, i) => (
                      <div
                        key={i}
                        className={`w-1.5 rounded-t-sm ${i === 4 ? 'bg-indigo-500' : 'bg-indigo-500/20'}`}
                        style={{ height: `${h}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-400 mb-3 px-1 uppercase tracking-wider">{t('dashboard.quickActions')}</h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleManualWater}
                  disabled={isWatering}
                  className="flex items-center justify-between w-full p-4 rounded-3xl bg-mobile-primary text-mobile-bg-dark font-bold shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-black/10 p-2 rounded-full">
                      <span className="material-symbols-outlined text-[24px]">play_arrow</span>
                    </span>
                    <span>{t('dashboard.manualWater')}</span>
                  </div>
                  <span className="material-symbols-outlined text-[20px] opacity-60">arrow_forward</span>
                </button>

                <button
                  onClick={handlePauseSchedule}
                  className="flex items-center justify-between w-full p-4 rounded-3xl bg-mobile-surface-dark border border-mobile-border-dark text-white font-bold active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-3">
                    <span className="bg-white/5 p-2 rounded-full text-gray-300">
                      <span className="material-symbols-outlined text-[24px]">pause</span>
                    </span>
                    <span>{t('dashboard.pauseSchedule')}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Onboarding prompt if needed */}
            {onboardingState && onboardingState.overall_completion_pct < 100 && (
              <div className="bg-mobile-surface-dark border border-mobile-primary/30 rounded-3xl p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">{t('dashboard.completeSetup')}</h3>
                  <span className="text-mobile-primary text-sm font-bold">{onboardingState.overall_completion_pct}{percentUnit}</span>
                </div>
                <div className="h-2 bg-mobile-border-dark rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-mobile-primary rounded-full transition-all"
                    style={{ width: `${onboardingState.overall_completion_pct}%` }}
                  ></div>
                </div>
                <button
                  onClick={() => setShowWizard(true)}
                  className="w-full py-3 rounded-full bg-mobile-primary/20 text-mobile-primary font-bold text-sm"
                >
                  {t('dashboard.continueSetup')}
                </button>
              </div>
            )}

            {/* Spacer for bottom nav */}
            <div className="h-8"></div>
          </>
        )}
      </main>

      {/* Onboarding Wizard Modal */}
      <OnboardingWizard
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
      />

      {/* Alarm Popup - Bottom sheet for active alarms */}
      <AlarmPopup />
    </div>
  );
};

export default MobileDashboard;
