import React, { useState, useMemo, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { TaskStatus } from '../../types/firmware_structs';
import AlarmPopup from '../../components/mobile/AlarmPopup';
import MobileHealthBanner from '../../components/mobile/MobileHealthBanner';
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
    connectionState,
    connectedDeviceId,
    isInitialSyncComplete
  } = useAppStore();
  const bleService = BleService.getInstance();
  const { devices, setAsLastConnected, renameDevice } = useKnownDevices();

  const [isSwitchingDevice, setIsSwitchingDevice] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

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

  const activeZone = configuredZones[0];
  const isWatering = currentTask?.status === TaskStatus.RUNNING;
  const isTaskPaused = currentTask?.status === TaskStatus.PAUSED;
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
    try {
      if (currentTask?.status === TaskStatus.RUNNING) {
        await bleService.pauseCurrentWatering();
        return;
      }
      if (currentTask?.status === TaskStatus.PAUSED) {
        await bleService.resumeCurrentWatering();
        return;
      }
      alert('Pause/resume is available only while a watering task is active.');
    } catch (error) {
      console.error('Failed to pause/resume watering task:', error);
      const reason = error instanceof Error ? error.message : String(error);
      alert(`${t('common.error')}: ${reason}`);
    }
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

      {/* Main Scrollable Content */}
      <main className="app-scrollbar flex-1 flex flex-col p-4 gap-4 pb-24 overflow-y-auto">
        <MobileHealthBanner />

        {/* Loading Screen while initial sync is in progress */}
        {!isInitialSyncComplete ? (
          <LoadingScreen />
        ) : (
          <>
            {/* Compact operational snapshot */}
            <div className="w-full rounded-2xl bg-mobile-surface-dark shadow-sm border border-mobile-border-dark p-4 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
                    {isWatering ? t('dashboard.wateringActive') : t('dashboard.nextWateringCycle')}
                  </p>
                  {isWatering ? (
                    <>
                      <h2 className="text-2xl font-extrabold text-white leading-tight mt-0.5">
                        {remainingTime}
                        <span className="text-xs font-semibold text-gray-500 ml-1">{t('dashboard.remaining')}</span>
                      </h2>
                      <p className="text-xs text-mobile-primary font-semibold mt-1 truncate">
                        {activeWateringZone?.name || `${t('zones.zone')} ${currentTask?.channel_id}`}
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-extrabold text-white leading-tight mt-0.5">
                        {nextWatering.time || '--:--'}
                      </h2>
                      <p className="text-xs text-mobile-text-muted mt-1 truncate">
                        {nextWatering.day || t('dashboard.noScheduleConfigured')}
                      </p>
                    </>
                  )}
                </div>

                {isWatering ? (
                  <button
                    onClick={handleEmergencyStop}
                    className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 active:scale-95 transition-transform shrink-0"
                    aria-label={t('taskControl.actions.stop')}
                  >
                    <span className="material-symbols-outlined text-[22px]">stop</span>
                  </button>
                ) : (
                  <div className="h-10 w-10 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary shrink-0">
                    <span className="material-symbols-outlined text-[22px]">water_drop</span>
                  </div>
                )}
              </div>

              {isWatering && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs font-medium text-gray-400">
                    <span>{t('dashboard.progress')}</span>
                    <span className="text-mobile-primary">{wateringProgress}{percentUnit}</span>
                  </div>
                  <div className="h-2.5 w-full bg-mobile-border-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-mobile-primary rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${wateringProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {soilMoisture !== null && soilMoistureLabel && (
                <div className="flex items-center justify-between rounded-xl bg-mobile-bg-dark/45 border border-mobile-border-dark px-3 py-2">
                  <p className="text-xs text-gray-400">{t('dashboard.soilMoisture')}</p>
                  <p className={`text-xs font-semibold ${soilMoisture > 60 ? 'text-mobile-primary' : soilMoisture > 30 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {soilMoistureLabel} ({soilMoisture}{percentUnit})
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('dashboard.temp')}</p>
                  <p className="text-sm font-bold mt-1">{formattedTemp}{tempUnit}</p>
                </div>
                <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('dashboard.humidity')}</p>
                  <p className="text-sm font-bold mt-1">
                    {envData?.humidity?.toFixed(0) ?? '--'}{percentUnit}
                  </p>
                </div>
                <div className="rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('dashboard.rainfall24h')}</p>
                  <p className="text-sm font-bold mt-1">
                    {rainData?.today_total_mm?.toFixed(1) ?? '0.0'} {t('common.mm')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => history.push('/weather')}
                className="w-full min-h-12 rounded-xl bg-mobile-bg-dark/55 border border-mobile-border-dark px-3 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/5 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="material-symbols-outlined text-mobile-primary text-[20px]">cloud</span>
                  <span className="text-sm font-bold text-white leading-tight break-words">{t('mobileWeatherDetails.title')}</span>
                </div>
                <span className="material-symbols-outlined text-mobile-text-muted text-[20px] shrink-0">chevron_right</span>
              </button>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-3 px-1 uppercase tracking-wider">{t('dashboard.quickActions')}</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleManualWater}
                  disabled={!activeZone || isWatering}
                  className="flex items-center justify-center gap-2 w-full p-2.5 rounded-2xl bg-mobile-primary text-mobile-bg-dark font-bold shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  <span className="text-sm">{t('dashboard.manualWater')}</span>
                </button>

                <button
                  onClick={handlePauseSchedule}
                  className="flex items-center justify-center gap-2 w-full p-2.5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark text-white font-bold active:scale-[0.98] transition-transform"
                >
                  <span className="material-symbols-outlined text-[20px]">{isTaskPaused ? 'play_arrow' : 'pause'}</span>
                  <span className="text-sm">{isTaskPaused ? t('taskControl.actions.resume') : t('dashboard.pauseSchedule')}</span>
                </button>
              </div>
            </div>

            {/* Zone overview: concise operational context + direct action */}
            <div className="bg-mobile-surface-dark border border-mobile-border-dark rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('mobileWeatherDetails.zoneOverview')}</p>
                  {activeZone ? (
                    <>
                      <h3 className="text-sm font-bold text-white mt-1 truncate">
                        {t('dashboard.zoneActive').replace(
                          '{zone}',
                          activeZone.name || `${t('zones.zone')} ${activeZone.channel_id}`
                        )}
                      </h3>
                      <p className="text-xs text-mobile-text-muted mt-1 truncate">
                        {isWatering
                          ? t('dashboard.wateringInProgressLabel')
                          : `${t('dashboard.nextScheduledRun')} ${nextWatering.time || '--:--'}`}
                      </p>
                    </>
                  ) : (
                    <h3 className="text-sm font-bold text-white mt-1">{t('dashboard.noZonesConfigured')}</h3>
                  )}
                </div>

                {activeZone ? (
                  <button
                    onClick={() => history.push(`/zones/${activeZone.channel_id}`)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white font-bold text-xs whitespace-nowrap"
                  >
                    {t('hydraulicStatus.view')}
                  </button>
                ) : (
                  <button
                    onClick={() => history.push('/zones/add')}
                    className="px-4 py-2 rounded-xl bg-mobile-primary/20 text-mobile-primary font-bold text-xs whitespace-nowrap"
                  >
                    {t('zones.addZone')}
                  </button>
                )}
              </div>
            </div>

            {/* Spacer for bottom nav */}
            <div className="h-8"></div>
          </>
        )}
      </main>

      {/* Alarm Popup - Bottom sheet for active alarms */}
      <AlarmPopup />
    </div>
  );
};

export default MobileDashboard;
