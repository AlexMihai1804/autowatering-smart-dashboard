import React, { useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { isGoogleSignInConfigured } from '../../lib/cognitoClient';
import { useAppStore } from '../../store/useAppStore';

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err.trim();

  if (err && typeof err === 'object') {
    const anyErr = err as Record<string, unknown>;
    const message = typeof anyErr.message === 'string' ? anyErr.message : '';
    if (message.trim()) return message.trim();

    const errorMessage = typeof anyErr.errorMessage === 'string' ? anyErr.errorMessage : '';
    if (errorMessage.trim()) return errorMessage.trim();

    const error = typeof anyErr.error === 'string' ? anyErr.error : '';
    if (error.trim()) return error.trim();

    try {
      return JSON.stringify(err);
    } catch {
      // ignore stringify failures
    }
  }

  return fallback;
}

function isProbablyEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!trimmed.includes('@')) return false;
  if (trimmed.startsWith('@') || trimmed.endsWith('@')) return false;
  return true;
}

function passwordPolicyFailure(password: string): string | null {
  if (password.length < 8) return 'min_length';
  if (!/[a-z]/.test(password)) return 'lowercase';
  if (!/[A-Z]/.test(password)) return 'uppercase';
  if (!/[0-9]/.test(password)) return 'number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'symbol';
  return null;
}

