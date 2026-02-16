import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { BleService } from '../../services/BleService';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import packageJson from '../../../package.json';

interface SettingsItem {
  icon: string;
  label: string;
  value?: string;
  onClick: () => void;
}

const MobileSettings: React.FC = () => {
  const history = useHistory();
  const { connectedDeviceId, connectionState, systemConfig } = useAppStore();
  const { user, isGuest, premium } = useAuth();
  const { t } = useI18n();
  const bleService = BleService.getInstance();

  const isOnline = connectionState === 'connected';

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

  const handleAccountOpen = () => {
    if (user) {
      history.push('/profile');
      return;
    }
    history.push('/auth?returnTo=/profile');
  };

  const handlePremiumOpen = () => {
    if (user) {
      history.push('/premium');
      return;
    }
    history.push('/auth?returnTo=/premium');
  };

  const accountName = user?.email || (isGuest ? t('mobileSettings.guest') : t('mobileAuth.titleLogin'));
  const premiumLabel = premium.isPremium ? t('mobileAuth.planPremium') : t('mobileAuth.planFree');

  const settingsItems = useMemo<SettingsItem[]>(() => ([
    {
      icon: 'developer_board',
      label: t('mobileSettings.deviceSettings'),
      value: systemConfig?.version ? `v${systemConfig.version}` : undefined,
      onClick: () => history.push('/device'),
    },
    {
      icon: 'tune',
      label: t('appSettings.title'),
      onClick: () => history.push('/app-settings'),
    },
    {
      icon: 'warning',
      label: t('mobileSettings.alarms'),
      onClick: () => history.push('/alarms'),
    },
    {
      icon: 'help',
      label: t('mobileSettings.helpCenter'),
      onClick: () => history.push('/help'),
    },
  ]), [history, systemConfig?.version, t]);

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
      <div className="pt-8 px-4 pb-3 flex justify-between items-center safe-area-top shrink-0">
        <h1 className="text-[32px] font-bold leading-tight tracking-tight">{t('mobileSettings.title')}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        <div className="px-4 space-y-4">
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-mobile-text-muted font-semibold">
                  {t('mobileSettings.sectionAccount')}
                </p>
                <h2 className="text-base font-bold mt-1 truncate">{accountName}</h2>
                <p className="text-xs text-mobile-text-muted mt-1">
                  {t('mobileAuth.planLabel').replace('{plan}', premiumLabel)}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAccountOpen}
                className="rounded-xl px-3 py-2 bg-white/10 text-sm font-semibold whitespace-nowrap"
              >
                {t('mobileSettings.profile')}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={handlePremiumOpen}
                className="rounded-xl py-2.5 bg-mobile-primary/15 text-mobile-primary text-sm font-bold"
              >
                {t('mobileSettings.premium')}
              </button>
              <button
                type="button"
                onClick={handleSwitchDevice}
                className="rounded-xl py-2.5 bg-white/10 text-white text-sm font-semibold"
              >
                {t('mobileSettings.switchDevice')}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden divide-y divide-mobile-border-dark">
            {settingsItems.map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-white/10 text-gray-300 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-white truncate">{item.label}</p>
                </div>
                {item.value && <span className="text-xs text-gray-500 whitespace-nowrap">{item.value}</span>}
                <span className="material-symbols-outlined text-gray-500 text-[22px]">chevron_right</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{connectedDeviceId || t('mobileSettings.autoWaterDevice')}</p>
              <p className="text-xs text-mobile-text-muted mt-1">
                {t('mobileSettings.statusLabel').replace(
                  '{status}',
                  isOnline ? t('mobileSettings.statusOnline') : t('mobileSettings.statusOffline')
                )}
              </p>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${isOnline ? 'bg-mobile-primary' : 'bg-gray-500'}`}
              aria-hidden
            />
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full py-3 text-red-500 bg-mobile-surface-dark rounded-2xl text-base font-bold border border-mobile-border-dark"
          >
            {t('mobileSettings.disconnectDevice')}
          </button>

          <p className="text-center text-xs text-gray-600 pb-3">
            {`${t('mobileSettings.appVersion')}: v${packageJson.version}`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileSettings;
