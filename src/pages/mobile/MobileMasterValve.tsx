import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';

const MobileMasterValve: React.FC = () => {
  const history = useHistory();
  const { systemConfig, connectionState } = useAppStore();
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
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
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
        <div className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark">
          <div className="flex items-center gap-4">
            <div className={`size-14 rounded-full flex items-center justify-center ${masterValveEnabled ? 'bg-mobile-primary/10 text-mobile-primary' : 'bg-white/5 text-mobile-text-muted'
              }`}>
              <span className="material-symbols-outlined text-3xl">valve</span>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{t('mobileMasterValve.title')}</p>
              <p className="text-mobile-text-muted text-sm px-1">{t('mobileMasterValve.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setMasterValveEnabled(!masterValveEnabled)}
            className={`w-14 h-8 rounded-full transition-colors relative ${masterValveEnabled ? 'bg-mobile-primary' : 'bg-white/20'
              }`}
          >
            <div className={`absolute top-1.5 size-5 rounded-full bg-white shadow-md transition-transform ${masterValveEnabled ? 'translate-x-7' : 'translate-x-1.5'
              }`} />
          </button>
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
                className="w-full h-8 bg-transparent cursor-pointer touch-none"
                style={{
                  WebkitAppearance: 'none',
                  background: `linear-gradient(to right, #13ec37 0%, #13ec37 ${(delayBefore / 60) * 100}%, rgba(255,255,255,0.1) ${(delayBefore / 60) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  borderRadius: '10px',
                  height: '6px'
                }}
              />
              <style>{`
                input[type=range]::-webkit-slider-thumb {
                  -webkit-appearance: none;
                  height: 24px;
                  width: 24px;
                  border-radius: 50%;
                  background: #ffffff;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                  margin-top: -9px;
                }
                input[type=range]::-moz-range-thumb {
                  height: 24px;
                  width: 24px;
                  border: none;
                  border-radius: 50%;
                  background: #ffffff;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
              `}</style>
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
                className="w-full h-8 bg-transparent cursor-pointer touch-none"
                style={{
                  WebkitAppearance: 'none',
                  background: `linear-gradient(to right, #13ec37 0%, #13ec37 ${(delayAfter / 60) * 100}%, rgba(255,255,255,0.1) ${(delayAfter / 60) * 100}%, rgba(255,255,255,0.1) 100%)`,
                  borderRadius: '10px',
                  height: '6px'
                }}
              />
              <p className="text-mobile-text-muted text-sm px-1">
                {t('mobileMasterValve.delayAfterHint')
                  .replace('{seconds}', delayAfter.toString())
                  .replace('{unit}', t('common.secondsShort'))}
              </p>
            </div>

            {/* Timing Diagram */}
            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6 mt-6">
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={handleSave}
          disabled={saving || !systemConfig}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale"
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

