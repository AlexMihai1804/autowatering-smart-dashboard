import React from 'react';
import { useI18n } from '../../i18n';

interface AdvancedSectionProps {
  title?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  title,
  subtitle,
  defaultOpen = false,
  children
}) => {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(defaultOpen);
  const label = title || t('common.advanced');

  return (
    <div className="rounded-2xl border border-mobile-border-dark bg-mobile-surface-dark overflow-hidden">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{label}</p>
          {subtitle && <p className="text-xs text-mobile-text-muted mt-0.5">{subtitle}</p>}
        </div>
        <span className="material-symbols-outlined text-white/70">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="border-t border-mobile-border-dark px-4 py-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default AdvancedSection;

