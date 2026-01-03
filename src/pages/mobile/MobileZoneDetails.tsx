import React, { useState, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { TaskStatus } from '../../types/firmware_structs';
import { calcSoilMoisturePercentPreferred } from '../../utils/soilMoisture';
import { useI18n } from '../../i18n';

interface RouteParams {
  channelId: string;
}

const MobileZoneDetails: React.FC = () => {
  const history = useHistory();
  const { channelId } = useParams<RouteParams>();
  const channelIdNum = parseInt(channelId, 10);
  const { t, language } = useI18n();
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';

  const {
    zones,
    currentTask,
    autoCalcStatus,
    globalSoilMoistureConfig,
    soilMoistureConfig,
    statistics,
    schedules,
    growingEnv
  } = useAppStore();
  const bleService = BleService.getInstance();

  const zone = useMemo(() => {
    return zones.find(z => z.channel_id === channelIdNum);
  }, [zones, channelIdNum]);

  const isWatering = currentTask?.status === TaskStatus.RUNNING && currentTask?.channel_id === channelIdNum;
  
  // Calculate progress
  const progress = useMemo(() => {
    if (!isWatering || !currentTask || currentTask.target_value <= 0) return 0;
    return Math.round((currentTask.current_value / currentTask.target_value) * 100);
  }, [isWatering, currentTask]);

  const remainingTime = useMemo(() => {
    if (!isWatering || !currentTask) return '00:00';
    const remaining = Math.max(0, currentTask.target_value - currentTask.current_value);
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [isWatering, currentTask]);

  // Get zone stats
  const zoneStats = statistics.get(channelIdNum);
  const autoCalc = autoCalcStatus.get(channelIdNum);
  const schedule = schedules.get(channelIdNum);
  const growing = growingEnv.get(channelIdNum);
  const soilMoisture = calcSoilMoisturePercentPreferred({
    perChannelConfig: soilMoistureConfig.get(channelIdNum) ?? null,
    globalConfig: globalSoilMoistureConfig,
    autoCalc: autoCalc ?? null
  });
  const lastRunUsage = zoneStats?.total_volume ?? 12; // Fallback 12L

  // Is FAO-56 auto mode
  const isFao56 = schedule?.schedule_type === 2 || (growing?.auto_mode ?? 0) > 0;

  // Get next watering display - only show for FAO-56 mode with valid data
  const nextScheduleDisplay = useMemo(() => {
    const nextEpoch = autoCalc?.next_irrigation_time ?? 0;
    if (!nextEpoch) {
      return t('zoneDetails.notScheduled');
    }
    const d = new Date(nextEpoch * 1000);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();
    
    const time = d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    if (isToday) return t('zoneDetails.todayAt').replace('{time}', time);
    if (isTomorrow) return t('zoneDetails.tomorrowAt').replace('{time}', time);
    return t('zoneDetails.dayAt')
      .replace('{day}', d.toLocaleDateString(locale, { weekday: 'long' }))
      .replace('{time}', time);
  }, [autoCalc?.next_irrigation_time, locale, t]);

  const handleBack = () => {
    history.goBack();
  };

  const handleStop = async () => {
    try {
      await bleService.stopCurrentWatering();
    } catch (error) {
      console.error('Failed to stop:', error);
    }
  };

  const handleSkipNext = () => {
    // Mock - would skip next scheduled run
    console.log('Skip next watering');
  };

  const handleOpenSchedule = () => {
    // Navigate to schedule settings
    console.log('Open schedule');
  };

  const handleStartManual = async () => {
    try {
      await bleService.writeValveControl(channelIdNum, 1, 5); // action=1 (start), 5 minutes
    } catch (error) {
      console.error('Failed to start:', error);
    }
  };

  const handleOpenSettings = () => {
    // Would open zone settings
    console.log('Open zone settings');
  };

  if (!zone) {
    return (
      <div className="min-h-screen bg-mobile-bg-dark text-white flex items-center justify-center">
        <p>{t('mobileZoneDetails.zoneNotFound')}</p>
      </div>
    );
  }

  // Calculate the SVG dash offset for progress ring
  const circumference = 2 * Math.PI * 46; // r=46
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div className="min-h-screen bg-mobile-bg-dark text-white pb-24">
      {/* TopAppBar */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 pb-2 justify-between safe-area-top">
        <button 
          onClick={handleBack}
          className="text-white flex w-12 h-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">{t('mobileZoneDetails.title')}</h2>
        <div className="absolute right-4 flex w-12 items-center justify-end">
          <button 
            onClick={handleOpenSettings}
            className="flex w-12 h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-transparent text-white hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </div>

      {/* Headline & Meta */}
      <div className="flex flex-col items-center pt-2 pb-6 px-4">
        <h1 className="text-[32px] font-extrabold leading-tight text-center">
          {zone.name || `${t('zones.zone')} ${channelIdNum + 1}`}
        </h1>
        <div className="flex items-center gap-2 mt-2">
          <span className="inline-flex items-center justify-center rounded-full bg-mobile-surface-dark px-2.5 py-0.5 text-xs font-medium text-mobile-text-muted border border-mobile-border-dark">
            {zone.plant_type ? t('categories.vegetables') : t('mobileZoneDetails.general')}
          </span>
          {soilMoisture !== null && (
            <p className="text-mobile-text-muted text-sm font-medium">
              {soilMoisture < 30
                ? t('mobileZoneDetails.waterNeedLow')
                : soilMoisture < 60
                  ? t('mobileZoneDetails.waterNeedNormal')
                  : t('mobileZoneDetails.waterNeedHigh')}
              {' '}
              {t('mobileZoneDetails.waterNeedSuffix')}
            </p>
          )}
        </div>
      </div>

      {/* Hero Status Card */}
      <div className="px-4 mb-6">
        <div className="relative overflow-hidden rounded-[2rem] bg-mobile-surface-dark shadow-lg border border-mobile-border-dark">
          {/* Background gradient */}
          <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-mobile-primary/30 to-transparent"></div>
          
          <div className="relative flex flex-col items-center justify-center p-8 z-10">
            {/* Status Badge */}
            <div className={`mb-6 flex items-center gap-2 rounded-full px-4 py-1.5 backdrop-blur-sm border ${
              isWatering 
                ? 'bg-mobile-primary/20 border-mobile-primary/30' 
                : 'bg-white/5 border-white/10'
            }`}>
              {isWatering && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary"></span>
                </span>
              )}
              <span className={`text-sm font-bold tracking-wide uppercase ${isWatering ? 'text-mobile-primary' : 'text-gray-400'}`}>
                {isWatering ? t('zoneDetails.wateringActive') : t('zoneDetails.idle')}
              </span>
            </div>

            {/* Timer Visual */}
            <div className="relative mb-4 flex items-center justify-center">
              {/* Progress Ring */}
              <div className="w-48 h-48 rounded-full border-[6px] border-mobile-border-dark flex items-center justify-center relative">
                <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="46" 
                    fill="transparent" 
                    stroke={isWatering ? "#13ec37" : "#2a382b"}
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={isWatering ? dashOffset : 0}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="flex flex-col items-center">
                  <span className={`material-symbols-outlined text-4xl mb-1 ${isWatering ? 'text-mobile-primary' : 'text-gray-500'}`}>
                    water_drop
                  </span>
                  <span className={`text-5xl font-black tracking-tighter font-manrope ${isWatering ? 'text-white' : 'text-gray-500'}`}>
                    {remainingTime}
                  </span>
                  <span className="text-mobile-text-muted text-sm font-medium mt-1">
                    {isWatering ? t('mobileZoneDetails.remainingLabel') : t('mobileZoneDetails.idleLabel')}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-center text-white/70 text-sm max-w-[200px]">
              {t('mobileZoneDetails.nextSchedule').replace('{time}', nextScheduleDisplay)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="px-4 mb-8">
        <h3 className="text-white text-base font-bold mb-4 px-1">{t('mobileZoneDetails.quickActions')}</h3>
        <div className="grid grid-cols-3 gap-3">
          {/* Stop Button */}
          <button 
            onClick={handleStop}
            disabled={!isWatering}
            className={`group flex flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-mobile-surface-dark p-4 transition-all active:scale-95 border border-mobile-border-dark ${
              !isWatering ? 'opacity-50' : 'hover:bg-white/5'
            }`}
          >
            <div className={`flex w-12 h-12 items-center justify-center rounded-full transition-colors ${
              isWatering 
                ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500 group-hover:text-white' 
                : 'bg-gray-500/10 text-gray-500'
            }`}>
              <span className="material-symbols-outlined text-[28px]">stop_circle</span>
            </div>
            <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('common.stop')}</span>
          </button>

          {/* Skip Button */}
          <button 
            onClick={handleSkipNext}
            className="group flex flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-mobile-surface-dark p-4 hover:bg-white/5 transition-all active:scale-95 border border-mobile-border-dark"
          >
            <div className="flex w-12 h-12 items-center justify-center rounded-full bg-mobile-primary/10 text-mobile-primary group-hover:bg-mobile-primary group-hover:text-mobile-bg-dark transition-colors">
              <span className="material-symbols-outlined text-[28px]">skip_next</span>
            </div>
            <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('mobileZoneDetails.skipNext')}</span>
          </button>

          {/* Schedule Button */}
          <button 
            onClick={handleOpenSchedule}
            className="group flex flex-col items-center justify-center gap-2 rounded-[1.5rem] bg-mobile-surface-dark p-4 hover:bg-white/5 transition-all active:scale-95 border border-mobile-border-dark"
          >
            <div className="flex w-12 h-12 items-center justify-center rounded-full bg-white/5 text-white group-hover:bg-white group-hover:text-mobile-bg-dark transition-colors">
              <span className="material-symbols-outlined text-[28px]">calendar_clock</span>
            </div>
            <span className="text-mobile-text-muted text-xs font-bold group-hover:text-white">{t('zoneDetails.schedule')}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="px-4 mb-6">
        <h3 className="text-white text-base font-bold mb-4 px-1">{t('mobileZoneDetails.healthStats')}</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Moisture Card */}
          {soilMoisture !== null && (
            <div className="flex flex-col rounded-[1.5rem] bg-mobile-surface-dark p-5 border border-mobile-border-dark">
              <div className="flex items-start justify-between mb-4">
                <div className="flex w-10 h-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
                  <span className="material-symbols-outlined">humidity_percentage</span>
                </div>
                <span className="text-xs font-medium text-mobile-primary bg-mobile-primary/10 px-2 py-1 rounded-full">
                  {autoCalc?.current_deficit_mm
                    ? `-${autoCalc.current_deficit_mm.toFixed(1)}${t('common.mm')}`
                    : `+0${t('common.percent')}`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-3xl font-bold text-white">{soilMoisture}{t('common.percent')}</span>
                <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.soilMoisture')}</span>
              </div>
            </div>
          )}

          {/* Water Usage Card */}
          <div className="flex flex-col rounded-[1.5rem] bg-mobile-surface-dark p-5 border border-mobile-border-dark">
            <div className="flex items-start justify-between mb-4">
              <div className="flex w-10 h-10 items-center justify-center rounded-full bg-mobile-primary/20 text-mobile-primary">
                <span className="material-symbols-outlined">water_drop</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold text-white">
                {lastRunUsage}<span className="text-lg font-medium text-mobile-text-muted ml-1">{t('common.litersShort')}</span>
              </span>
              <span className="text-sm text-mobile-text-muted">{t('mobileZoneDetails.lastRunUsage')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Start Button (Big CTA) */}
      <div className="flex px-4 py-3 justify-center mb-4">
        <button 
          onClick={handleStartManual}
          disabled={isWatering}
          className="w-full flex cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 bg-mobile-primary hover:bg-green-400 text-mobile-bg-dark gap-3 text-lg font-bold leading-normal tracking-wide transition-all active:scale-95 shadow-lg shadow-mobile-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined">play_circle</span>
          <span>{isWatering ? t('mobileZoneDetails.watering') : t('mobileZoneDetails.startManualCycle')}</span>
        </button>
      </div>

      <div className="h-10"></div>
    </div>
  );
};

export default MobileZoneDetails;
