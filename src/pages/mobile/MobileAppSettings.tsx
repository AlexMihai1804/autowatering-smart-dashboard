import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { useConfigExport } from '../../hooks/useConfigExport';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { useAppStore } from '../../store/useAppStore';
import { createInitialZones } from '../../types/wizard';
import { getHistoryService } from '../../services/HistoryService';
import { useAuth } from '../../auth';
import MobileConfirmModal from '../../components/mobile/MobileConfirmModal';

const NOTIFICATIONS_KEY = 'autowater_notifications_enabled';
const CLOUD_STATE_VERSION = 'v1';
const CLOUD_LOCAL_KEYS = [
  'autowater_known_devices',
  'autowater_last_device',
  'autowater_permissions_state',
  NOTIFICATIONS_KEY,
  'autowatering_settings',
  'app_theme',
  'app_language'
] as const;

const MobileAppSettings: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { settings, updateSetting, useMetric } = useSettings();
  const { zones, channelWizard, connectedDeviceId, resetStore } = useAppStore();
  const { exportConfig, isExporting } = useConfigExport();
  const { clearCache } = useOfflineMode();
  const { user, saveCloudState, loadCloudState } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // Ignore storage parsing errors and fallback below.
    }
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  });
  const [isClearing, setIsClearing] = useState(false);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [isRestoreBusy, setIsRestoreBusy] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { t, language, setLanguage, availableLanguages } = useI18n();

  const appearanceRef = useRef<HTMLDivElement | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);
  const unitsRef = useRef<HTMLDivElement | null>(null);

  const requestedSection = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('section');
  }, [location.search]);

  useEffect(() => {
    const target =
      requestedSection === 'appearance'
        ? appearanceRef.current
        : requestedSection === 'language'
          ? languageRef.current
          : requestedSection === 'units'
            ? unitsRef.current
            : null;

    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [requestedSection]);

  // Handle unit toggle - both temperature and volume/area units
  const handleUnitChange = (metric: boolean) => {
    updateSetting('useCelsius', metric);
    updateSetting('useMetric', metric);
  };

  const persistNotificationsEnabled = (enabled: boolean) => {
    try {
      localStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
    } catch (error) {
      console.warn('[MobileAppSettings] Failed to persist notifications setting:', error);
    }
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    let nextValue = enabled;
    if (enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      const result = await Notification.requestPermission();
      nextValue = result === 'granted';
    }
    setNotificationsEnabled(nextValue);
    persistNotificationsEnabled(nextValue);
  };

  const exportZones = useMemo(() => {
    if (channelWizard.zones.length > 0) {
      return channelWizard.zones;
    }

    const initial = createInitialZones(Math.max(8, zones.length || 8), language);
    return initial.map((wizardZone) => {
      const channel = zones.find((zone) => zone.channel_id === wizardZone.channelId);
      if (!channel) return wizardZone;

      return {
        ...wizardZone,
        enabled: true,
        skipped: false,
        name: channel.name || wizardZone.name,
        coverageType: channel.coverage_type === 1 ? 'plants' as const : 'area' as const,
        coverageValue: channel.coverage_type === 1
          ? channel.coverage.plant_count ?? wizardZone.coverageValue
          : channel.coverage.area_m2 ?? wizardZone.coverageValue,
        sunExposure: channel.sun_percentage
      };
    });
  }, [channelWizard.zones, zones, language]);

  const handleExportData = async () => {
    try {
      await exportConfig(exportZones, {
        deviceName: connectedDeviceId || undefined
      });
    } catch (error) {
      console.error('[MobileAppSettings] Export failed:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(`${t('common.error')}: ${reason}`);
    }
  };

  const showToast = async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      // Ignore (web / plugin unavailable)
    }
  };

  const executeClearAppData = async () => {
    if (isClearing) return;

    setIsClearing(true);
    try {
      await getHistoryService().clearCache();
      clearCache();

      const keysToRemove = [
        'autowater_known_devices',
        'autowater_last_device',
        'autowater_permissions_state',
        NOTIFICATIONS_KEY,
        'autowatering_settings',
        'app_theme',
        'app_language'
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));

      setNotificationsEnabled(false);
      resetStore();
      await showToast(t('common.success'));
    } catch (error) {
      console.error('[MobileAppSettings] Clear data failed:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(`${t('common.error')}: ${reason}`);
    } finally {
      setIsClearing(false);
      setConfirmClearOpen(false);
    }
  };

  const handleClearAppData = () => {
    if (isClearing) return;
    setConfirmClearOpen(true);
  };

  const buildCloudSnapshot = () => {
    const storage: Record<string, string | null> = {};
    for (const key of CLOUD_LOCAL_KEYS) {
      storage[key] = localStorage.getItem(key);
    }

    return {
      schema: CLOUD_STATE_VERSION,
      savedAt: new Date().toISOString(),
      storage
    };
  };

  const applyCloudSnapshot = (snapshot: Record<string, unknown>) => {
    const storage = snapshot.storage;
    if (!storage || typeof storage !== 'object') {
      throw new Error('Invalid cloud state payload.');
    }

    for (const key of CLOUD_LOCAL_KEYS) {
      const value = (storage as Record<string, unknown>)[key];
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        localStorage.removeItem(key);
      }
    }

    const restoredTheme = localStorage.getItem('app_theme');
    if (restoredTheme === 'dark' || restoredTheme === 'light' || restoredTheme === 'system') {
      setTheme(restoredTheme);
    }

    const restoredLanguage = localStorage.getItem('app_language');
    if (restoredLanguage === 'en' || restoredLanguage === 'ro') {
      setLanguage(restoredLanguage);
    }

    try {
      const restoredSettingsRaw = localStorage.getItem('autowatering_settings');
      if (restoredSettingsRaw) {
        const restoredSettings = JSON.parse(restoredSettingsRaw) as Record<string, unknown>;
        if (typeof restoredSettings.useCelsius === 'boolean') {
          updateSetting('useCelsius', restoredSettings.useCelsius);
        }
        if (typeof restoredSettings.useMetric === 'boolean') {
          updateSetting('useMetric', restoredSettings.useMetric);
        }
      }
    } catch (error) {
      console.warn('[MobileAppSettings] Failed to apply restored settings:', error);
    }

    const restoredNotifications = localStorage.getItem(NOTIFICATIONS_KEY);
    setNotificationsEnabled(restoredNotifications === 'true');
  };

  const handleBackupToAccount = async () => {
    if (!user) {
      history.push('/auth');
      return;
    }

    setIsBackupBusy(true);
    try {
      const snapshot = buildCloudSnapshot();
      await saveCloudState(snapshot, CLOUD_STATE_VERSION);
      await showToast('Backup saved to your account.');
    } catch (error) {
      console.error('[MobileAppSettings] Backup failed:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(`${t('common.error')}: ${reason}`);
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleRestoreFromAccount = async () => {
    if (!user) {
      history.push('/auth');
      return;
    }

    setIsRestoreBusy(true);
    try {
      const cloudState = await loadCloudState();
      if (!cloudState) {
        await showToast('No cloud backup found for this account.');
        return;
      }

      applyCloudSnapshot(cloudState);
      await showToast('Backup restored from account.');
    } catch (error) {
      console.error('[MobileAppSettings] Restore failed:', error);
      const reason = error instanceof Error ? error.message : String(error);
      await showToast(`${t('common.error')}: ${reason}`);
    } finally {
      setIsRestoreBusy(false);
    }
  };

  const Toggle: React.FC<{ enabled: boolean; onChange: (v: boolean) => void }> = ({ enabled, onChange }) => (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-12 h-7 rounded-full transition-colors ${
        enabled ? 'bg-mobile-primary' : 'bg-white/20'
      }`}
    >
      <div
        className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark font-manrope overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark p-4 pb-2 justify-between shrink-0">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          {t('appSettings.title')}
        </h2>
      </div>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-28 overscroll-contain flex flex-col px-4 gap-6">
        {/* Notifications Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('appSettings.notifications')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('appSettings.pushNotifications')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('appSettings.alertsUpdates')}</span>
                </div>
              </div>
              <Toggle enabled={notificationsEnabled} onChange={(next) => void handleNotificationsToggle(next)} />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div ref={appearanceRef} className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('appSettings.appearance')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined">dark_mode</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('appSettings.darkMode')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('appSettings.useDarkTheme')}</span>
                </div>
              </div>
              <Toggle enabled={isDark} onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div ref={languageRef} className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('appSettings.language')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                  <span className="material-symbols-outlined">translate</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('appSettings.language')}</span>
                  <span className="text-xs text-mobile-text-muted">
                    {availableLanguages.find(l => l.code === language)?.nativeName ?? language.toUpperCase()}
                  </span>
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl">
                    {t('common.change')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px]">
                  <div className="text-xs font-bold text-mobile-text-muted mb-2">{t('appSettings.selectLanguage')}</div>
                  <div className="flex flex-col gap-1">
                    {availableLanguages.map((lang) => {
                      const selected = lang.code === language;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setLanguage(lang.code)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-bold transition-colors ${
                            selected
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
          </div>
        </div>

        {/* Units Section */}
        <div ref={unitsRef} className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('appSettings.units')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 p-4">
            <div className="flex gap-3">
              <button
                onClick={() => handleUnitChange(true)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  useMetric
                    ? 'bg-mobile-primary text-mobile-bg-dark'
                    : 'bg-white/5 text-white border border-white/10 hover:border-mobile-primary/50'
                }`}
              >
                {t('appSettings.metricLabel')
                  .replace('{temp}', t('common.degreesC'))
                  .replace('{volume}', t('common.litersShort'))
                  .replace('{length}', t('common.mm'))}
              </button>
              <button
                onClick={() => handleUnitChange(false)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !useMetric
                    ? 'bg-mobile-primary text-mobile-bg-dark'
                    : 'bg-white/5 text-white border border-white/10 hover:border-mobile-primary/50'
                }`}
              >
                {t('appSettings.imperialLabel')
                  .replace('{temp}', t('common.degreesF'))
                  .replace('{volume}', t('common.gallonsShort'))
                  .replace('{length}', t('common.inchesShort'))}
              </button>
            </div>
            <p className="text-xs text-mobile-text-muted mt-3 text-center">
              {t('appSettings.autoDetectedRegion').replace('{locale}', settings.locale)}
            </p>
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('appSettings.dataPrivacy')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <button
              onClick={() => void handleBackupToAccount()}
              disabled={isBackupBusy}
              className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined">{isBackupBusy ? 'sync' : 'backup'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Backup To Account</span>
                  <span className="text-xs text-mobile-text-muted">Save app preferences and device list to cloud.</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button
              onClick={() => void handleRestoreFromAccount()}
              disabled={isRestoreBusy}
              className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <span className="material-symbols-outlined">{isRestoreBusy ? 'sync' : 'restore'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Restore From Account</span>
                  <span className="text-xs text-mobile-text-muted">Load saved app preferences from cloud backup.</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button
              onClick={() => void handleExportData()}
              disabled={isExporting}
              className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined">{isExporting ? 'sync' : 'download'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('appSettings.exportData')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('appSettings.exportDesc')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button
              onClick={() => void handleClearAppData()}
              disabled={isClearing}
              className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group disabled:opacity-60"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined">{isClearing ? 'sync' : 'delete_forever'}</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('appSettings.clearAppData')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('appSettings.clearAppDesc')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </main>

      <MobileConfirmModal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => { void executeClearAppData(); }}
        title={`${t('appSettings.clearAppData')}?`}
        message={t('appSettings.clearAppDesc')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        icon="delete_forever"
        variant="danger"
      />
    </div>
  );
};

export default MobileAppSettings;
