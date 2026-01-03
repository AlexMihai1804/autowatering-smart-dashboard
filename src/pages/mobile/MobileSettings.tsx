import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import { useTheme } from '../../hooks/useTheme';
import { useSettings } from '../../hooks/useSettings';
import { useI18n } from '../../i18n';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

interface SettingsItem {
  icon: string;
  label: string;
  value?: string;
  onClick?: () => void;
  iconBgClass?: string;
  iconTextClass?: string;
}

interface SettingsSection {
  title: string;
  items: SettingsItem[];
}

const MobileSettings: React.FC = () => {
  const history = useHistory();
  const {
    connectedDeviceId,
    connectionState,
    systemConfig,
    rtcConfig
  } = useAppStore();
  const bleService = BleService.getInstance();

  const { resolvedTheme, setTheme } = useTheme();
  const { useMetric, updateSetting } = useSettings();
  const { t, language, availableLanguages, setLanguage } = useI18n();

  const languageLabel =
    availableLanguages.find(l => l.code === language)?.nativeName || language.toUpperCase();

  const handleUnitChange = (metric: boolean) => {
    updateSetting('useCelsius', metric);
    updateSetting('useMetric', metric);
  };

  const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void }> = ({ enabled, onChange }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!enabled);
      }}
      className={`relative w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-mobile-primary' : 'bg-mobile-border-dark'
        }`}
    >
      <div
        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${enabled ? 'translate-x-6' : 'translate-x-0'
          }`}
      />
    </button>
  );

  const handleDisconnect = async () => {
    try {
      await bleService.disconnect();
      history.replace('/welcome');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleSwitchDevice = () => {
    history.push('/scan');
  };

  // Device Configuration Section
  const deviceConfigItems: SettingsItem[] = [
    {
      icon: 'developer_board',
      label: t('mobileSettings.deviceSettings'),
      onClick: () => history.push('/device'),
      iconBgClass: 'bg-mobile-primary/20',
      iconTextClass: 'text-mobile-primary',
    },
    {
      icon: 'water_drop',
      label: t('mobileSettings.zoneConfiguration'),
      onClick: () => history.push('/zones'),
      iconBgClass: 'bg-mobile-primary/20',
      iconTextClass: 'text-mobile-primary',
    },
    {
      icon: 'calendar_month',
      label: t('mobileSettings.wateringSchedules'),
      onClick: () => console.log('Schedules'),
      iconBgClass: 'bg-mobile-primary/20',
      iconTextClass: 'text-mobile-primary',
    },
    {
      icon: 'thunderstorm',
      label: t('mobileSettings.rainDelay'),
      onClick: () => console.log('Rain delay'),
      iconBgClass: 'bg-mobile-primary/20',
      iconTextClass: 'text-mobile-primary',
    },
  ];

  // App Preferences Section
  const appPreferencesItems: SettingsItem[] = [
    {
      icon: 'notifications',
      label: t('mobileSettings.notifications'),
      onClick: () => history.push('/notifications'),
      iconBgClass: 'bg-gray-500/20',
      iconTextClass: 'text-gray-400',
    },

    {
      icon: 'warning',
      label: t('mobileSettings.alarms'),
      onClick: () => history.push('/alarms'),
      iconBgClass: 'bg-gray-500/20',
      iconTextClass: 'text-gray-400',
    },



  ];

  // Support Section
  const supportItems: SettingsItem[] = [
    {
      icon: 'help',
      label: t('mobileSettings.helpCenter'),
      onClick: () => console.log('Help'),
      iconBgClass: 'bg-gray-500/20',
      iconTextClass: 'text-gray-400',
    },
    {
      icon: 'system_update',
      label: t('mobileSettings.firmware'),
      value: 'v2.4.1',
      onClick: () => console.log('Firmware'),
      iconBgClass: 'bg-gray-500/20',
      iconTextClass: 'text-gray-400',
    },
    {
      icon: 'info',
      label: t('mobileSettings.about'),
      onClick: () => console.log('About'),
      iconBgClass: 'bg-gray-500/20',
      iconTextClass: 'text-gray-400',
    },
  ];

  const renderSettingsSection = (section: SettingsSection) => (
    <div className="mb-6" key={section.title}>
      <div className="px-4 mb-2">
        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2 mb-2">
          {section.title}
        </h3>
      </div>
      <div className="px-4">
        <div className="flex flex-col overflow-hidden rounded-xl bg-mobile-surface-dark shadow-sm divide-y divide-mobile-border-dark">
          {section.items.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              className="flex items-center gap-4 p-4 active:bg-white/5 transition-colors text-left w-full"
            >
              <div className={`flex items-center justify-center rounded-full shrink-0 w-10 h-10 ${item.iconBgClass} ${item.iconTextClass}`}>
                <span className="material-symbols-outlined">{item.icon}</span>
              </div>
              <div className="flex-1">
                <p className="text-base font-medium leading-normal text-white">{item.label}</p>
              </div>
              <div className="flex items-center gap-2">
                {item.value && (
                  <span className="text-sm text-gray-500">{item.value}</span>
                )}
                <span className="material-symbols-outlined text-gray-500 text-[20px]">arrow_forward_ios</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
      {/* Header */}
      <div className="pt-8 px-4 pb-4 flex justify-between items-center safe-area-top shrink-0">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">{t('mobileSettings.title')}</h1>
        <div className="w-10 h-10 rounded-full bg-mobile-surface-dark flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-gray-400">person</span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        {/* Device Card */}
        <div className="px-4 mb-6">
          <div className="flex flex-col gap-4 rounded-xl bg-mobile-surface-dark p-4 shadow-sm border border-mobile-border-dark">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold leading-tight">
                    {connectedDeviceId || t('mobileSettings.autoWaterDevice')}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    {connectionState === 'connected' ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-mobile-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-mobile-primary"></span>
                        </span>
                        <p className="text-mobile-text-muted text-sm font-medium">
                          {t('mobileSettings.statusLabel').replace('{status}', t('mobileSettings.statusOnline'))}
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-500"></span>
                        <p className="text-gray-500 text-sm font-medium">
                          {t('mobileSettings.statusLabel').replace('{status}', t('mobileSettings.statusOffline'))}
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Device Image Thumbnail */}
              <div className="h-16 w-16 bg-mobile-primary/10 rounded-lg shrink-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-mobile-primary text-3xl">developer_board</span>
              </div>
            </div>

            <button
              onClick={handleSwitchDevice}
              className="flex w-full cursor-pointer items-center justify-center rounded-full h-10 px-4 bg-mobile-border-dark active:scale-95 transition-transform"
            >
              <span className="text-sm font-semibold text-white">{t('mobileSettings.switchDevice')}</span>
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        {renderSettingsSection({ title: t('mobileSettings.sectionDeviceConfiguration'), items: deviceConfigItems })}
        {renderSettingsSection({ title: t('mobileSettings.sectionAppPreferences'), items: appPreferencesItems })}

        {/* Inline Interactive Settings */}
        <div className="mb-6">
          <div className="px-4 mb-2">
            <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider pl-2 mb-2">
              {t('mobileSettings.sectionCustomization')}
            </h3>
          </div>
          <div className="px-4">
            <div className="flex flex-col overflow-hidden rounded-xl bg-mobile-surface-dark shadow-sm divide-y divide-mobile-border-dark">
              {/* Dark Mode Toggle */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center rounded-full shrink-0 w-10 h-10 bg-gray-500/20 text-gray-400">
                  <span className="material-symbols-outlined">palette</span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium leading-normal text-white">{t('mobileSettings.appearance')}</p>
                  <p className="text-sm text-gray-500">{resolvedTheme === 'dark' ? t('mobileSettings.themeDark') : t('mobileSettings.themeLight')}</p>
                </div>
                <Toggle
                  enabled={resolvedTheme === 'dark'}
                  onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')}
                />
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center rounded-full shrink-0 w-10 h-10 bg-gray-500/20 text-gray-400">
                  <span className="material-symbols-outlined">language</span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium leading-normal text-white">{t('mobileSettings.language')}</p>
                  <p className="text-sm text-gray-500">{languageLabel}</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e: React.MouseEvent) => e.stopPropagation()}
                      className="px-4 py-2 rounded-xl bg-mobile-primary/10 text-mobile-primary text-sm font-bold hover:bg-mobile-primary/20 transition-colors"
                    >
                      {t('common.change')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px]">
                    <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('mobileSettings.selectLanguage')}</div>
                    <div className="flex flex-col gap-1">
                      {availableLanguages.map((lang) => {
                        const selected = lang.code === language;
                        return (
                          <button
                            key={lang.code}
                            type="button"
                            onClick={() => setLanguage(lang.code)}
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${selected
                                ? 'bg-mobile-primary/20 text-mobile-primary'
                                : 'text-white/80 hover:bg-white/5'
                              }`}
                          >
                            {lang.nativeName}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Units Selector */}
              <div className="flex items-center gap-4 p-4">
                <div className="flex items-center justify-center rounded-full shrink-0 w-10 h-10 bg-gray-500/20 text-gray-400">
                  <span className="material-symbols-outlined">straighten</span>
                </div>
                <div className="flex-1">
                  <p className="text-base font-medium leading-normal text-white">{t('mobileSettings.units')}</p>
                  <p className="text-sm text-gray-500">{useMetric ? t('mobileSettings.metric') : t('mobileSettings.imperial')}</p>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="px-4 py-2 rounded-xl bg-mobile-primary/10 text-mobile-primary text-sm font-bold hover:bg-mobile-primary/20 transition-colors"
                    >
                      {t('common.change')}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px]">
                    <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('mobileSettings.selectUnits')}</div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUnitChange(true)}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${useMetric
                            ? 'bg-mobile-primary text-mobile-bg-dark'
                            : 'bg-white/5 text-white border border-white/10 hover:border-mobile-primary/50'
                          }`}
                      >
                        {t('mobileSettings.metric')}
                      </button>
                      <button
                        onClick={() => handleUnitChange(false)}
                        className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${!useMetric
                            ? 'bg-mobile-primary text-mobile-bg-dark'
                            : 'bg-white/5 text-white border border-white/10 hover:border-mobile-primary/50'
                          }`}
                      >
                        {t('mobileSettings.imperial')}
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {renderSettingsSection({ title: t('mobileSettings.sectionSupport'), items: supportItems })}

        {/* Sign Out */}
        <div className="px-4 mb-8">
          <button
            onClick={handleDisconnect}
            className="w-full py-3 text-red-500 bg-mobile-surface-dark rounded-xl text-base font-bold shadow-sm active:scale-95 transition-transform border border-mobile-border-dark"
          >
            {t('mobileSettings.disconnectDevice')}
          </button>
          <p className="text-center text-xs text-gray-600 mt-4">
            {t('mobileSettings.appVersion')
              .replace('{version}', 'v1.0.0')
              .replace('{build}', '1')}
          </p>
        </div>

        {/* Spacer */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default MobileSettings;
