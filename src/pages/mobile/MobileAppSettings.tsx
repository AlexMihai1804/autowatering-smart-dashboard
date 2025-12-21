import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';
import { useI18n } from '../../i18n';
import { Button } from '../../components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';

const MobileAppSettings: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { settings, updateSetting, useCelsius, useMetric, resetToDefaults } = useSettings();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const { language, setLanguage, availableLanguages } = useI18n();

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
          App Settings
        </h2>
      </div>

      {/* Scrollable Content */}
      <main className="flex-1 overflow-y-auto pb-28 overscroll-contain flex flex-col px-4 gap-6">
        {/* Notifications Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            Notifications
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">notifications</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Push Notifications</span>
                  <span className="text-xs text-mobile-text-muted">Alerts and updates</span>
                </div>
              </div>
              <Toggle enabled={notificationsEnabled} onChange={setNotificationsEnabled} />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div ref={appearanceRef} className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            Appearance
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined">dark_mode</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Dark Mode</span>
                  <span className="text-xs text-mobile-text-muted">Use dark theme</span>
                </div>
              </div>
              <Toggle enabled={isDark} onChange={(enabled) => setTheme(enabled ? 'dark' : 'light')} />
            </div>
          </div>
        </div>

        {/* Language Section */}
        <div ref={languageRef} className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            Language
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                  <span className="material-symbols-outlined">translate</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Language</span>
                  <span className="text-xs text-mobile-text-muted">
                    {availableLanguages.find(l => l.code === language)?.nativeName ?? language.toUpperCase()}
                  </span>
                </div>
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-9 rounded-xl">
                    Change
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[220px]">
                  <div className="text-xs font-bold text-mobile-text-muted mb-2">Select language</div>
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
            Units
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
                Metric (°C, L, mm)
              </button>
              <button
                onClick={() => handleUnitChange(false)}
                className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !useMetric
                    ? 'bg-mobile-primary text-mobile-bg-dark'
                    : 'bg-white/5 text-white border border-white/10 hover:border-mobile-primary/50'
                }`}
              >
                Imperial (°F, gal, in)
              </button>
            </div>
            <p className="text-xs text-mobile-text-muted mt-3 text-center">
              Auto-detected from your region: {settings.locale}
            </p>
          </div>
        </div>

        {/* Data & Privacy Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            Data & Privacy
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined">download</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Export Data</span>
                  <span className="text-xs text-mobile-text-muted">Download your watering history</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                  <span className="material-symbols-outlined">delete_forever</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">Clear App Data</span>
                  <span className="text-xs text-mobile-text-muted">Remove local cache and settings</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MobileAppSettings;
