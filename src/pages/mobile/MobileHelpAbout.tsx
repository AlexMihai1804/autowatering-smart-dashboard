import React from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';

const MobileHelpAbout: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();

  const appVersion = '1.0.0';
  const buildNumber = '2024.12.1';

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
          {t('mobileHelpAbout.title')}
        </h2>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 gap-6 pb-8">
        {/* App Info Card */}
        <div className="flex flex-col items-center py-8">
          <div className="size-24 rounded-3xl bg-gradient-to-br from-mobile-primary/20 to-mobile-primary/5 flex items-center justify-center mb-4 shadow-lg">
            <span className="material-symbols-outlined text-mobile-primary text-5xl">water_drop</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{t('mobileHelpAbout.appName')}</h1>
          <p className="text-mobile-text-muted text-sm mt-1">{t('mobileHelpAbout.appTagline')}</p>
          <div className="flex items-center gap-2 mt-3">
            <span className="text-mobile-text-muted text-xs">
              {t('mobileHelpAbout.versionBuild')
                .replace('{version}', appVersion)
                .replace('{build}', buildNumber)}
            </span>
          </div>
        </div>

        {/* Help Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('mobileHelpAbout.helpSection.title')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined">menu_book</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('mobileHelpAbout.helpSection.userGuide.title')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('mobileHelpAbout.helpSection.userGuide.subtitle')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined">help</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('mobileHelpAbout.helpSection.faq.title')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('mobileHelpAbout.helpSection.faq.subtitle')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                  <span className="material-symbols-outlined">contact_support</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('mobileHelpAbout.helpSection.contact.title')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('mobileHelpAbout.helpSection.contact.subtitle')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                  <span className="material-symbols-outlined">bug_report</span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-base font-medium text-white">{t('mobileHelpAbout.helpSection.reportBug.title')}</span>
                  <span className="text-xs text-mobile-text-muted">{t('mobileHelpAbout.helpSection.reportBug.subtitle')}</span>
                </div>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* Legal Section */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('mobileHelpAbout.legalSection.title')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileHelpAbout.legalSection.terms')}</span>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                open_in_new
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">privacy_tip</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileHelpAbout.legalSection.privacy')}</span>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                open_in_new
              </span>
            </button>

            <button className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined">license</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileHelpAbout.legalSection.licenses')}</span>
              </div>
              <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-mobile-text-muted/50 text-xs">
            {t('mobileHelpAbout.footerLine1')}
          </p>
          <p className="text-mobile-text-muted/30 text-xs mt-1">
            {t('mobileHelpAbout.footerLine2').replace('{year}', '2024')}
          </p>
        </div>
      </main>
    </div>
  );
};

export default MobileHelpAbout;



