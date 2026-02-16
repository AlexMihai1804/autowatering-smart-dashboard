import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { PREMIUM_LIMITS } from '../../constants/premiumLimits';

const MobilePremium: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useI18n();
  const {
    authConfigured,
    user,
    premium,
    premiumLoading,
    refreshPremiumStatus,
    startPremiumCheckout,
    openBillingPortal
  } = useAuth();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toUserFacingError = (err: unknown, fallback: string): string => {
    if (!(err instanceof Error)) return fallback;
    const message = err.message?.trim() || fallback;
    return message;
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('checkout')) {
      setBusy(false);
      void refreshPremiumStatus();
    }
  }, [location.search, refreshPremiumStatus]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    let removeListener: (() => Promise<void> | void) | null = null;

    const register = async () => {
      const handle = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        setBusy(false);
        void refreshPremiumStatus();
      });

      if (!mounted) {
        await handle.remove();
        return;
      }

      removeListener = () => handle.remove();
    };

    void register();

    return () => {
      mounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [refreshPremiumStatus]);

  // Webhooks/claims can take a moment after checkout success. Poll a few times.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('checkout') !== 'success') return;
    if (!user) return;
    if (premium.isPremium) return;

    let cancelled = false;
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      await refreshPremiumStatus().catch(() => undefined);
      if (cancelled) return;
      if (attempts >= 6) return;
      if (!premium.isPremium) {
        setTimeout(() => void tick(), 4000);
      }
    };

    setTimeout(() => void tick(), 1500);
    return () => {
      cancelled = true;
    };
  }, [location.search, premium.isPremium, refreshPremiumStatus, user]);

  const checkoutStatusMessage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('checkout');
    if (status === 'success') return t('mobilePremium.checkoutSuccess');
    if (status === 'cancelled') return t('mobilePremium.checkoutCancelled');
    return null;
  }, [location.search, t]);

  const handleUpgrade = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await startPremiumCheckout();
      window.location.href = url;
    } catch (err) {
      const message = toUserFacingError(err, t('mobilePremium.errorCheckoutFailed'));
      setError(message);
      setBusy(false);
    }
  };

  const handleManage = async () => {
    setBusy(true);
    setError(null);
    try {
      const url = await openBillingPortal();
      window.location.href = url;
    } catch (err) {
      const message = toUserFacingError(err, t('mobilePremium.errorBillingPortalFailed'));
      setError(message);
      setBusy(false);
    }
  };

  const handleRefreshStatus = async () => {
    setError(null);
    try {
      await refreshPremiumStatus();
    } catch (err) {
      const message = toUserFacingError(err, t('mobilePremium.errorCheckoutFailed'));
      setError(message);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark font-manrope overflow-hidden">
      <div className="sticky top-0 z-20 bg-mobile-bg-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={() => history.goBack()}
            className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{t('mobilePremium.title')}</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        <div className="px-4 py-5 space-y-5">
          <div className="relative overflow-hidden rounded-3xl bg-mobile-card-dark ring-1 ring-white/10 p-5">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(19,236,55,0.22),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.06),transparent_45%)]" />

            <div className="relative flex items-start justify-between gap-4">
              <div>
                <p className="text-white text-xl font-extrabold tracking-tight">{t('mobilePremium.cardTitle')}</p>
                <p className="text-mobile-text-muted text-sm mt-2 leading-relaxed">
                  {t('mobilePremium.cardSubtitle')}
                </p>
              </div>
              <div className="size-14 shrink-0 rounded-2xl bg-mobile-primary/15 ring-1 ring-mobile-primary/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-mobile-primary text-[32px]">workspace_premium</span>
              </div>
            </div>
          </div>

          {checkoutStatusMessage && (
            <div className="rounded-2xl border border-mobile-primary/40 bg-mobile-primary/10 p-4">
              <p className="text-mobile-primary text-sm font-semibold">{checkoutStatusMessage}</p>
            </div>
          )}

          {!authConfigured && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="text-amber-200 text-sm font-semibold">{t('mobilePremium.backendNotConfiguredTitle')}</p>
              <p className="text-amber-100/90 text-xs mt-2">
                {t('mobilePremium.backendNotConfiguredSubtitle')}
              </p>
            </div>
          )}

          {!user ? (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-3">
              <p className="text-white text-sm">
                {t('mobilePremium.loginRequired')}
              </p>
              <button
                onClick={() => history.push('/auth')}
                className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark"
              >
                {t('mobilePremium.goToLogin')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                <p className="text-white text-base font-bold">
                  {t('mobilePremium.statusLabel').replace(
                    '{status}',
                    premium.isPremium ? t('mobilePremium.statusPremiumActive') : t('mobilePremium.statusFreePlan')
                  )}
                </p>
                {premium.status && (
                  <p className="text-mobile-text-muted text-sm mt-1 uppercase tracking-wide">{premium.status}</p>
                )}
                {premium.plan && (
                  <p className="text-mobile-text-muted text-sm mt-1">
                    {t('mobilePremium.planLabel').replace('{plan}', premium.plan)}
                  </p>
                )}
                {premium.currentPeriodEnd && (
                  <p className="text-mobile-text-muted text-sm mt-1">
                    {t('mobilePremium.renewsLabel').replace('{date}', new Date(premium.currentPeriodEnd).toLocaleString())}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
                  {error}
                </div>
              )}

              {premiumLoading && (
                <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 text-mobile-text-muted text-sm">
                  {t('mobilePremium.syncing')}
                </div>
              )}

              {premium.isPremium ? (
                <button
                  onClick={handleManage}
                  disabled={busy}
                  className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark disabled:opacity-60"
                >
                  {busy ? t('mobilePremium.working') : t('mobilePremium.manageSubscription')}
                </button>
              ) : (
                <button
                  onClick={handleUpgrade}
                  disabled={busy}
                  className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark disabled:opacity-60"
                >
                  {busy ? t('mobilePremium.working') : t('mobilePremium.upgradeMonthly')}
                </button>
              )}

              <button
                onClick={() => void handleRefreshStatus()}
                className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white"
              >
                {t('mobilePremium.refreshStatus')}
              </button>
            </div>
          )}

          <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
            <p className="text-white font-bold">{t('mobilePremium.includedTitle')}</p>
            <p className="text-mobile-text-muted text-xs mt-1">{t('mobilePremium.includedResetNote')}</p>

            <div className="mt-3 space-y-2">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-mobile-surface-dark/70 px-3 py-3 ring-1 ring-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 size-9 rounded-xl bg-mobile-primary/15 ring-1 ring-mobile-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-mobile-primary text-[18px]">center_focus_strong</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t('mobilePremium.featurePlantId')}</p>
                    <p className="text-xs text-mobile-text-muted mt-1 leading-relaxed">
                      {t('mobilePremium.featurePlantIdDescription')}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-mobile-text-muted whitespace-nowrap pt-1">
                  {t('mobilePremium.perDay').replace('{count}', String(PREMIUM_LIMITS.plantId.daily))} /{' '}
                  {t('mobilePremium.perMonth').replace('{count}', String(PREMIUM_LIMITS.plantId.monthly))}
                </p>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl bg-mobile-surface-dark/70 px-3 py-3 ring-1 ring-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 size-9 rounded-xl bg-mobile-primary/15 ring-1 ring-mobile-primary/20 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-mobile-primary text-[18px]">ecg_heart</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t('mobilePremium.featureAiDoctor')}</p>
                    <p className="text-xs text-mobile-text-muted mt-1 leading-relaxed">
                      {t('mobilePremium.featureAiDoctorDescription')}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-mobile-text-muted whitespace-nowrap pt-1">
                  {t('mobilePremium.perDay').replace('{count}', String(PREMIUM_LIMITS.aiDoctor.daily))} /{' '}
                  {t('mobilePremium.perMonth').replace('{count}', String(PREMIUM_LIMITS.aiDoctor.monthly))}
                </p>
              </div>
            </div>

            <p className="mt-4 text-[11px] text-mobile-text-muted leading-relaxed">
              {t('mobileUpsell.disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobilePremium;
