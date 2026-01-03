import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';

type PowerMode = 'performance' | 'balanced' | 'eco';

const MobilePowerMode: React.FC = () => {
  const history = useHistory();
  const { systemConfig, diagnosticsData } = useAppStore();
  const bleService = BleService.getInstance();
  const { t } = useI18n();
  const percentUnit = t('common.percent');

  const [selectedMode, setSelectedMode] = useState<PowerMode>('balanced');
  const [saving, setSaving] = useState(false);

  // Initialize from store
  useEffect(() => {
    if (systemConfig) {
      // 0=Normal, 1=Energy-Saving, 2=Ultra-Low
      const modeMap: Record<number, PowerMode> = {
        0: 'performance',
        1: 'balanced',
        2: 'eco'
      };
      setSelectedMode(modeMap[systemConfig.power_mode] || 'balanced');
    }
  }, [systemConfig]);

  const powerModes = [
    {
      id: 'performance' as PowerMode,
      val: 0,
      name: t('mobilePowerMode.modes.performance.name'),
      icon: 'bolt',
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
      description: t('mobilePowerMode.modes.performance.description'),
      battery: '~2 weeks',
      features: [
        t('mobilePowerMode.modes.performance.features.update15'),
        t('mobilePowerMode.modes.performance.features.bleInstant'),
        t('mobilePowerMode.modes.performance.features.fullLogging'),
      ],
    },
    {
      id: 'balanced' as PowerMode,
      val: 1,
      name: t('mobilePowerMode.modes.balanced.name'),
      icon: 'balance',
      iconBg: 'bg-mobile-primary/20',
      iconColor: 'text-mobile-primary',
      description: t('mobilePowerMode.modes.balanced.description'),
      battery: '~1 month',
      features: [
        t('mobilePowerMode.modes.balanced.features.update30'),
        t('mobilePowerMode.modes.balanced.features.bleNormal'),
        t('mobilePowerMode.modes.balanced.features.standardLogging'),
      ],
    },
    {
      id: 'eco' as PowerMode,
      val: 2,
      name: t('mobilePowerMode.modes.eco.name'),
      icon: 'eco',
      iconBg: 'bg-green-600/20',
      iconColor: 'text-green-500',
      description: t('mobilePowerMode.modes.eco.description'),
      battery: '~3 months',
      features: [
        t('mobilePowerMode.modes.eco.features.updateHourly'),
        t('mobilePowerMode.modes.eco.features.bleReduced'),
        t('mobilePowerMode.modes.eco.features.minimalLogging'),
      ],
    },
  ];

  const handleSave = async () => {
    if (!systemConfig || saving) return;
    setSaving(true);
    try {
      const modeObj = powerModes.find(m => m.id === selectedMode);
      if (modeObj) {
        const newConfig = {
          ...systemConfig,
          power_mode: modeObj.val
        };
        await bleService.writeSystemConfigObject(newConfig);
        await bleService.readSystemConfig();
      }
      history.goBack();
    } catch (e) {
      console.error('Failed to save power mode:', e);
      alert(t('mobilePowerMode.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const batteryLevel = diagnosticsData?.battery_level ?? 0;
  const isMains = batteryLevel === 0xFF;

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
          {t('mobilePowerMode.title')}
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Current Battery */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-6">
          <div className="flex items-center gap-4">
            <div className={`size-16 rounded-full ${isMains ? 'bg-blue-500/10' : 'bg-mobile-primary/10'} flex items-center justify-center`}>
              <span className={`material-symbols-outlined ${isMains ? 'text-blue-400' : 'text-mobile-primary'} text-3xl`}>
                {isMains ? 'electrical_services' : 'battery_full'}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-mobile-text-muted text-sm">
                {isMains ? t('mobilePowerMode.powerSource') : t('mobilePowerMode.currentBattery')}
              </p>
              <p className="text-white text-3xl font-bold">
                {isMains ? t('mobilePowerMode.mains') : `${batteryLevel}${percentUnit}`}
              </p>
              <p className={`text-sm font-medium ${isMains ? 'text-blue-400' : 'text-mobile-primary'}`}>
                {isMains
                  ? t('mobilePowerMode.externalPower')
                  : (batteryLevel > 20 ? t('mobilePowerMode.batteryGood') : t('mobilePowerMode.batteryLow'))}
              </p>
            </div>
          </div>

          {/* Battery bar (hide if mains) */}
          {!isMains && (
            <div className="mt-4 h-2 bg-black/40 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${batteryLevel < 20 ? 'bg-red-500' : 'bg-mobile-primary'}`}
                style={{ width: `${batteryLevel}%` }}
              />
            </div>
          )}
        </div>

        {/* Mode Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            {t('mobilePowerMode.selectPowerMode')}
          </label>

          <div className="space-y-3">
            {powerModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`w-full rounded-2xl border overflow-hidden transition-all ${selectedMode === mode.id
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                  }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`size-12 rounded-full ${mode.iconBg} flex items-center justify-center ${mode.iconColor} shrink-0`}>
                      <span className="material-symbols-outlined text-2xl">{mode.icon}</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-white font-bold text-lg">{mode.name}</h4>
                        {selectedMode === mode.id && (
                          <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                        )}
                      </div>
                      <p className="text-mobile-text-muted text-sm mb-3">{mode.description}</p>

                      <ul className="space-y-1">
                        {mode.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-mobile-text-muted flex items-center gap-1.5">
                            <span className="text-mobile-primary">•</span>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Card */}
        <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-400 shrink-0">info</span>
          <p className="text-blue-200 text-sm leading-relaxed">
            {t('mobilePowerMode.infoNote')}
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">save</span>
          {saving ? t('mobilePowerMode.saving') : t('mobilePowerMode.apply')}
        </button>
      </div>
    </div>
  );
};

export default MobilePowerMode;

