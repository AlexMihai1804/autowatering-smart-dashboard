import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';

const MobileMasterValve: React.FC = () => {
  const history = useHistory();
  const { systemConfig, connectionState } = useAppStore();
  const bleService = BleService.getInstance();

  // Local state for form editing
  const [masterValveEnabled, setMasterValveEnabled] = useState(false);
  const [valveType, setValveType] = useState<'normally_closed' | 'normally_open'>('normally_closed');
  const [delayBefore, setDelayBefore] = useState(0);
  const [delayAfter, setDelayAfter] = useState(0);
  const [saving, setSaving] = useState(false);

  // Initialize form from store
  useEffect(() => {
    if (systemConfig?.master_valve) {
      const mv = systemConfig.master_valve;
      // Note: firmware stores delays as int16, we map them to seconds (0-10 or more)
      setMasterValveEnabled(mv.enabled);
      setDelayBefore(Math.max(0, mv.pre_delay));
      setDelayAfter(Math.max(0, mv.post_delay));
      // Assuming 'overlap_grace' or other field might indicate type, 
      // but current UI only toggles delay? 
      // Firmware struct doesn't explicitly have "normally_open/closed" flag in the View we saw earlier?
      // Let's check firmware_structs.ts or bleService.ts View again.
      // View byte 14 is auto_management.
      // There is no explicit "valve type" (NC/NO) in the struct shown in BleService.ts!
      // Maybe it's implied or not configurable? 
      // Or maybe it's `current_state` logic?
      // The mock UI had it. If firmware doesn't support it, we might need to hide it or implement it if possible.
      // For now, let's keep it as separate state but maybe it doesn't do anything if not in struct?
      // Wait, let's just stick to what is in SystemConfigData.
      // SystemConfigData master_valve: enabled, pre_delay, post_delay, overlap_grace, auto_management.
      // No NO/NC. So we should probably remove "Valve Type" if it's not supported, or map it if it corresponds to something.
      // Users might want NO/NC for electrical reasons. If firmware is hardcoded for NC (standard), we should maybe hide it or add a note.
      // For this implementation, I will hide "Valve Type" if not supported by struct, to avoid misleading UI.
      // Re-reading struct: `overlap_grace`? `auto_management`?
      // I'll leave Valve Type out for now or keep it mock if user really wants it, but I should probably follow the "Wiring" rule: connect real features.
      // Since it's missing in firmware struct, I will Remove it to be honest.
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
        // Preserve other fields
        overlap_grace: systemConfig.master_valve.overlap_grace,
        auto_management: systemConfig.master_valve.auto_management,
      };

      // Merge with full config to prevent resetting other fields
      // BleService.writeSystemConfigObject handles the merge if we pass the full object?
      // No, we must construct the object carefully. 
      // Actually writeSystemConfigObject makes a new buffer and uses "config.field ?? default".
      // So we must pass ALL fields from existing config.

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
      alert('Failed to save configuration.');
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
          Master Valve
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
              <p className="text-white font-bold text-lg">Master Valve</p>
              <p className="text-mobile-text-muted text-sm px-1">Main water supply control</p>
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
                  Delay Before Start
                </label>
                <span className="text-mobile-primary font-bold text-xl">{delayBefore}s</span>
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
                Master valve opens <strong>{delayBefore}s</strong> before any zone starts.
              </p>
            </div>

            {/* Delay After */}
            <div className="space-y-4 border-t border-white/5 pt-6">
              <div className="flex items-center justify-between px-1">
                <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
                  Delay After Stop
                </label>
                <span className="text-mobile-primary font-bold text-xl">{delayAfter}s</span>
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
                Master valve stays open for <strong>{delayAfter}s</strong> after zone stops.
              </p>
            </div>

            {/* Timing Diagram */}
            <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6 mt-6">
              <h4 className="text-white font-bold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-mobile-primary">schedule</span>
                Timing Visualization
              </h4>
              <div className="relative h-28 bg-black/40 rounded-xl p-4 overflow-hidden border border-white/5">
                {/* Zones line */}
                <div className="absolute top-6 left-4 right-4 flex items-center">
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0 font-bold uppercase tracking-wider">Zones</span>
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
                  <span className="text-xs text-mobile-text-muted w-16 shrink-0 font-bold uppercase tracking-wider">Master</span>
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
                Prevents water hammer and ensures pressure stability.
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
            <span className="animate-spin text-2xl">⟳</span>
          ) : (
            <>
              <span className="material-symbols-outlined">save</span>
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MobileMasterValve;
