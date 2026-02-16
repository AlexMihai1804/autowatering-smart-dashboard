import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { GrowingEnvData, TimezoneConfigData } from '../../types/firmware_structs';
import { useI18n } from '../../i18n';
import { readStoredLocation, writeStoredLocation } from '../../services/LocationStorage';

type DstPreset = 'eu' | 'us';

const DST_PRESETS: Record<DstPreset, {
  start: { month: number; week: number; dow: number };
  end: { month: number; week: number; dow: number };
  offsetMinutes: number;
}> = {
  // EU/UK: last Sunday in March -> last Sunday in October, +60 minutes
  eu: {
    start: { month: 3, week: 5, dow: 0 },
    end: { month: 10, week: 5, dow: 0 },
    offsetMinutes: 60
  },
  // US: 2nd Sunday in March -> 1st Sunday in November, +60 minutes
  us: {
    start: { month: 3, week: 2, dow: 0 },
    end: { month: 11, week: 1, dow: 0 },
    offsetMinutes: 60
  },
};

const TIMEZONE_PRESETS: Array<{
  id: string;
  labelKey: string;
  utcOffsetMinutes: number;
  dstPreset: DstPreset;
}> = [
  { id: 'Europe/Bucharest', labelKey: 'mobileTimeLocation.timezones.bucharest', utcOffsetMinutes: 120, dstPreset: 'eu' },
  { id: 'Europe/London', labelKey: 'mobileTimeLocation.timezones.london', utcOffsetMinutes: 0, dstPreset: 'eu' },
  { id: 'Europe/Berlin', labelKey: 'mobileTimeLocation.timezones.berlin', utcOffsetMinutes: 60, dstPreset: 'eu' },
  { id: 'America/New_York', labelKey: 'mobileTimeLocation.timezones.newYork', utcOffsetMinutes: -300, dstPreset: 'us' },
  { id: 'America/Los_Angeles', labelKey: 'mobileTimeLocation.timezones.losAngeles', utcOffsetMinutes: -480, dstPreset: 'us' },
];

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function formatUtcOffsetMinutes(offsetMinutes: number): string {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return `${sign}${hh}:${String(mm).padStart(2, '0')}`;
}