const MobileAuth: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t } = useI18n();
  const { connectionState } = useAppStore();
  const isConnected = connectionState === 'connected';
  const {
    authConfigured,
    user,
    isGuest,
    loading,
    premium,
    signInUser,
    signUpUser,
    confirmSignUp,
    resendSignUpCode,
    signInWithGoogle,
    signOutUser,
    continueAsGuest,
    exitGuestMode
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'confirm'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const returnTo = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const raw = params.get('returnTo')?.trim() || '';
    if (!raw) return null;
    if (!raw.startsWith('/')) return null;
    if (raw.startsWith('//')) return null;
    return raw;
  }, [location.search]);

  const title = useMemo(() => {
    if (user) return t('mobileAuth.titleAccount');
    if (mode === 'confirm') return t('mobileAuth.titleConfirm');
    return mode === 'login' ? t('mobileAuth.titleLogin') : t('mobileAuth.titleSignup');
  }, [mode, t, user]);

  const defaultReturnTo = isConnected ? '/dashboard' : '/welcome';

  const handleGuest = () => {
    continueAsGuest();
    const guestAllowed = returnTo
      && !returnTo.startsWith('/ai-doctor')
      && !returnTo.startsWith('/premium')
      && !returnTo.startsWith('/profile')
      && !returnTo.startsWith('/auth');

    history.replace(guestAllowed ? returnTo : defaultReturnTo);
  };

  const handleSubmit = async () => {
    if (!authConfigured) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError(t('mobileAuth.errorEmailPasswordRequired'));
      return;
    }

    if (!isProbablyEmail(trimmedEmail)) {
      setError(t('mobileAuth.errorEmailInvalid'));
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setError(t('mobileAuth.errorPasswordsDontMatch'));
      return;
    }

    if (mode === 'signup') {
      const failure = passwordPolicyFailure(password);
      if (failure) {
        setError(t('mobileAuth.errorPasswordPolicy'));
        return;
      }
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        await signInUser(trimmedEmail, password);
      } else if (mode === 'signup') {
        const result = await signUpUser(trimmedEmail, password);
        if (!result.userConfirmed) {
          setPendingEmail(trimmedEmail);
          setMode('confirm');
          setInfo(t('mobileAuth.confirmCodeSentHint'));
          return;
        }
      } else {
        // confirm mode submit handled separately
      }
      history.replace(returnTo || defaultReturnTo);
    } catch (err) {
      const anyErr = err as any;
      if (anyErr && typeof anyErr === 'object' && anyErr.cognitoErrorType === 'UserNotConfirmedException') {
        setPendingEmail(trimmedEmail);
        setMode('confirm');
        setInfo(t('mobileAuth.confirmCodeSentHint'));
        setError(null);
      } else {
        setError(extractErrorMessage(err, t('mobileAuth.errorAuthFailed')));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (!authConfigured) return;

    const targetEmail = (pendingEmail || email).trim();
    const code = confirmationCode.trim();
    if (!targetEmail || !code) {
      setError(t('mobileAuth.errorConfirmationCodeRequired'));
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await confirmSignUp(targetEmail, code);
      await signInUser(targetEmail, password);
      history.replace(returnTo || defaultReturnTo);
    } catch (err) {
      setError(extractErrorMessage(err, t('mobileAuth.errorAuthFailed')));
    } finally {
      setBusy(false);
    }
  };

  const handleResendCode = async () => {
    if (!authConfigured) return;

    const targetEmail = (pendingEmail || email).trim();
    if (!targetEmail) {
      setError(t('mobileAuth.errorEmailPasswordRequired'));
      return;
    }

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await resendSignUpCode(targetEmail);
      setInfo(t('mobileAuth.confirmCodeResentHint'));
    } catch (err) {
      setError(extractErrorMessage(err, t('mobileAuth.errorAuthFailed')));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!authConfigured) return;

    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await signInWithGoogle();
      history.replace(returnTo || defaultReturnTo);
    } catch (err) {
      setError(extractErrorMessage(err, t('mobileAuth.errorAuthFailed')));
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOutUser();
      history.replace('/auth');
    } catch (err) {
      setError(extractErrorMessage(err, t('mobileAuth.errorAuthFailed')));
    } finally {
      setBusy(false);
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
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{title}</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        <div className="px-4 py-5 space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
              <p className="text-mobile-text-muted text-sm">{t('mobileAuth.loading')}</p>
            </div>
          ) : user ? (
            <div className="space-y-4">
              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                <p className="text-white text-base font-bold">{user.email || t('mobileAuth.signedInUserFallback')}</p>
                <p className="text-mobile-text-muted text-sm mt-1">
                  {t('mobileAuth.planLabel').replace(
                    '{plan}',
                    premium.isPremium ? t('mobileAuth.planPremium') : t('mobileAuth.planFree')
                  )}
                </p>
                {premium.status && (
                  <p className="text-mobile-text-muted text-xs mt-1 uppercase tracking-wide">{premium.status}</p>
                )}
              </div>

              {returnTo && (
                <button
                  onClick={() => history.replace(returnTo)}
                  className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark"
                >
                  {t('mobileAuth.continueTo')}
                </button>
              )}

              <button
                onClick={() => history.push('/profile')}
                className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white"
              >
                {t('mobileAuth.openProfile')}
              </button>

              <button
                onClick={() => history.push('/premium')}
                className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark"
              >
                {t('mobileAuth.manageSubscription')}
              </button>

              <button
                onClick={handleSignOut}
                disabled={busy}
                className="w-full rounded-xl py-3 font-bold bg-white/10 text-white disabled:opacity-60"
              >
                {busy ? t('mobileProfile.working') : t('mobileAuth.signOut')}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                <p className="text-white text-base font-bold">{t('mobileAuth.accessTitle')}</p>
                <p className="text-mobile-text-muted text-sm mt-1">
                  {t('mobileAuth.accessSubtitle')}
                </p>
              </div>

              {authConfigured ? (
                <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-4">
                  {mode !== 'confirm' && isGoogleSignInConfigured && (
                    <button
                      onClick={() => void handleGoogleSignIn()}
                      disabled={busy}
                      className="w-full rounded-xl py-3 font-bold bg-white text-mobile-bg-dark disabled:opacity-60 flex items-center justify-center gap-3"
                    >
                      <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/80 ring-1 ring-black/10">
                        <span className="text-[13px] font-extrabold text-blue-600">G</span>
                      </span>
                      {t('mobileAuth.continueWithGoogle')}
                    </button>
                  )}

                  {mode !== 'confirm' ? (
                    <>
                      <div className="flex gap-2 bg-mobile-surface-dark p-1 rounded-xl">
                        <button
                          onClick={() => setMode('login')}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'login'
                            ? 'bg-mobile-primary text-mobile-bg-dark'
                            : 'text-mobile-text-muted'
                            }`}
                        >
                          {t('mobileAuth.tabLogin')}
                        </button>
                        <button
                          onClick={() => setMode('signup')}
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${mode === 'signup'
                            ? 'bg-mobile-primary text-mobile-bg-dark'
                            : 'text-mobile-text-muted'
                            }`}
                        >
                          {t('mobileAuth.tabSignup')}
                        </button>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-white">{t('mobileAuth.emailLabel')}</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(event) => setEmail(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                          placeholder={t('mobileAuth.emailPlaceholder')}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-white">{t('mobileAuth.passwordLabel')}</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                          placeholder={t('mobileAuth.passwordPlaceholder')}
                        />
                        {mode === 'signup' && (
                          <p className="mt-2 text-xs text-mobile-text-muted">
                            {t('mobileAuth.passwordPolicyHint')}
                          </p>
                        )}
                      </div>

                      {mode === 'signup' && (
                        <div>
                          <label className="text-sm font-semibold text-white">{t('mobileAuth.confirmPasswordLabel')}</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(event) => setConfirmPassword(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                            placeholder={t('mobileAuth.confirmPasswordPlaceholder')}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="rounded-xl bg-mobile-surface-dark ring-1 ring-white/5 p-3">
                        <p className="text-white text-sm font-semibold">{t('mobileAuth.confirmCodeTitle')}</p>
                        <p className="text-mobile-text-muted text-xs mt-1">
                          {t('mobileAuth.confirmCodeSubtitle').replace('{email}', pendingEmail || email || '-')}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-white">{t('mobileAuth.confirmationCodeLabel')}</label>
                        <input
                          type="text"
                          value={confirmationCode}
                          onChange={(event) => setConfirmationCode(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                          placeholder={t('mobileAuth.confirmationCodePlaceholder')}
                          inputMode="numeric"
                          autoComplete="one-time-code"
                        />
                      </div>
                    </>
                  )}

                  {info && (
                    <div className="rounded-xl border border-mobile-border-dark bg-white/5 px-3 py-2 text-sm text-white/90">
                      {info}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                      {error}
                    </div>
                  )}

                  {mode !== 'confirm' ? (
                    <button
                      onClick={handleSubmit}
                      disabled={busy}
                      className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark disabled:opacity-60"
                    >
                      {busy ? t('mobileProfile.working') : mode === 'login' ? t('mobileAuth.submitLogin') : t('mobileAuth.submitSignup')}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => void handleConfirm()}
                        disabled={busy}
                        className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark disabled:opacity-60"
                      >
                        {busy ? t('mobileProfile.working') : t('mobileAuth.submitConfirm')}
                      </button>
                      <button
                        onClick={() => void handleResendCode()}
                        disabled={busy}
                        className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white disabled:opacity-60"
                      >
                        {t('mobileAuth.resendCode')}
                      </button>
                      <button
                        onClick={() => {
                          setMode('login');
                          setError(null);
                          setInfo(null);
                        }}
                        disabled={busy}
                        className="w-full rounded-xl py-3 font-semibold bg-mobile-surface-dark text-mobile-text-muted disabled:opacity-60"
                      >
                        {t('mobileAuth.backToLogin')}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-amber-200 text-sm font-semibold">{t('mobileAuth.firebaseNotConfiguredTitle')}</p>
                  <p className="text-amber-100/90 text-xs mt-2">
                    {t('mobileAuth.firebaseNotConfiguredSubtitle')}
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-3">
                <p className="text-white text-sm font-semibold">
                  {isGuest ? t('mobileAuth.guestTitleActive') : t('mobileAuth.guestTitle')}
                </p>
                <button
                  onClick={handleGuest}
                  className="w-full rounded-xl py-3 font-bold bg-white/10 text-white"
                >
                  {t('mobileAuth.continueAsGuest')}
                </button>
                {isGuest && (
                  <button
                    onClick={exitGuestMode}
                    className="w-full rounded-xl py-3 font-semibold bg-mobile-surface-dark text-mobile-text-muted"
                  >
                    {t('mobileAuth.exitGuestMode')}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileAuth;
