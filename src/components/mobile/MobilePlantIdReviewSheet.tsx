import React from 'react';
import { PlantDBEntry } from '../../services/DatabaseService';
import { useI18n } from '../../i18n';

interface MobilePlantIdReviewSheetProps {
  isOpen: boolean;
  reason: 'ambiguous' | 'not_found';
  detectedName: string;
  probability?: number | null;
  suggestedPlant?: PlantDBEntry | null;
  onUseSuggested?: () => void;
  onChooseManually: () => void;
  onClose: () => void;
}

const MobilePlantIdReviewSheet: React.FC<MobilePlantIdReviewSheetProps> = ({
  isOpen,
  reason,
  detectedName,
  probability,
  suggestedPlant,
  onUseSuggested,
  onChooseManually,
  onClose
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const hasUseAction = Boolean(suggestedPlant && onUseSuggested);
  const confidence = typeof probability === 'number'
    ? `${Math.round(probability * 100)}%`
    : null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full rounded-t-3xl border-t border-white/10 bg-mobile-bg-dark p-5 pb-7 shadow-2xl">
        <div className="mx-auto w-10 h-1.5 rounded-full bg-white/20 mb-4" />

        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-mobile-text-muted">{t('mobilePlantId.reviewTitle')}</p>
            <h3 className="text-white text-lg font-bold mt-1">
              {reason === 'ambiguous' ? t('mobilePlantId.reviewAmbiguous') : t('mobilePlantId.reviewNoLocal')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center text-mobile-text-muted"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="mt-3 rounded-2xl border border-white/10 bg-mobile-surface-dark p-3">
          <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('mobilePlantId.detectedByCamera')}</p>
          <p className="text-sm text-white font-semibold mt-1 break-words">{detectedName || t('labels.unknown')}</p>
          {confidence && (
            <p className="text-xs text-mobile-text-muted mt-1">
              {t('mobilePlantId.matchConfidence').replace('{value}', confidence)}
            </p>
          )}
        </div>

        {suggestedPlant && (
          <div className="mt-3 rounded-2xl border border-mobile-primary/30 bg-mobile-primary/10 p-3">
            <p className="text-[11px] uppercase tracking-wide text-mobile-text-muted">{t('mobilePlantId.suggestedLocal')}</p>
            <p className="text-white font-semibold mt-1">{suggestedPlant.common_name_en || suggestedPlant.common_name_ro}</p>
            <p className="text-xs text-mobile-text-muted italic">{suggestedPlant.scientific_name}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={onChooseManually}
            className="rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
          >
            {t('mobilePlantId.chooseManually')}
          </button>
          <button
            onClick={onUseSuggested}
            disabled={!hasUseAction}
            className="rounded-xl border border-mobile-primary/30 bg-mobile-primary/15 px-3 py-3 text-sm font-bold text-mobile-primary hover:bg-mobile-primary/20 transition-colors disabled:opacity-45"
          >
            {t('mobilePlantId.useThis')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobilePlantIdReviewSheet;

