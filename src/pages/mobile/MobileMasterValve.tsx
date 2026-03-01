import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';
import InlineSwitch from '../../components/mobile/InlineSwitch';

const MobileMasterValve: React.FC = () => {
  const history = useHistory();
  const { systemConfig } = useAppStore();
  const bleService = BleService.getInstance();
  const { t } = useI18n();

  // Local state for form editing
  const [masterValveEnabled, setMasterValveEnabled] = useState(false);
  const [delayBefore, setDelayBefore] = useState(0);
  const [delayAfter, setDelayAfter] = useState(0);
  const [saving, setSaving] = useState(false);

  // Initialize form from store
  useEffect(() => {
    if (systemConfig?.master_valve) {
      const mv = systemConfig.master_valve;
      setMasterValveEnabled(mv.enabled);
      setDelayBefore(Math.max(0, mv.pre_delay));
      setDelayAfter(Math.max(0, mv.post_delay));
    }
  }, [systemConfig]);

  const handleSave = async () => {
    if (!systemConfig || saving) return;
    setSaving(true);
    try {
      const newMv = {
        ...systemConfig.master_valve,
        enabled: masterValveEnabled,
        pre_delay: delayBefore,
        post_delay: delayAfter,
        overlap_grace: systemConfig.master_valve.overlap_grace,
        auto_management: systemConfig.master_valve.auto_management,
      };

      const fullConfig = {
        ...systemConfig,
        master_valve: newMv,
      };

      await bleService.writeSystemConfigObject(fullConfig);

      // Re-read to confirm
      await bleService.readSystemConfig();

      history.goBack();
    } catch (e) {
      console.error('Failed to save master valve config:', e);
      alert(t('mobileMasterValve.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-32">
      {/* Header */}
      <div className="mobile-page-header">
        <button
          onClick={() => history.goBack()}
          className="mobile-header-icon-btn"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          {t('mobileMasterValve.title')}
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Enable Toggle */}
        <div className="mobile-card-surface flex items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-4">
            <div className={`mobile-icon-chip mobile-icon-chip-lg ${masterValveEnabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
              }`}>
              <span className="material-symbols-outlined text-3xl">valve</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileMasterValve.title')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileMasterValve.subtitle')}</p>
            </div>
          </div>
          <InlineSwitch
            checked={masterValveEnabled}
            onToggle={() => setMasterValveEnabled(!masterValveEnabled)}
            label={t('mobileMasterValve.title')}
          />
        </div>

        {/* Configuration Section - Only visible when enabled */}
        {masterValveEnabled && (
          <div className="animate-in fade-in slide-in-from-top-4 duration-300 space-y-6">

            {/* Delay Before */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                  {t('mobileMasterValve.delayBefore')}
                </label>
                <span className="text-mobile-primary font-bold text-xl">{delayBefore}{t('common.secondsShort')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={delayBefore}
                onChange={(e) => setDelayBefore(Number(e.target.value))}
                className="mobile-range-slider w-full touch-none"
                style={{
                  ['--mobile-range-pct' as any]: `${(delayBefore / 60) * 100}%`,
                }}
              />
              <p className="text-mobile-text-muted text-sm px-1">
                {t('mobileMasterValve.delayBeforeHint')
                  .replace('{seconds}', delayBefore.toString())
                  .replace('{unit}', t('common.secondsShort'))}
              </p>
            </div>

            {/* Delay After */}
            <div className="space-y-4 border-t border-white/5 pt-6">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                  {t('mobileMasterValve.delayAfter')}
                </label>
                <span className="text-mobile-primary font-bold text-xl">{delayAfter}{t('common.secondsShort')}</span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="1"
                value={delayAfter}
                onChange={(e) => setDelayAfter(Number(e.target.value))}
                className="mobile-range-slider w-full touch-none"
                style={{
                  ['--mobile-range-pct' as any]: `${(delayAfter / 60) * 100}%`,
                }}
              />
              <p className="text-mobile-text-muted text-sm px-1">
                {t('mobileMasterValve.delayAfterHint')
                  .replace('{seconds}', delayAfter.toString())
                  .replace('{unit}', t('common.secondsShort'))}
              </p>
            </div>

            {/* Timing Diagram */}
            <div className="mobile-card-surface p-6 mt-6">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-mobile-primary">schedule</span>
                {t('mobileMasterValve.timingVisualization')}
              </h4>
              <div className="relative h-28 bg-black/40 rounded-xl p-4 overflow-hidden border border-white/5">
                {/* Zones line */}
                <div className="absolute top-6 left-4 right-4 flex items-center">
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0 font-bold uppercase tracking-wider">{t('zones.zones')}</span>
                  <div className="flex-1 h-2 relative bg-white/5 rounded-full">
                    {/* Zone Active Block */}
                    <div className="absolute left-[25%] right-[25%] h-full bg-blue-500 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                    </div>
                    {/* Tick marks */}
                    <div className="absolute left-[25%] -top-3 bottom-0 w-px bg-white/20"></div>
                    <div className="absolute right-[25%] -top-3 bottom-0 w-px bg-white/20"></div>
                  </div>
                </div>

                {/* Master valve line */}
                <div className="absolute bottom-6 left-4 right-4 flex items-center">
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0 font-bold uppercase tracking-wider">{t('mobileMasterValve.masterLabel')}</span>
                  <div className="flex-1 h-2 relative bg-white/5 rounded-full">
                    {/* Master Active Block */}
                    <div
                      className="absolute h-full bg-mobile-primary rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(19,236,55,0.4)]"
                      style={{
                        left: `calc(25% - ${Math.min(20, delayBefore * 1)}%)`,
                        right: `calc(25% - ${Math.min(20, delayAfter * 1)}%)`
                      }}
                    >
                    </div>
                  </div>
                </div>

                {/* Connecting lines/indicators could go here */}
            </div>
            <p className="text-center text-xs text-mobile-text-muted mt-3">
              {t('mobileMasterValve.timingHint')}
            </p>
          </div>
        </div>
      )}

      </div>

      {/* Save Button */}
      <div className="mobile-bottom-cta-bar">
        <button
          onClick={handleSave}
          disabled={saving || !systemConfig}
          className="mobile-btn-primary h-14 text-lg font-bold disabled:grayscale"
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t('mobileMasterValve.saving')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              {t('mobileMasterValve.save')}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileMasterValve;

