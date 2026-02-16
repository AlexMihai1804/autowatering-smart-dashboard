import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';

interface MobileConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  variant?: 'danger' | 'warning' | 'success' | 'info';
  requireConfirmation?: string; // If set, user must type this to confirm
  loading?: boolean;
}

const MobileConfirmModal: React.FC<MobileConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText,
  cancelText,
  icon = 'warning',
  variant = 'danger',
  requireConfirmation,
  loading = false,
}) => {
  const { t } = useI18n();
  const [confirmInput, setConfirmInput] = React.useState('');
  const confirmLabel = confirmText ?? t('common.confirm');
  const cancelLabel = cancelText ?? t('common.cancel');

  const variantColors = {
    danger: {
      bg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      buttonBg: 'bg-red-500 hover:bg-red-600',
      glowColor: 'shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]',
    },
    warning: {
      bg: 'bg-amber-500/10',
      iconColor: 'text-amber-500',
      buttonBg: 'bg-amber-500 hover:bg-amber-600',
      glowColor: 'shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]',
    },
    success: {
      bg: 'bg-mobile-primary/10',
      iconColor: 'text-mobile-primary',
      buttonBg: 'bg-mobile-primary hover:bg-green-400',
      glowColor: 'shadow-[0_0_20px_-5px_rgba(19,236,55,0.3)]',
    },
    info: {
      bg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      buttonBg: 'bg-blue-500 hover:bg-blue-600',
      glowColor: 'shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]',
    },
  };

  const colors = variantColors[variant];
  const canConfirm = !loading && (!requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase());

  const handleConfirm = () => {
    if (!loading && canConfirm) {
      onConfirm();
      setConfirmInput('');
    }
  };

  const handleClose = () => {
    onClose();
    setConfirmInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-[360px] bg-mobile-card-dark rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mt-8 mb-2 flex items-center justify-center">
              <div className={`flex items-center justify-center w-16 h-16 rounded-full ${colors.bg}`}>
                <span className={`material-symbols-outlined text-[32px] ${colors.iconColor}`}>
                  {icon}
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="w-full px-6 text-center">
              <h2 className="text-white tracking-tight text-2xl font-bold leading-tight py-2">
                {title}
              </h2>
            </div>

            {/* Message */}
            <div className="w-full px-6 text-center">
              <p className="text-mobile-text-muted text-base font-normal leading-relaxed">
                {message}
              </p>
            </div>

            {/* Confirmation Input */}
            {requireConfirmation && (
              <div className="w-full px-6 pt-6 pb-2">
                <label className="flex flex-col w-full">
                  <span className="text-xs font-semibold text-mobile-text-muted uppercase tracking-wider mb-2 text-center">
                    {t('mobileConfirm.typeToConfirm').replace('{value}', requireConfirmation)}
                  </span>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    className="w-full h-14 rounded-lg border border-mobile-border-dark bg-mobile-bg-dark 
                             text-white text-center text-base font-bold tracking-widest uppercase
                             placeholder:text-mobile-text-muted/50 focus:outline-none focus:ring-2 
                             focus:ring-mobile-primary/50 focus:border-mobile-primary"
                    placeholder={requireConfirmation}
                  />
                </label>
              </div>
            )}

            {/* Buttons */}
            <div className="w-full px-6 py-6 flex flex-col gap-3">
              <button
                onClick={handleConfirm}
                disabled={!canConfirm}
                className={`w-full h-12 rounded-lg font-bold text-base transition-all
                          ${canConfirm 
                            ? `${colors.buttonBg} ${colors.glowColor} text-white` 
                            : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
              >
                {loading ? t('common.loading') : confirmLabel}
              </button>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-full h-12 rounded-lg bg-transparent border border-mobile-border-dark 
                         text-mobile-text-muted font-semibold text-sm hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MobileConfirmModal;
