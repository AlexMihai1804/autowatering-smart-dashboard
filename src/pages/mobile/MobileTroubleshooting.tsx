import React, { useCallback, useMemo } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import MobileHeader from '../../components/mobile/MobileHeader';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { AlarmCode, getAlarmTitle } from '../../types/firmware_structs';

type GuideKey = 'noFlow' | 'unexpectedFlow' | 'highFlow' | 'mainlineLeak' | 'freezeLockout';

type GuideDefinition = {
  code: AlarmCode;
  key: GuideKey;
};

const GUIDE_DEFINITIONS: GuideDefinition[] = [
  { code: AlarmCode.NO_FLOW, key: 'noFlow' },
  { code: AlarmCode.UNEXPECTED_FLOW, key: 'unexpectedFlow' },
  { code: AlarmCode.HIGH_FLOW, key: 'highFlow' },
  { code: AlarmCode.MAINLINE_LEAK, key: 'mainlineLeak' },
  { code: AlarmCode.FREEZE_LOCKOUT, key: 'freezeLockout' },
];

const MobileTroubleshooting: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useI18n();
  const { alarmStatus } = useAppStore();

  const showToast = useCallback(async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      // no-op on web / missing plugin
    }
  }, []);

  const preferredCode = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = Number(params.get('alarm'));
    if (Number.isFinite(raw) && GUIDE_DEFINITIONS.some(guide => guide.code === raw)) {
      return raw as AlarmCode;
    }
    if (alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE) {
      return alarmStatus.alarm_code;
    }
    return null;
  }, [alarmStatus, location.search]);

  const guides = useMemo(() => {
    return GUIDE_DEFINITIONS.map(({ code, key }) => ({
      code,
      title: getAlarmTitle(code, t),
      symptom: t(`healthHub.troubleshooting.guides.${key}.symptom`),
      steps: [
        t(`healthHub.troubleshooting.guides.${key}.step1`),
        t(`healthHub.troubleshooting.guides.${key}.step2`),
        t(`healthHub.troubleshooting.guides.${key}.step3`)
      ]
    }));
  }, [t]);

  const sortedGuides = useMemo(() => {
    if (!preferredCode) return guides;
    return [...guides].sort((a, b) => {
      if (a.code === preferredCode) return -1;
      if (b.code === preferredCode) return 1;
      return 0;
    });
  }, [guides, preferredCode]);

  const handleShareGuide = useCallback(async (guide: { title: string; symptom: string; steps: string[] }) => {
    const body = [
      `${guide.title}`,
      '',
      guide.symptom,
      '',
      `1. ${guide.steps[0]}`,
      `2. ${guide.steps[1]}`,
      `3. ${guide.steps[2]}`
    ].join('\n');

    try {
      if (navigator.share) {
        await navigator.share({
          title: guide.title,
          text: body
        });
        return;
      }
      await navigator.clipboard.writeText(body);
      await showToast(t('healthHub.troubleshooting.stepsCopied'));
    } catch (error) {
      console.warn('[MobileTroubleshooting] Share failed', error);
      await showToast(t('healthHub.troubleshooting.shareUnsupported'));
    }
  }, [showToast, t]);

  const activeAlarmLabel = alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE
    ? getAlarmTitle(alarmStatus.alarm_code, t)
    : t('healthHub.troubleshooting.activeAlarmNone');

  return (
    <div className="min-h-screen bg-mobile-bg-dark text-white font-manrope">
      <MobileHeader
        title={t('healthHub.troubleshooting.title')}
        subtitle={t('healthHub.troubleshooting.subtitle')}
        showBackButton
        onBack={() => history.goBack()}
      />

      <main className="app-scrollbar max-w-md mx-auto px-4 pb-24 pt-4 flex flex-col gap-4">
        <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('healthHub.troubleshooting.activeAlarmBanner')}</p>
          <p className="text-sm font-semibold text-white mt-2">{activeAlarmLabel}</p>
          <button
            onClick={() => history.push('/alarms')}
            className="mt-3 px-3 py-2 rounded-lg bg-mobile-primary/15 text-mobile-primary border border-mobile-primary/25 text-xs font-bold"
          >
            {t('healthHub.troubleshooting.openAlarmHistory')}
          </button>
        </div>

        {sortedGuides.length === 0 ? (
          <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark p-4">
            <p className="text-sm font-semibold text-white">{t('healthHub.troubleshooting.noGuideTitle')}</p>
            <p className="text-xs text-mobile-text-muted mt-2">{t('healthHub.troubleshooting.noGuideDesc')}</p>
          </div>
        ) : (
          sortedGuides.map((guide) => {
            const isRecommended = preferredCode === guide.code;
            return (
              <div
                key={guide.code}
                className={`rounded-2xl border p-4 ${
                  isRecommended
                    ? 'bg-mobile-primary/10 border-mobile-primary/30'
                    : 'bg-mobile-surface-dark border-mobile-border-dark'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{guide.title}</p>
                    <p className="text-xs text-mobile-text-muted mt-1">{guide.symptom}</p>
                  </div>
                  {isRecommended && (
                    <span className="px-2 py-1 rounded-full bg-mobile-primary/20 text-mobile-primary border border-mobile-primary/35 text-[10px] font-bold uppercase">
                      {t('common.fix')}
                    </span>
                  )}
                </div>

                <ol className="mt-3 space-y-2">
                  {guide.steps.map((step, index) => (
                    <li key={`${guide.code}-${index}`} className="flex items-start gap-2">
                      <span className="mt-[2px] text-[11px] font-bold text-mobile-primary">{index + 1}.</span>
                      <span className="text-xs text-white/85">{step}</span>
                    </li>
                  ))}
                </ol>

                <button
                  onClick={() => handleShareGuide(guide)}
                  className="mt-3 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white"
                >
                  {t('healthHub.troubleshooting.shareSteps')}
                </button>
              </div>
            );
          })
        )}
      </main>
    </div>
  );
};

export default MobileTroubleshooting;
