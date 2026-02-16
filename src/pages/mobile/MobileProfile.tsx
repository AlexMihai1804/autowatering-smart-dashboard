import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth';
import { useI18n } from '../../i18n';
import { useSettings } from '../../hooks/useSettings';
import { useTheme } from '../../hooks/useTheme';

type ProfileSection = 'overview' | 'details' | 'security' | 'danger';

const resolveProfileSection = (search: string): ProfileSection => {
  const section = new URLSearchParams(search).get('section');
  if (section === 'details' || section === 'security' || section === 'danger') {
    return section;
  }
  return 'overview';
};

const MobileProfile: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  const { t, language } = useI18n();
  const { useMetric } = useSettings();
  const { resolvedTheme } = useTheme();
  const {
    user,
    profile,
    profileLoading,
    saveProfile,
    refreshProfile,
    sendVerification,
    changePasswordForCurrentUser,
    deleteCurrentAccount,
    signOutUser
  } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [country, setCountry] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  const [saving, setSaving] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeSection = useMemo<ProfileSection>(() => resolveProfileSection(location.search), [location.search]);

  useEffect(() => {
    if (!user) {
      history.replace('/auth?returnTo=/profile');
      return;
    }
    void refreshProfile();
  }, [history, refreshProfile, user]);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.displayName || '');
    setPhone(profile.phone || '');
    setCompany(profile.company || '');
    setCountry(profile.country || '');
  }, [profile]);

  const profileDirty = useMemo(() => {
    if (!profile) return false;
    return (displayName.trim() !== (profile.displayName || ''))
      || (phone.trim() !== (profile.phone || ''))
      || (company.trim() !== (profile.company || ''))
      || (country.trim() !== (profile.country || ''));
  }, [company, country, displayName, phone, profile]);

  const handleSaveProfile = async () => {
    if (!profileDirty) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await saveProfile({
        displayName: displayName.trim(),
        phone: phone.trim(),
        company: company.trim(),
        country: country.trim(),
        language,
        unitSystem: useMetric ? 'metric' : 'imperial',
        theme: resolvedTheme
      });
      setMessage(t('mobileProfile.messageProfileUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mobileProfile.errorProfileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleSendVerification = async () => {
    setSecurityBusy(true);
    setError(null);
    setMessage(null);
    try {
      await sendVerification();
      setMessage(t('mobileProfile.messageVerificationSent'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mobileProfile.errorVerificationFailed'));
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError(t('mobileProfile.errorPasswordMismatch'));
      return;
    }

    setSecurityBusy(true);
    setError(null);
    setMessage(null);
    try {
      await changePasswordForCurrentUser(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(t('mobileProfile.messagePasswordUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mobileProfile.errorPasswordChangeFailed'));
    } finally {
      setSecurityBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim().toUpperCase() !== 'DELETE') {
      setError(t('mobileProfile.errorDeleteTypeDelete'));
      return;
    }

    setDeleteBusy(true);
    setError(null);
    setMessage(null);
    try {
      await deleteCurrentAccount(deletePassword);
      history.replace('/auth');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mobileProfile.errorDeleteFailed'));
    } finally {
      setDeleteBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    history.replace('/auth');
  };

  const setSection = (section: ProfileSection) => {
    if (section === 'overview') {
      history.push('/profile');
      return;
    }
    history.push(`/profile?section=${section}`);
  };

  const sectionTitle = useMemo(() => {
    if (activeSection === 'details') return t('mobileProfile.sectionProfileDetails');
    if (activeSection === 'security') return t('mobileProfile.sectionSecurity');
    if (activeSection === 'danger') return t('mobileProfile.sectionAccountActions');
    return t('mobileProfile.title');
  }, [activeSection, t]);

  const handleBack = () => {
    if (activeSection !== 'overview') {
      // Use replace so "Back" doesn't bounce between overview <-> section.
      history.replace('/profile');
      return;
    }
    history.goBack();
  };

  if (!user) return null;

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark font-manrope overflow-hidden">
      <div className="sticky top-0 z-20 bg-mobile-bg-dark/95 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={handleBack}
            className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{sectionTitle}</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        <div className="px-4 py-5 space-y-4">
          <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
            <p className="text-white text-base font-bold">{user.email || 'Account'}</p>
            <p className="text-mobile-text-muted text-sm mt-1">
              {t('mobileProfile.emailStatus').replace(
                '{status}',
                profile?.emailVerified ? t('mobileProfile.emailVerified') : t('mobileProfile.emailNotVerified')
              )}
            </p>
          </div>

          {profileLoading && activeSection === 'overview' && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 text-mobile-text-muted text-sm">
              {t('mobileProfile.loading')}
            </div>
          )}

          {message && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-200 text-sm">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-red-200 text-sm">
              {error}
            </div>
          )}

          {activeSection === 'overview' && (
            <>
              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 overflow-hidden divide-y divide-white/5">
                <button
                  onClick={() => setSection('details')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-white/5"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 text-gray-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{t('mobileProfile.sectionProfileDetails')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                </button>
                <button
                  onClick={() => setSection('security')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-white/5"
                >
                  <div className="w-9 h-9 rounded-full bg-white/10 text-gray-300 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{t('mobileProfile.sectionSecurity')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                </button>
                <button
                  onClick={() => history.push('/premium')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-white/5"
                >
                  <div className="w-9 h-9 rounded-full bg-mobile-primary/20 text-mobile-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">workspace_premium</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm">{t('mobileAuth.manageSubscription')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                </button>
                <button
                  onClick={() => setSection('danger')}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-white/5"
                >
                  <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">warning</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-red-300 font-semibold text-sm">{t('mobileProfile.sectionAccountActions')}</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-500">chevron_right</span>
                </button>
              </div>
            </>
          )}

          {activeSection === 'details' && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-3">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={t('mobileProfile.placeholderDisplayName')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <input
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder={t('mobileProfile.placeholderPhone')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <input
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder={t('mobileProfile.placeholderCompany')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                placeholder={t('mobileProfile.placeholderCountry')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <button
                onClick={() => void handleSaveProfile()}
                disabled={!profileDirty || saving}
                className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark disabled:opacity-60"
              >
                {saving ? t('mobileProfile.saving') : t('mobileProfile.saveProfile')}
              </button>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-3">
              {!profile?.emailVerified && (
                <button
                  onClick={() => void handleSendVerification()}
                  disabled={securityBusy}
                  className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white disabled:opacity-60"
                >
                  {t('mobileProfile.sendVerificationEmail')}
                </button>
              )}
              <input
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder={t('mobileProfile.placeholderCurrentPassword')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder={t('mobileProfile.placeholderNewPassword')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder={t('mobileProfile.placeholderConfirmNewPassword')}
                className="w-full rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
              />
              <button
                onClick={() => void handleChangePassword()}
                disabled={securityBusy}
                className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white disabled:opacity-60"
              >
                {securityBusy ? t('mobileProfile.working') : t('mobileProfile.changePassword')}
              </button>
            </div>
          )}

          {activeSection === 'danger' && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-3">
              <button
                onClick={() => void handleSignOut()}
                className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white"
              >
                {t('mobileProfile.signOut')}
              </button>
              <div className="h-px bg-white/10" />
              <p className="text-red-300 text-sm font-semibold">{t('mobileProfile.deleteAccountTitle')}</p>
              <p className="text-red-200/80 text-xs">
                {t('mobileProfile.deleteAccountHint')}
              </p>
              <input
                type="password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                placeholder={t('mobileProfile.placeholderDeletePassword')}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-white placeholder:text-red-200/70 focus:outline-none focus:border-red-400"
              />
              <input
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                placeholder={t('mobileProfile.placeholderTypeDelete')}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-white placeholder:text-red-200/70 focus:outline-none focus:border-red-400"
              />
              <button
                onClick={() => void handleDeleteAccount()}
                disabled={deleteBusy}
                className="w-full rounded-xl py-3 font-bold bg-red-500 text-white disabled:opacity-60"
              >
                {deleteBusy ? t('mobileProfile.deleting') : t('mobileProfile.deleteAccountButton')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileProfile;
