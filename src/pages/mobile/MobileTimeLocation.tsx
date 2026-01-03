import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { GrowingEnvData, TimezoneConfigData } from '../../types/firmware_structs';
import { useI18n } from '../../i18n';

const MobileTimeLocation: React.FC = () => {
  const history = useHistory();
  const { timezoneConfig, growingEnv } = useAppStore();
  const bleService = BleService.getInstance();
  const { t, language } = useI18n();

  const [autoSync, setAutoSync] = useState(true);
  const [timezone, setTimezone] = useState('Europe/London');
  const [lat, setLat] = useState(44.4268);
  const [lng, setLng] = useState(26.1025);
  const [loading, setLoading] = useState(false);
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';

  // Timezone presets mapping to offset minutes
  const timezones = [
    { value: 'Europe/Bucharest', label: t('mobileTimeLocation.timezones.bucharest'), offsetNum: 120, offsetDisplay: '+2:00' },
    { value: 'Europe/London', label: t('mobileTimeLocation.timezones.london'), offsetNum: 0, offsetDisplay: '+0:00' },
    { value: 'Europe/Berlin', label: t('mobileTimeLocation.timezones.berlin'), offsetNum: 60, offsetDisplay: '+1:00' },
    { value: 'America/New_York', label: t('mobileTimeLocation.timezones.newYork'), offsetNum: -300, offsetDisplay: '-5:00' },
    { value: 'America/Los_Angeles', label: t('mobileTimeLocation.timezones.losAngeles'), offsetNum: -480, offsetDisplay: '-8:00' },
  ];

  useEffect(() => {
    // Initial load from store
    if (timezoneConfig) {
      const match = timezones.find(t => t.offsetNum === timezoneConfig.utc_offset_minutes);
      if (match) setTimezone(match.value);
    }

    // Initial load location from Ch0 growing env (if available)
    if (growingEnv && growingEnv.get(0)) {
      setLat(growingEnv.get(0)!.latitude_deg);
    } else {
      bleService.readGrowingEnvironment(0).catch(console.error);
    }
  }, [timezoneConfig, growingEnv]);

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      await bleService.syncDeviceTime();
    } catch (e) {
      console.error('Sync failed:', e);
      alert(t('mobileTimeLocation.syncFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = async () => {
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });
      setLat(position.coords.latitude);
      setLng(position.coords.longitude);
    } catch (e) {
      console.error('Location failed:', e);
      alert(t('mobileTimeLocation.locationFailed'));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Write timezone config
      const selectedTz = timezones.find(t => t.value === timezone);
      if (selectedTz) {
        const tzConfig: TimezoneConfigData = {
          utc_offset_minutes: selectedTz.offsetNum,
          dst_enabled: false,
          dst_start_month: 3,
          dst_start_week: 2,
          dst_start_dow: 0,
          dst_end_month: 11,
          dst_end_week: 1,
          dst_end_dow: 0,
          dst_offset_minutes: 60,
        };
        await bleService.writeTimezoneConfig(tzConfig);
      }

      // 2. Write location to Channel 0 as global default
      const ch0 = growingEnv?.get(0);
      if (ch0) {
        const newData: GrowingEnvData = {
          ...ch0,
          latitude_deg: lat
        };
        await bleService.writeGrowingEnvironment(newData);
      }

      history.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      alert(t('mobileTimeLocation.saveFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          {t('mobileTimeLocation.title')}
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Current Time Card */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
          <div className="p-6 flex flex-col items-center">
            <div className="size-20 rounded-full bg-mobile-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-mobile-primary text-4xl">schedule</span>
            </div>
            <p className="text-mobile-text-muted text-sm mb-1">{t('mobileTimeLocation.deviceTime')}</p>
            <p className="text-white text-4xl font-bold tracking-tight">
              {new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <p className="text-mobile-text-muted text-sm mt-1">
              {new Date().toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSyncNow}
          disabled={loading}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">sync</span>
          {loading ? t('mobileTimeLocation.syncing') : t('mobileTimeLocation.syncNow')}
        </button>

        {/* Timezone Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            {t('mobileTimeLocation.timezone')}
          </label>
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark divide-y divide-mobile-border-dark overflow-hidden">
            {timezones.map(tz => (
              <button
                key={tz.value}
                onClick={() => setTimezone(tz.value)}
                className={`w-full flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors ${timezone === tz.value ? 'bg-mobile-primary/10' : ''
                  }`}
              >
                <div>
                  <p className="text-white font-semibold text-left">{tz.label}</p>
                  <p className="text-mobile-text-muted text-sm">
                    {t('mobileTimeLocation.utcOffset').replace('{offset}', tz.offsetDisplay)}
                  </p>
                </div>
                {timezone === tz.value && (
                  <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            {t('mobileTimeLocation.locationCoordinates')}
          </label>
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-mobile-text-muted text-sm">{t('mobileTimeLocation.latitude')}</p>
                <p className="text-white font-semibold">{lat.toFixed(4)} {t('mobileTimeLocation.degrees')}</p>
              </div>
              <div className="text-right">
                <p className="text-mobile-text-muted text-sm">{t('mobileTimeLocation.longitude')}</p>
                <p className="text-white font-semibold">{lng.toFixed(4)} {t('mobileTimeLocation.degrees')}</p>
              </div>
            </div>
            <button
              onClick={handleGetLocation}
              className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">my_location</span>
              {t('mobileTimeLocation.getLocation')}
            </button>
          </div>
          <p className="text-mobile-text-muted text-sm px-1">
            {t('mobileTimeLocation.locationHint')}
          </p>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">save</span>
            {loading ? t('mobileTimeLocation.saving') : t('mobileTimeLocation.saveSettings')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileTimeLocation;

