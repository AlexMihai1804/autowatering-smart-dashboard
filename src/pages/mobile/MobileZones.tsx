import React, { useMemo, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { TaskStatus, isChannelConfigComplete } from '../../types/firmware_structs';
import { useSettings } from '../../hooks/useSettings';
import { ZonesLoadingSkeleton } from '../../components/mobile/LoadingSkeleton';
import { useI18n } from '../../i18n';

const MobileZones: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const { formatTemperature } = useSettings();
  const {
    zones,
    currentTask,
    onboardingState,
    wizardState,
    envData,
    rainData,
    autoCalcStatus,
    globalAutoCalcStatus,
    statistics,
    systemStatus,
    connectionState,
    isInitialSyncComplete
  } = useAppStore();
  const bleService = BleService.getInstance();

  // Check if a channel is configured
  const isChannelConfigured = (channelId: number): boolean => {
    if (onboardingState?.channel_extended_flags !== undefined) {
      if (isChannelConfigComplete(onboardingState.channel_extended_flags, channelId)) return true;
    }
    return wizardState.completedZones.includes(channelId);
  };

  // Get global next run time
  const globalNextRun = useMemo(() => {
    const nextEpoch = globalAutoCalcStatus?.next_irrigation_time ?? 0;
    if (!nextEpoch) {
      return systemStatus.nextRun || '--:--';
    }
    const d = new Date(nextEpoch * 1000);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }, [globalAutoCalcStatus?.next_irrigation_time, systemStatus.nextRun]);

  // Get next run for a specific channel
  const getChannelNextRun = (channelId: number): string => {
    const autoCalc = autoCalcStatus.get(channelId);
    const nextEpoch = autoCalc?.next_irrigation_time ?? 0;
    if (!nextEpoch) {
      return t('zones.notScheduled');
    }
    const d = new Date(nextEpoch * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `${t('zones.today')}, ${time}`;
    if (isTomorrow) return `${t('zones.tomorrow')}, ${time}`;
    return d.toLocaleDateString(undefined, { weekday: 'short' }) + ', ' + time;
  };

  // Get visible zones (configured ones)
  const visibleZones = useMemo(() => {
    const filtered = zones.filter(z => isChannelConfigured(z.channel_id) || (z.name && z.name.trim() !== ''));
    // Defensive: ensure unique channel_id entries to avoid duplicate React keys
    // (some BLE/parse paths may temporarily duplicate entries in the store)
    const byChannel = new Map<number, (typeof filtered)[number]>();
    for (const zone of filtered) {
      if (!byChannel.has(zone.channel_id)) {
        byChannel.set(zone.channel_id, zone);
      }
    }
    return Array.from(byChannel.values()).sort((a, b) => a.channel_id - b.channel_id);
  }, [zones, onboardingState, wizardState]);

  // Read Auto Calc Status for all visible zones when connected
  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (visibleZones.length === 0) return;

    // Read global status first
    bleService.readAutoCalcStatusGlobal().catch((error) => {
      console.warn('[MobileZones] Failed to read global Auto Calc Status:', error);
    });

    // Then read for each visible zone
    visibleZones.forEach((zone) => {
      bleService.readAutoCalcStatus(zone.channel_id).catch((error) => {
        console.warn(`[MobileZones] Failed to read Auto Calc Status for channel ${zone.channel_id}:`, error);
      });
    });
  }, [connectionState, visibleZones.length]);

  const isWatering = currentTask?.status === TaskStatus.RUNNING;
  const wateringChannelId = currentTask?.channel_id;

  // Calculate progress for watering zone
  const getProgress = (channelId: number) => {
    if (!isWatering || wateringChannelId !== channelId || !currentTask) return 0;
    if (currentTask.target_value <= 0) return 0;
    return Math.round((currentTask.current_value / currentTask.target_value) * 100);
  };

  const getRemainingTime = (channelId: number) => {
    if (!isWatering || wateringChannelId !== channelId || !currentTask) return null;
    const remaining = currentTask.target_value - currentTask.current_value;
    if (remaining <= 0) return '0:00';
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const handleZoneClick = (channelId: number) => {
    history.push(`/zones/${channelId}`);
  };

  const handleQuickWater = async (channelId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bleService.writeValveControl(channelId, 1, 5); // action=1 (start), 5 minutes
    } catch (error) {
      console.error('Failed to start watering:', error);
    }
  };

  const handlePause = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (currentTask?.status === TaskStatus.RUNNING) {
        await bleService.pauseCurrentWatering();
      } else if (currentTask?.status === TaskStatus.PAUSED) {
        await bleService.resumeCurrentWatering();
      }
    } catch (error) {
      console.error('Failed to pause:', error);
    }
  };

  const handleStop = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await bleService.stopCurrentWatering();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  };

  const handleAddZone = () => {
    // Navigate to zone add wizard
    history.push('/zones/add');
  };

  const getZoneStatus = (channelId: number): { label: string; color: string; bgColor: string } => {
    if (isWatering && wateringChannelId === channelId) {
      return { label: t('zones.wateringNow'), color: 'text-mobile-primary', bgColor: 'border-mobile-primary' };
    }
    const autoCalc = autoCalcStatus.get(channelId);
    if (autoCalc?.calculation_error) {
      return { label: t('common.warning'), color: 'text-amber-400', bgColor: 'border-mobile-border-dark' };
    }
    if (autoCalc && autoCalc.irrigation_needed === 0) {
      return { label: t('zones.rainSkip'), color: 'text-blue-500', bgColor: 'border-mobile-border-dark' };
    }
    return { label: t('zones.auto'), color: 'text-gray-400', bgColor: 'border-mobile-border-dark' };
  };

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 pb-2 bg-mobile-bg-dark sticky top-0 z-10 safe-area-top shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-mobile-primary/20 flex items-center justify-center text-mobile-primary">
            <span className="material-symbols-outlined">water_drop</span>
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{t('zones.irrigationZones')}</h1>
            <p className="text-xs text-gray-400 font-medium">{visibleZones.length} {t('zones.zonesConfigured')}</p>
          </div>
        </div>
        <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors relative">
          <span className="material-symbols-outlined text-white">notifications</span>
        </button>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        {/* Loading Skeleton while initial sync is in progress */}
        {!isInitialSyncComplete ? (
          <ZonesLoadingSkeleton />
        ) : (
          <>
            {/* Status Summary */}
            <div className="px-4 pt-4 pb-2 space-y-2">
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-3">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    {isWatering ? t('zones.wateringInProgress') : t('zones.irrigationZones')}
                  </p>
                  <p className="text-sm font-bold text-white mt-1 truncate">
                    {isWatering ? t('zones.wateringInProgress') : `${visibleZones.length} ${t('zones.zonesConfigured')}`}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{t('weather.nextRun')}</p>
                  <p className="text-sm font-bold text-white mt-1">{globalNextRun}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-mobile-surface-dark border border-mobile-border-dark px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('dashboard.temp')}</p>
                  <p className="text-sm font-bold text-white mt-1">{formatTemperature(envData?.temperature ?? 22)}</p>
                </div>
                <div className="rounded-xl bg-mobile-surface-dark border border-mobile-border-dark px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">{t('dashboard.rainfall24h')}</p>
                  <p className="text-sm font-bold text-white mt-1">{(rainData?.last_24h_mm ?? 0).toFixed(1)} {t('common.mm')}</p>
                </div>
              </div>
            </div>

            {/* Zones List Section */}
            <div className="px-4 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t('zones.irrigationZones')}</h3>
                <button
                  onClick={handleAddZone}
                  className="text-mobile-primary text-sm font-bold flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {t('zones.addZone')}
                </button>
              </div>

              {visibleZones.length === 0 ? (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-6xl text-gray-600 mb-4 block">yard</span>
                  <h3 className="text-xl font-bold text-white mb-2">{t('zones.noZonesConfigured')}</h3>
                  <p className="text-gray-400 mb-6">{t('zones.tapAddZone')}</p>
                  <button
                    onClick={handleAddZone}
                    className="px-6 py-3 bg-mobile-primary text-mobile-bg-dark font-bold rounded-full"
                  >
                    {t('zones.addFirstZone')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {visibleZones.map((zone) => {
                    const isZoneWatering = isWatering && wateringChannelId === zone.channel_id;
                    const status = getZoneStatus(zone.channel_id);
                    const progress = getProgress(zone.channel_id);
                    const remaining = getRemainingTime(zone.channel_id);

                    return (
                      <div
                        key={zone.channel_id}
                        onClick={() => handleZoneClick(zone.channel_id)}
                        className={`relative bg-mobile-surface-dark rounded-xl p-4 shadow-sm border-2 overflow-hidden cursor-pointer transition-all active:scale-[0.98] ${isZoneWatering ? 'border-mobile-primary' : 'border-mobile-border-dark'
                          }`}
                      >
                        {/* Active Indicator Background */}
                        {isZoneWatering && (
                          <div className="absolute inset-0 bg-mobile-primary/5 pointer-events-none"></div>
                        )}

                        <div className="relative flex justify-between items-start mb-4">
                          <div className="flex gap-3 items-center">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isZoneWatering
                              ? 'bg-mobile-primary text-mobile-bg-dark'
                              : 'bg-mobile-primary/20 text-mobile-primary'
                              }`}>
                              <span className="material-symbols-outlined">
                                {zone.plant_type ? 'potted_plant' : 'yard'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-base leading-tight">
                                {zone.name || `${t('zones.zone')} ${zone.channel_id + 1}`}
                              </h4>
                              {isZoneWatering ? (
                                <div className="flex items-center gap-1 text-mobile-primary text-xs font-bold mt-0.5">
                                  <span className="material-symbols-outlined text-sm animate-pulse">water_drop</span>
                                  <span>{t('zones.wateringNow')}</span>
                                </div>
                              ) : (
                                <p className="text-xs text-mobile-text-muted">
                                  {t('zones.next')}: {getChannelNextRun(zone.channel_id)}
                                </p>
                              )}
                            </div>
                          </div>

                          {isZoneWatering && remaining && (
                            <div className="bg-mobile-primary text-mobile-bg-dark px-3 py-1 rounded-full text-xs font-extrabold">
                              {remaining} {t('zones.left')}
                            </div>
                          )}

                          {!isZoneWatering && (
                            <span className={`px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold uppercase ${status.color} tracking-wide`}>
                              {status.label}
                            </span>
                          )}
                        </div>

                        {/* Progress Bar for active watering */}
                        {isZoneWatering && (
                          <div className="w-full bg-white/10 h-1.5 rounded-full mb-4 overflow-hidden">
                            <div
                              className="bg-mobile-primary h-full rounded-full transition-all duration-1000"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-mobile-text-muted">
                            {(() => {
                              if (isZoneWatering) return `${t('zones.started')}: ${t('zones.justNow')}`;
                              const zoneStats = statistics.get(zone.channel_id);
                              if (!zoneStats || !zoneStats.last_watering) {
                                return `${t('zones.last')}: ${t('zones.notScheduled')}`;
                              }
                              const lastDate = new Date(zoneStats.last_watering * 1000);
                              const volumeL = (zoneStats.last_volume / 1000).toFixed(1);
                              return `${t('zones.last')}: ${lastDate.toLocaleDateString()} (${volumeL}${t('common.litersShort')})`;
                            })()}
                          </div>

                          <div className="flex gap-2">
                            {isZoneWatering ? (
                              <>
                                <button
                                  onClick={handlePause}
                                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-xl">
                                    {currentTask?.status === TaskStatus.PAUSED ? 'play_arrow' : 'pause'}
                                  </span>
                                </button>
                                <button
                                  onClick={handleStop}
                                  className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 hover:bg-red-500/30 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-xl">stop</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={(e) => handleQuickWater(zone.channel_id, e)}
                                className="flex items-center gap-1 bg-mobile-primary text-mobile-bg-dark px-3 py-1.5 rounded-full text-xs font-bold hover:brightness-110 transition-all"
                              >
                                <span className="material-symbols-outlined text-sm">play_arrow</span>
                                {t('zones.water')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Spacer for Bottom Nav */}
            <div className="h-24"></div>
          </>
        )}
      </div>
    </div>
  );
};

export default MobileZones;
