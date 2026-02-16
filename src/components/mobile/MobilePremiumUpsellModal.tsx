import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useI18n } from '../../i18n';
import { PREMIUM_LIMITS } from '../../constants/premiumLimits';

interface MobilePremiumUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
  title?: string;
  subtitle?: string;
  primaryLabel: string;
  secondaryLabel?: string;
}

const MobilePremiumUpsellModal: React.FC<MobilePremiumUpsellModalProps> = ({
  isOpen,
  onClose,
  onPrimaryAction,
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
}) => {
  const { t } = useI18n();

  const resolvedTitle = title ?? t('mobileUpsell.title');
  const resolvedSubtitle = subtitle ?? t('mobileUpsell.subtitle');
  const resolvedSecondary = secondaryLabel ?? t('mobileUpsell.notNow');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="relative w-full max-w-[380px] rounded-3xl bg-mobile-card-dark shadow-2xl ring-1 ring-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient gradient */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(19,236,55,0.18),transparent_55%)]" />

            <div className="relative p-6">
              <div className="flex items-center justify-center">
                <div className="size-16 rounded-2xl bg-mobile-primary/15 ring-1 ring-mobile-primary/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-mobile-primary text-[34px]">workspace_premium</span>
                </div>
              </div>

              <h2 className="mt-4 text-white text-2xl font-bold tracking-tight text-center">
                {resolvedTitle}
              </h2>
              <p className="mt-2 text-mobile-text-muted text-sm text-center leading-relaxed">
                {resolvedSubtitle}
              </p>

              <div className="mt-5 rounded-2xl bg-mobile-surface-dark/70 ring-1 ring-white/5 p-4">
                <p className="text-white font-bold text-sm">{t('mobilePremium.includedTitle')}</p>
                <p className="text-mobile-text-muted text-xs mt-1">{t('mobilePremium.includedResetNote')}</p>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-mobile-bg-dark/60 px-3 py-2 ring-1 ring-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-mobile-primary text-[18px]">center_focus_strong</span>
                      <p className="text-sm text-white">{t('mobilePremium.featurePlantId')}</p>
                    </div>
                    <p className="text-xs font-semibold text-mobile-text-muted">
                      {t('mobilePremium.perDay').replace('{count}', String(PREMIUM_LIMITS.plantId.daily))} /{' '}
                      {t('mobilePremium.perMonth').replace('{count}', String(PREMIUM_LIMITS.plantId.monthly))}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl bg-mobile-bg-dark/60 px-3 py-2 ring-1 ring-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-mobile-primary text-[18px]">ecg_heart</span>
                      <p className="text-sm text-white">{t('mobilePremium.featureAiDoctor')}</p>
                    </div>
                    <p className="text-xs font-semibold text-mobile-text-muted">
                      {t('mobilePremium.perDay').replace('{count}', String(PREMIUM_LIMITS.aiDoctor.daily))} /{' '}
                      {t('mobilePremium.perMonth').replace('{count}', String(PREMIUM_LIMITS.aiDoctor.monthly))}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={onPrimaryAction}
                  className="w-full rounded-xl py-3 font-bold bg-mobile-primary text-mobile-bg-dark shadow-[0_0_20px_-6px_rgba(19,236,55,0.35)]"
                >
                  {primaryLabel}
                </button>

                <button
                  onClick={onClose}
                  className="w-full rounded-xl py-3 font-semibold bg-white/10 text-white hover:bg-white/15 transition-colors"
                >
                  {resolvedSecondary}
                </button>
              </div>

              <p className="mt-4 text-[11px] text-mobile-text-muted text-center leading-relaxed">
                {t('mobileUpsell.disclaimer')}
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobilePremiumUpsellModal;
