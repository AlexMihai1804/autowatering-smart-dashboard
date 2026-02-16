import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { RainConfigData } from '../../types/firmware_structs';

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

const DEFAULT_CONFIG: RainConfigData = {
  mm_per_pulse: 0.2,
  debounce_ms: 100,
  sensor_enabled: true,
  integration_enabled: true,
  rain_sensitivity_pct: 50,
  skip_threshold_mm: 0,
};

const MobileRainSensor: React.FC = () => {
  const history = useHistory();
  const { t, language } = useI18n();
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';
  const bleService = BleService.getInstance();
  const { rainConfig, rainIntegration } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<RainConfigData>(rainConfig ?? DEFAULT_CONFIG);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const showToast = async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch (e) {
      console.warn('[MobileRainSensor] Toast unavailable:', e);
    }
  };

  const refreshFromDevice = async () => {
    setLoading(true);
    try {
      await Promise.all([
        bleService.readRainConfig(),
        bleService.readRainIntegrationStatus(),
      ]);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      console.error('[MobileRainSensor] Failed to refresh:', e);
      await showToast(t('mobileRainSensor.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshFromDevice();
  }, []);

  useEffect(() => {
    if (rainConfig) setForm(rainConfig);
  }, [rainConfig]);

  const lastPulseLabel = useMemo(() => {
    const ts = rainIntegration?.last_pulse_time ?? 0;
    if (!ts) return t('mobileRainSensor.never');
    return new Date(ts * 1000).toLocaleString(locale, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }, [rainIntegration?.last_pulse_time, locale, t]);

  const updatedMinutesAgo = useMemo(() => {
    if (!lastUpdatedAt) return null;
    const mins = Math.max(0, Math.floor((Date.now() - lastUpdatedAt) / 60000));
    return t('mobileRainSensor.updated').replace('{minutes}', String(mins));
  }, [lastUpdatedAt, t]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const next: RainConfigData = {
        ...form,
        mm_per_pulse: clamp(form.mm_per_pulse, 0.1, 10.0),
        debounce_ms: clampInt(form.debounce_ms, 10, 1000),
        // Keep the other fields in range even if not visible.
        rain_sensitivity_pct: clamp(form.rain_sensitivity_pct, 0, 100),
        skip_threshold_mm: clamp(form.skip_threshold_mm, 0, 100),
      };

      await bleService.writeRainConfig(next);
      await Promise.all([
        bleService.readRainConfig(),
        bleService.readRainIntegrationStatus(),
      ]);

      await showToast(t('mobileRainSensor.saveSuccess'));
      history.goBack();
    } catch (e) {
      console.error('[MobileRainSensor] Save failed:', e);
      await showToast(t('mobileRainSensor.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCalibrate = async () => {
    try {
      await bleService.calibrateRainSensor();
      await showToast(t('mobileRainSensor.calibrationRequested'));
    } catch (e) {
      console.error('[MobileRainSensor] Calibration failed:', e);
      await showToast(t('mobileRainSensor.calibrationFailed'));
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-28">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <div className="flex-1 text-center">
          <h2 className="text-white text-lg font-bold leading-tight">{t('mobileRainSensor.title')}</h2>
          {updatedMinutesAgo && (
            <p className="text-mobile-text-muted text-xs mt-0.5">{updatedMinutesAgo}</p>
          )}
        </div>
        <button
          onClick={() => void refreshFromDevice()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          aria-label={t('common.refresh')}
        >
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Status */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`size-14 rounded-full flex items-center justify-center ${rainIntegration?.sensor_active ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
                <span className="material-symbols-outlined text-3xl">rainy</span>
              </div>
              <div>
                <p className="text-white font-bold text-lg">{t('mobileRainSensor.statusTitle')}</p>
                <p className="text-mobile-text-muted text-sm px-1">
                  {rainIntegration?.sensor_active ? t('mobileRainSensor.sensorActive') : t('mobileRainSensor.sensorInactive')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-mobile-text-muted text-xs">{t('mobileRainSensor.lastPulse')}</p>
              <p className="text-white font-semibold text-sm">{lastPulseLabel}</p>
            </div>
          </div>

          {rainIntegration && (
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-mobile-text-muted text-xs">{t('mobileRainSensor.rainLast24h')}</p>
                <p className="text-white font-bold text-lg">
                  {rainIntegration.rainfall_last_24h.toFixed(1)} <span className="text-mobile-text-muted text-sm">{t('common.mm')}</span>
                </p>
              </div>
              <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                <p className="text-mobile-text-muted text-xs">{t('mobileRainSensor.rainLastHour')}</p>
                <p className="text-white font-bold text-lg">
                  {rainIntegration.rainfall_last_hour.toFixed(1)} <span className="text-mobile-text-muted text-sm">{t('common.mm')}</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sensor Enable */}
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark">
          <div className="flex items-center gap-4">
            <div className={`size-14 rounded-full flex items-center justify-center ${form.sensor_enabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
              <span className="material-symbols-outlined text-3xl">sensors</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileRainSensor.enableTitle')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileRainSensor.enableSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setForm({ ...form, sensor_enabled: !form.sensor_enabled })}
            className={`w-14 h-8 rounded-full transition-colors relative ${form.sensor_enabled ? 'bg-mobile-primary' : 'bg-white/20'}`}
            aria-label={t('mobileRainSensor.enableTitle')}
          >
            <div className={`absolute top-1.5 size-5 rounded-full bg-white shadow-md transition-transform ${form.sensor_enabled ? 'translate-x-7' : 'translate-x-1.5'}`} />
          </button>
        </div>

        {/* Integration Enable */}
        <div className={`flex items-center justify-between gap-4 p-5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark ${!form.sensor_enabled ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`size-14 rounded-full flex items-center justify-center ${form.integration_enabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
              <span className="material-symbols-outlined text-3xl">auto_awesome</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileRainSensor.integrationTitle')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileRainSensor.integrationSubtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => form.sensor_enabled && setForm({ ...form, integration_enabled: !form.integration_enabled })}
            disabled={!form.sensor_enabled}
            className={`w-14 h-8 rounded-full transition-colors relative ${form.integration_enabled ? 'bg-mobile-primary' : 'bg-white/20'}`}
            aria-label={t('mobileRainSensor.integrationTitle')}
          >
            <div className={`absolute top-1.5 size-5 rounded-full bg-white shadow-md transition-transform ${form.integration_enabled ? 'translate-x-7' : 'translate-x-1.5'}`} />
          </button>
        </div>

        {/* Calibration */}
        <div className={`rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden ${!form.sensor_enabled ? 'opacity-60' : ''}`}>
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-semibold">{t('mobileRainSensor.calibrationTitle')}</p>
              <p className="text-mobile-text-muted text-sm">{t('mobileRainSensor.calibrationHint')}</p>
            </div>
            <button
              onClick={() => form.sensor_enabled && void handleCalibrate()}
              disabled={!form.sensor_enabled}
              className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined">tune</span>
              {t('mobileRainSensor.calibrate')}
            </button>
          </div>

          <div className="p-4 border-t border-mobile-border-dark space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                  {t('mobileRainSensor.mmPerPulse')}
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={Number.isFinite(form.mm_per_pulse) ? form.mm_per_pulse : 0}
                  onChange={(e) => setForm({ ...form, mm_per_pulse: Number(e.target.value) })}
                  disabled={!form.sensor_enabled}
                  className={`w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                  {t('mobileRainSensor.debounceMs')}
                </label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  step={10}
                  value={Number.isFinite(form.debounce_ms) ? form.debounce_ms : 0}
                  onChange={(e) => setForm({ ...form, debounce_ms: Number(e.target.value) })}
                  disabled={!form.sensor_enabled}
                  className={`w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                />
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between"
              >
                <span className="text-white font-semibold">{t('mobileRainSensor.advancedTitle')}</span>
                <span className="material-symbols-outlined text-mobile-text-muted">
                  {advancedOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {advancedOpen && (
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                        {t('mobileRainSensor.sensitivityPct')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Number.isFinite(form.rain_sensitivity_pct) ? form.rain_sensitivity_pct : 0}
                        onChange={(e) => setForm({ ...form, rain_sensitivity_pct: Number(e.target.value) })}
                        disabled={!form.sensor_enabled}
                        className={`w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
                        {t('mobileRainSensor.skipThresholdMm')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number.isFinite(form.skip_threshold_mm) ? form.skip_threshold_mm : 0}
                        onChange={(e) => setForm({ ...form, skip_threshold_mm: Number(e.target.value) })}
                        disabled={!form.sensor_enabled}
                        className={`w-full h-12 rounded-xl bg-white/5 border border-white/10 px-3 text-white ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                      />
                    </div>
                  </div>
                  <p className="text-mobile-text-muted text-sm">
                    {t('mobileRainSensor.advancedHint')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">save</span>
            {saving ? t('mobileRainSensor.saving') : t('mobileRainSensor.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileRainSensor;

