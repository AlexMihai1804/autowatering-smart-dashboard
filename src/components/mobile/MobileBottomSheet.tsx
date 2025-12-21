import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
}

const MobileBottomSheet: React.FC<MobileBottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[95] w-full bg-[#111812] rounded-t-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Handle */}
            <div className="w-full flex justify-center pt-5 pb-2 cursor-pointer" onClick={onClose}>
              <div className="h-1.5 w-12 rounded-full bg-[#3b543f]" />
            </div>

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="px-6 pt-2 pb-4 flex items-center justify-between">
                <div>
                  {title && (
                    <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
                  )}
                  {subtitle && (
                    <p className="text-mobile-text-muted text-xs font-medium tracking-wide uppercase mt-1">
                      {subtitle}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full hover:bg-white/5 transition-colors text-white/70"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              {children}
            </div>

            {/* Safe area spacer */}
            <div className="h-6 w-full bg-[#111812]" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileBottomSheet;