const MobileTimeLocation: React.FC = () => {
  const history = useHistory();
  const { timezoneConfig, growingEnv } = useAppStore();
  const bleService = BleService.getInstance();
  const { t, language } = useI18n();

  const locale = language === 'ro' ? 'ro-RO' : 'en-US';

  const storedLocation = useMemo(() => readStoredLocation(), []);

  const phoneTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return null;
    }
  }, []);

  const phoneUtcOffsetMinutes = useMemo(() => -new Date().getTimezoneOffset(), []);

  const [timezoneId, setTimezoneId] = useState<string>(() => {
    const byName = phoneTimezone
      ? TIMEZONE_PRESETS.find((p) => p.id === phoneTimezone)
      : undefined;
    if (byName) return byName.id;

    const byOffset = TIMEZONE_PRESETS.find((p) => p.utcOffsetMinutes === phoneUtcOffsetMinutes);
    return byOffset?.id ?? TIMEZONE_PRESETS[1]?.id ?? 'Europe/London';
  });

  const [utcOffsetMinutes, setUtcOffsetMinutes] = useState<number>(() => {
    const match = TIMEZONE_PRESETS.find((p) => p.id === timezoneId);
    return match?.utcOffsetMinutes ?? phoneUtcOffsetMinutes;
  });

  const [dstEnabled, setDstEnabled] = useState<boolean>(false);
  const [dstOffsetMinutes, setDstOffsetMinutes] = useState<number>(DST_PRESETS.eu.offsetMinutes);

  const [dstStartMonth, setDstStartMonth] = useState<number>(DST_PRESETS.eu.start.month);
  const [dstStartWeek, setDstStartWeek] = useState<number>(DST_PRESETS.eu.start.week);
  const [dstStartDow, setDstStartDow] = useState<number>(DST_PRESETS.eu.start.dow);

  const [dstEndMonth, setDstEndMonth] = useState<number>(DST_PRESETS.eu.end.month);
  const [dstEndWeek, setDstEndWeek] = useState<number>(DST_PRESETS.eu.end.week);
  const [dstEndDow, setDstEndDow] = useState<number>(DST_PRESETS.eu.end.dow);

  const [lat, setLat] = useState<number>(() => storedLocation?.latitude ?? 44.4268);
  const [lng, setLng] = useState<number>(() => storedLocation?.longitude ?? 26.1025);
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const timezones = useMemo(() => (
    TIMEZONE_PRESETS.map((p) => ({
      ...p,
      label: t(p.labelKey),
      offsetDisplay: formatUtcOffsetMinutes(p.utcOffsetMinutes)
    }))
  ), [t]);

  const showToast = async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch (e) {
      console.warn('[MobileTimeLocation] Toast unavailable:', e);
    }
  };

  useEffect(() => {
    // Always refresh from device on screen open (source-of-truth rule).
    void bleService.readTimezoneConfig().catch((e) => {
      console.warn('[MobileTimeLocation] Failed to read timezone config:', e);
    });
    void bleService.readGrowingEnvironment(0).catch((e) => {
      console.warn('[MobileTimeLocation] Failed to read channel 0 growing env:', e);
    });
  }, [bleService]);

  useEffect(() => {
    if (!timezoneConfig) return;

    setUtcOffsetMinutes(timezoneConfig.utc_offset_minutes);

    const matchedPreset = TIMEZONE_PRESETS.find((p) => p.utcOffsetMinutes === timezoneConfig.utc_offset_minutes);
    setTimezoneId(matchedPreset ? matchedPreset.id : 'custom');

    setDstEnabled(timezoneConfig.dst_enabled);

    if (timezoneConfig.dst_enabled) {
      setDstStartMonth(timezoneConfig.dst_start_month);
      setDstStartWeek(timezoneConfig.dst_start_week);
      setDstStartDow(timezoneConfig.dst_start_dow);
      setDstEndMonth(timezoneConfig.dst_end_month);
      setDstEndWeek(timezoneConfig.dst_end_week);
      setDstEndDow(timezoneConfig.dst_end_dow);
      setDstOffsetMinutes(timezoneConfig.dst_offset_minutes);
      return;
    }

    // DST disabled: firmware clears fields. Prefill rule fields for a good "toggle on" experience.
    const inferred = matchedPreset?.dstPreset ?? 'eu';
    const rule = DST_PRESETS[inferred];
    setDstStartMonth(rule.start.month);
    setDstStartWeek(rule.start.week);
    setDstStartDow(rule.start.dow);
    setDstEndMonth(rule.end.month);
    setDstEndWeek(rule.end.week);
    setDstEndDow(rule.end.dow);
    setDstOffsetMinutes(rule.offsetMinutes);
  }, [timezoneConfig]);

  useEffect(() => {
    // Location: latitude is stored on channel 0 (firmware), longitude is app-only.
    const ch0 = growingEnv?.get(0);
    if (ch0) setLat(ch0.latitude_deg);
  }, [growingEnv]);

  const selectTimezonePreset = (id: string) => {
    setTimezoneId(id);
    const preset = TIMEZONE_PRESETS.find((p) => p.id === id);
    if (!preset) return;

    setUtcOffsetMinutes(preset.utcOffsetMinutes);
    const rule = DST_PRESETS[preset.dstPreset];
    setDstStartMonth(rule.start.month);
    setDstStartWeek(rule.start.week);
    setDstStartDow(rule.start.dow);
    setDstEndMonth(rule.end.month);
    setDstEndWeek(rule.end.week);
    setDstEndDow(rule.end.dow);
    setDstOffsetMinutes(rule.offsetMinutes);
  };

  const describeDstRule = () => {
    const weekLabel = (week: number) => week === 5
      ? t('mobileTimeLocation.dst.weekLast')
      : t('mobileTimeLocation.dst.weekNth').replace('{n}', String(week));

    const dowLabel = (dow: number) => {
      // 0=Sunday...6=Saturday
      const base = new Date(Date.UTC(2026, 0, 4)); // Sunday
      const d = new Date(base.getTime() + dow * 24 * 3600 * 1000);
      return d.toLocaleDateString(locale, { weekday: 'long' });
    };

    const monthLabel = (month: number) => {
      const d = new Date(Date.UTC(2026, Math.max(0, Math.min(11, month - 1)), 1));
      return d.toLocaleDateString(locale, { month: 'long' });
    };

    const offsetLabel = `${dstOffsetMinutes >= 0 ? '+' : ''}${dstOffsetMinutes}`;

    return t('mobileTimeLocation.dst.summary')
      .replace('{startWeek}', weekLabel(dstStartWeek))
      .replace('{startDow}', dowLabel(dstStartDow))
      .replace('{startMonth}', monthLabel(dstStartMonth))
      .replace('{endWeek}', weekLabel(dstEndWeek))
      .replace('{endDow}', dowLabel(dstEndDow))
      .replace('{endMonth}', monthLabel(dstEndMonth))
      .replace('{offset}', offsetLabel);
  };

  const handleSyncNow = async () => {
    setLoading(true);
    try {
      await bleService.syncDeviceTime();
      await showToast(t('mobileTimeLocation.syncSuccess'));
    } catch (e) {
      console.error('Sync failed:', e);
      await showToast(t('mobileTimeLocation.syncFailed'));
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
      writeStoredLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: 'gps',
        accuracy: position.coords.accuracy
      });
    } catch (e) {
      console.error('Location failed:', e);
      await showToast(t('mobileTimeLocation.locationFailed'));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // 1. Write timezone config
      const tzConfig: TimezoneConfigData = {
        utc_offset_minutes: clampInt(utcOffsetMinutes, -720, 840),
        dst_enabled: dstEnabled,
        dst_start_month: dstEnabled ? clampInt(dstStartMonth, 1, 12) : 0,
        dst_start_week: dstEnabled ? clampInt(dstStartWeek, 1, 5) : 0,
        dst_start_dow: dstEnabled ? clampInt(dstStartDow, 0, 6) : 0,
        dst_end_month: dstEnabled ? clampInt(dstEndMonth, 1, 12) : 0,
        dst_end_week: dstEnabled ? clampInt(dstEndWeek, 1, 5) : 0,
        dst_end_dow: dstEnabled ? clampInt(dstEndDow, 0, 6) : 0,
        dst_offset_minutes: dstEnabled ? clampInt(dstOffsetMinutes, -120, 120) : 0,
      };
      await bleService.writeTimezoneConfig(tzConfig);
      await bleService.readTimezoneConfig(); // confirm + update store

      // 2. Write location to Channel 0 as global default
      const ch0 = growingEnv?.get(0) ?? await bleService.readGrowingEnvironment(0);
      const newData: GrowingEnvData = {
        ...ch0,
        latitude_deg: lat
      };
      await bleService.writeGrowingEnvironment(newData);

      writeStoredLocation({ latitude: lat, longitude: lng, source: 'manual' });
      await showToast(t('mobileTimeLocation.saveSuccess'));
      history.goBack();
    } catch (e) {
      console.error('Save failed:', e);
      await showToast(t('mobileTimeLocation.saveFailed'));
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
        <button
          onClick={() => {
            void bleService.readTimezoneConfig().catch(console.error);
            void bleService.readGrowingEnvironment(0).catch(console.error);
          }}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('common.refresh')}
        >
          <span className="material-symbols-outlined">refresh</span>
        </button>
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
            {timezones.map((tz) => (
              <button
                key={tz.id}
                onClick={() => selectTimezonePreset(tz.id)}
                className={`w-full flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors ${timezoneId === tz.id ? 'bg-mobile-primary/10' : ''
                  }`}
              >
                <div>
                  <p className="text-white font-semibold text-left">{tz.label}</p>
                  <p className="text-mobile-text-muted text-sm">
                    {t('mobileTimeLocation.utcOffset').replace('{offset}', tz.offsetDisplay)}
                  </p>
                </div>
                {timezoneId === tz.id && (
                  <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setTimezoneId('custom')}
              className={`w-full flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors ${timezoneId === 'custom' ? 'bg-mobile-primary/10' : ''
                }`}
            >
              <div>
                <p className="text-white font-semibold text-left">{t('mobileTimeLocation.timezones.custom')}</p>
                <p className="text-mobile-text-muted text-sm">
                  {t('mobileTimeLocation.utcOffset').replace('{offset}', formatUtcOffsetMinutes(utcOffsetMinutes))}
                </p>
              </div>
              {timezoneId === 'custom' && (
                <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
              )}
            </button>
          </div>
        </div>

        {/* DST */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            {t('mobileTimeLocation.dst.sectionTitle')}
          </label>

          <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark">
            <div className="flex items-center gap-4">
              <div className={`size-14 rounded-full flex items-center justify-center ${dstEnabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">schedule</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg">{t('mobileTimeLocation.dst.toggleTitle')}</p>
                <p className="text-mobile-text-muted text-sm px-1">
                  {dstEnabled ? describeDstRule() : t('mobileTimeLocation.dst.disabledHint')}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const next = !dstEnabled;
                setDstEnabled(next);
                if (next) {
                  // If turning on while fields are empty (common after a device read with DST off),
                  // seed from the selected preset to avoid invalid writes.
                  const inferred = TIMEZONE_PRESETS.find((p) => p.id === timezoneId)?.dstPreset;
                  const rule = DST_PRESETS[inferred ?? 'eu'];
                  setDstStartMonth(rule.start.month);
                  setDstStartWeek(rule.start.week);
                  setDstStartDow(rule.start.dow);
                  setDstEndMonth(rule.end.month);
                  setDstEndWeek(rule.end.week);
                  setDstEndDow(rule.end.dow);
                  setDstOffsetMinutes(rule.offsetMinutes);
                }
              }}
              className={`w-14 h-8 rounded-full transition-colors relative ${dstEnabled ? 'bg-mobile-primary' : 'bg-white/20'
                }`}
              aria-label={t('mobileTimeLocation.dst.toggleTitle')}
            >
              <div className={`absolute top-1.5 size-5 rounded-full bg-white shadow-md transition-transform ${dstEnabled ? 'translate-x-7' : 'translate-x-1.5'
                }`}
              />
            </button>
          </div>

          {/* Advanced DST / Offset */}
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-mobile-text-muted">tune</span>
                <div className="flex flex-col items-start">
                  <span className="text-base font-semibold text-white">{t('mobileTimeLocation.advancedTitle')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('mobileTimeLocation.advancedSubtitle')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted">
                {advancedOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {advancedOpen && (
              <div className="p-4 border-t border-mobile-border-dark space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                      {t('mobileTimeLocation.advanced.utcOffsetMinutes')}
                    </label>
                    <input
                      type="number"
                      min={-720}
                      max={840}
                      step={15}
                      value={utcOffsetMinutes}
                      onChange={(e) => setUtcOffsetMinutes(Number(e.target.value))}
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                      {t('mobileTimeLocation.advanced.dstOffsetMinutes')}
                    </label>
                    <input
                      type="number"
                      min={-120}
                      max={120}
                      step={15}
                      value={dstOffsetMinutes}
                      onChange={(e) => setDstOffsetMinutes(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''
                        }`}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted px-1">
                    {t('mobileTimeLocation.advanced.dstStart')}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={dstStartMonth}
                      onChange={(e) => setDstStartMonth(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const month = idx + 1;
                        const d = new Date(Date.UTC(2026, idx, 1));
                        return (
                          <option key={month} value={month}>
                            {d.toLocaleDateString(locale, { month: 'short' })}
                          </option>
                        );
                      })}
                    </select>

                    <select
                      value={dstStartWeek}
                      onChange={(e) => setDstStartWeek(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>
                          {w === 5 ? t('mobileTimeLocation.dst.weekLast') : t('mobileTimeLocation.dst.weekNth').replace('{n}', String(w))}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dstStartDow}
                      onChange={(e) => setDstStartDow(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const base = new Date(Date.UTC(2026, 0, 4)); // Sunday
                        const d = new Date(base.getTime() + idx * 24 * 3600 * 1000);
                        return (
                          <option key={idx} value={idx}>
                            {d.toLocaleDateString(locale, { weekday: 'short' })}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted px-1">
                    {t('mobileTimeLocation.advanced.dstEnd')}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    <select
                      value={dstEndMonth}
                      onChange={(e) => setDstEndMonth(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const month = idx + 1;
                        const d = new Date(Date.UTC(2026, idx, 1));
                        return (
                          <option key={month} value={month}>
                            {d.toLocaleDateString(locale, { month: 'short' })}
                          </option>
                        );
                      })}
                    </select>

                    <select
                      value={dstEndWeek}
                      onChange={(e) => setDstEndWeek(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {[1, 2, 3, 4, 5].map((w) => (
                        <option key={w} value={w}>
                          {w === 5 ? t('mobileTimeLocation.dst.weekLast') : t('mobileTimeLocation.dst.weekNth').replace('{n}', String(w))}
                        </option>
                      ))}
                    </select>

                    <select
                      value={dstEndDow}
                      onChange={(e) => setDstEndDow(Number(e.target.value))}
                      disabled={!dstEnabled}
                      className={`h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!dstEnabled ? 'opacity-50' : ''}`}
                    >
                      {Array.from({ length: 7 }).map((_, idx) => {
                        const base = new Date(Date.UTC(2026, 0, 4)); // Sunday
                        const d = new Date(base.getTime() + idx * 24 * 3600 * 1000);
                        return (
                          <option key={idx} value={idx}>
                            {d.toLocaleDateString(locale, { weekday: 'short' })}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            )}
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

