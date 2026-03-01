import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import type { RainConfigData } from '../../types/firmware_structs';
import InlineSwitch from '../../components/mobile/InlineSwitch';

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
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
  const didInitialRefreshRef = useRef(false);

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
    if (didInitialRefreshRef.current) return;
    didInitialRefreshRef.current = true;
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
        mm_per_pulse: roundTo(clamp(form.mm_per_pulse, 0.1, 10.0), 3),
        debounce_ms: clampInt(form.debounce_ms, 10, 1000),
        // Keep the other fields in range even if not visible.
        rain_sensitivity_pct: roundTo(clamp(form.rain_sensitivity_pct, 0, 100), 1),
        skip_threshold_mm: roundTo(clamp(form.skip_threshold_mm, 0, 100), 1),
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
      <div className="mobile-page-header">
        <button
          onClick={() => history.goBack()}
          className="mobile-header-icon-btn"
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
          className="mobile-header-icon-btn"
          aria-label={t('common.refresh')}
        >
          <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>refresh</span>
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Status */}
        <div className="mobile-card-surface overflow-hidden">
          <div className="p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`mobile-icon-chip mobile-icon-chip-lg ${rainIntegration?.sensor_active ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
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
        <div className="mobile-card-surface flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className={`mobile-icon-chip mobile-icon-chip-lg ${form.sensor_enabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
              <span className="material-symbols-outlined text-3xl">sensors</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileRainSensor.enableTitle')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileRainSensor.enableSubtitle')}</p>
            </div>
          </div>
          <InlineSwitch
            checked={form.sensor_enabled}
            onToggle={() => setForm({ ...form, sensor_enabled: !form.sensor_enabled })}
            label={t('mobileRainSensor.enableTitle')}
          />
        </div>

        {/* Integration Enable */}
        <div className={`mobile-card-surface flex items-center justify-between gap-4 p-5 ${!form.sensor_enabled ? 'opacity-60' : ''}`}>
          <div className="flex items-center gap-4">
            <div className={`mobile-icon-chip mobile-icon-chip-lg ${form.integration_enabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'}`}>
              <span className="material-symbols-outlined text-3xl">auto_awesome</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileRainSensor.integrationTitle')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileRainSensor.integrationSubtitle')}</p>
            </div>
          </div>
          <InlineSwitch
            checked={form.integration_enabled}
            disabled={!form.sensor_enabled}
            onToggle={() => form.sensor_enabled && setForm({ ...form, integration_enabled: !form.integration_enabled })}
            label={t('mobileRainSensor.integrationTitle')}
          />
        </div>

        {/* Calibration */}
        <div className={`mobile-card-surface overflow-hidden ${!form.sensor_enabled ? 'opacity-60' : ''}`}>
          <div className="p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-white font-semibold">{t('mobileRainSensor.calibrationTitle')}</p>
              <p className="text-mobile-text-muted text-sm">{t('mobileRainSensor.calibrationHint')}</p>
            </div>
            <button
              onClick={() => form.sensor_enabled && void handleCalibrate()}
              disabled={!form.sensor_enabled}
              className="mobile-btn-surface h-10 px-4 font-semibold"
            >
              <span className="material-symbols-outlined">tune</span>
              {t('mobileRainSensor.calibrate')}
            </button>
          </div>

          <div className="p-4 border-t border-mobile-border-dark space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="mobile-form-label">
                  {t('mobileRainSensor.mmPerPulse')}
                </label>
                <input
                  type="number"
                  min={0.1}
                  max={10}
                  step={0.1}
                  value={Number.isFinite(form.mm_per_pulse) ? roundTo(form.mm_per_pulse, 3) : 0}
                  onChange={(e) => setForm({ ...form, mm_per_pulse: Number(e.target.value) })}
                  disabled={!form.sensor_enabled}
                  className={`mobile-form-field ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                />
              </div>

              <div className="space-y-1">
                <label className="mobile-form-label">
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
                  className={`mobile-form-field ${!form.sensor_enabled ? 'opacity-50' : ''}`}
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
                      <label className="mobile-form-label">
                        {t('mobileRainSensor.sensitivityPct')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        value={Number.isFinite(form.rain_sensitivity_pct) ? roundTo(form.rain_sensitivity_pct, 1) : 0}
                        onChange={(e) => setForm({ ...form, rain_sensitivity_pct: Number(e.target.value) })}
                        disabled={!form.sensor_enabled}
                        className={`mobile-form-field ${!form.sensor_enabled ? 'opacity-50' : ''}`}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="mobile-form-label">
                        {t('mobileRainSensor.skipThresholdMm')}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={Number.isFinite(form.skip_threshold_mm) ? roundTo(form.skip_threshold_mm, 1) : 0}
                        onChange={(e) => setForm({ ...form, skip_threshold_mm: Number(e.target.value) })}
                        disabled={!form.sensor_enabled}
                        className={`mobile-form-field ${!form.sensor_enabled ? 'opacity-50' : ''}`}
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
        <div className="mobile-bottom-cta-bar">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="mobile-btn-primary h-14 text-lg font-bold"
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
