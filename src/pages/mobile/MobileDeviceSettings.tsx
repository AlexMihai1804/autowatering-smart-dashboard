import React from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import AdvancedSection from '../../components/mobile/AdvancedSection';

const MobileDeviceSettings: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const { packStats } = useAppStore();

  // Dynamic subtitle for packs - shows custom plant count if available
  const packsSubtitle = packStats
    ? t('mobileDeviceSettings.items.packsPlants.subtitleWithCount').replace('{count}', String(packStats.plant_count))
    : t('mobileDeviceSettings.items.packsPlants.subtitle');

  const settingsGroups = [
    {
      title: t('mobileDeviceSettings.groups.deviceConfiguration'),
      isAdvanced: false,
      items: [
        {
          icon: 'info',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          label: t('mobileDeviceSettings.items.deviceInfo.label'),
          subtitle: t('mobileDeviceSettings.items.deviceInfo.subtitle'),
          route: '/device/info',
        },
        {
          icon: 'system_update_alt',
          iconBg: 'bg-orange-500/10',
          iconColor: 'text-orange-300',
          label: t('mobileDeviceInfo.checkUpdates'),
          subtitle: `${t('mobileDeviceInfo.firmwareVersion')} OTA`,
          route: '/device/firmware',
        },
        {
          icon: 'schedule',
          iconBg: 'bg-purple-500/10',
          iconColor: 'text-purple-400',
          label: t('mobileDeviceSettings.items.timeLocation.label'),
          subtitle: t('mobileDeviceSettings.items.timeLocation.subtitle'),
          route: '/device/time',
        },
        {
          icon: 'rainy',
          iconBg: 'bg-sky-500/10',
          iconColor: 'text-sky-400',
          label: t('mobileDeviceSettings.items.rainSensor.label'),
          subtitle: t('mobileDeviceSettings.items.rainSensor.subtitle'),
          route: '/device/rain-sensor',
        },
        {
          icon: 'valve',
          iconBg: 'bg-green-500/10',
          iconColor: 'text-green-400',
          label: t('mobileDeviceSettings.items.masterValve.label'),
          subtitle: t('mobileDeviceSettings.items.masterValve.subtitle'),
          route: '/device/master-valve',
        },
        {
          icon: 'water_drop',
          iconBg: 'bg-cyan-500/10',
          iconColor: 'text-cyan-400',
          label: t('mobileDeviceSettings.items.flowCalibration.label'),
          subtitle: t('mobileDeviceSettings.items.flowCalibration.subtitle'),
          route: '/device/flow-calibration',
        },
        {
          icon: 'inventory_2',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-400',
          label: t('mobileDeviceSettings.items.packsPlants.label'),
          subtitle: packsSubtitle,
          route: '/device/packs',
        },
      ],
    },
    {
      title: t('mobileDeviceSettings.groups.powerPerformance'),
      isAdvanced: true,
      items: [
        {
          icon: 'battery_charging_full',
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-400',
          label: t('mobileDeviceSettings.items.powerMode.label'),
          subtitle: t('mobileDeviceSettings.items.powerMode.subtitle'),
          route: '/device/power-mode',
        },
      ],
    },
    {
      title: t('mobileDeviceSettings.groups.maintenance'),
      isAdvanced: true,
      items: [
        {
          icon: 'monitor_heart',
          iconBg: 'bg-emerald-500/10',
          iconColor: 'text-emerald-400',
          label: t('healthHub.deviceHealthCta'),
          subtitle: t('healthHub.deviceHealthCtaHint'),
          route: '/health/device',
        },
        {
          icon: 'support_agent',
          iconBg: 'bg-teal-500/10',
          iconColor: 'text-teal-300',
          label: t('healthHub.troubleshootingCta'),
          subtitle: t('healthHub.troubleshootingCtaHint'),
          route: '/health/troubleshooting',
        },
        {
          icon: 'restart_alt',
          iconBg: 'bg-red-500/10',
          iconColor: 'text-red-400',
          label: t('mobileDeviceSettings.items.resetOptions.label'),
          subtitle: t('mobileDeviceSettings.items.resetOptions.subtitle'),
          route: '/device/reset',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark p-4 pb-2 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          {t('mobileDeviceSettings.title')}
        </h2>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 gap-6 pb-8">
        {settingsGroups.filter(group => !group.isAdvanced).map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-2">
            <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              {group.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => history.push(item.route)}
                  className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-base font-medium text-white">{item.label}</span>
                      <span className="text-xs text-mobile-text-muted">{item.subtitle}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <AdvancedSection title={t('common.advanced')} defaultOpen={false}>
          <div className="flex flex-col gap-4">
            {settingsGroups.filter(group => group.isAdvanced).map((group, groupIdx) => (
              <div key={`${group.title}-${groupIdx}`} className="flex flex-col gap-2">
                <h3 className="px-2 text-xs font-medium text-mobile-text-muted uppercase tracking-wider">
                  {group.title}
                </h3>
                <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
                  {group.items.map((item, itemIdx) => (
                    <button
                      key={itemIdx}
                      onClick={() => history.push(item.route)}
                      className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div className="flex flex-col items-start">
                          <span className="text-base font-medium text-white">{item.label}</span>
                          <span className="text-xs text-mobile-text-muted">{item.subtitle}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </AdvancedSection>
      </main>
    </div>
  );
};

export default MobileDeviceSettings;
