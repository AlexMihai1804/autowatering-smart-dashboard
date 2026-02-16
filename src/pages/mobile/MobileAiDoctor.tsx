import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { AiDoctorResult, aiDoctorService } from '../../services/AiDoctorService';
import { useAuth } from '../../auth';
import MobilePremiumUpsellModal from '../../components/mobile/MobilePremiumUpsellModal';

const formatProbability = (value: number | null | undefined): string => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '--';
  const normalized = value > 1 ? value : value * 100;
  return `${Math.max(0, Math.min(100, normalized)).toFixed(1)}%`;
};

const MobileAiDoctor: React.FC = () => {
  const history = useHistory();
  const { t, language } = useI18n();
  const { user, premium, premiumLoading } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiDoctorResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const provider = aiDoctorService.getProviderName();
  const canUseAiDoctor = Boolean(user) && premium.isPremium;
  const needsLogin = !user;
  const needsPremium = Boolean(user) && !premiumLoading && !premium.isPremium;
  const shouldUpsell = needsLogin || needsPremium;

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (shouldUpsell) {
      setUpsellOpen(true);
      return;
    }
    setUpsellOpen(false);
  }, [shouldUpsell]);

  const handleUpsellBack = () => {
    setUpsellOpen(false);
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/dashboard');
  };

  const handleUpsellBuy = () => {
    setUpsellOpen(false);
    if (!user) {
      history.push('/auth?returnTo=/premium');
      return;
    }
    history.push('/premium');
  };

  const diseaseSuggestions = useMemo(() => {
    if (!result) return [];
    return result.diseases.slice(0, 8);
  }, [result]);

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = '';
    if (!nextFile) return;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setResult(null);
    setError(null);
  };

  const handleDiagnose = async () => {
    if (!imageFile || loading || !provider || !canUseAiDoctor) return;

    setLoading(true);
    setError(null);
    try {
      const diagnosis = await aiDoctorService.diagnose({
        image: imageFile,
        symptoms,
        language,
      });
      setResult(diagnosis);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('mobileAiDoctor.diagnosisFailedTitle');
      setError(message);
      setResult(null);
    } finally {
      setLoading(false);
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
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{t('mobileAiDoctor.title')}</h2>
          <div className="w-12" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        <div className="px-4 py-5 space-y-4">
          <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-white text-base font-bold">{t('mobileAiDoctor.cardTitle')}</p>
                <p className="text-mobile-text-muted text-sm mt-1">
                  {t('mobileAiDoctor.cardSubtitle')}
                </p>
              </div>
              <span className="material-symbols-outlined text-mobile-primary text-3xl">ecg_heart</span>
            </div>
          </div>

          {!provider && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4">
              <p className="text-amber-300 text-sm font-semibold">{t('mobileAiDoctor.notConfiguredTitle')}</p>
              <p className="text-amber-200/90 text-xs mt-2">{t('mobileAiDoctor.notConfiguredSubtitle')}</p>
            </div>
          )}

          {premiumLoading && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
              <p className="text-mobile-text-muted text-sm">{t('mobileAiDoctor.checkingSubscription')}</p>
            </div>
          )}

          {canUseAiDoctor && (
            <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelected}
              />

              <button
                onClick={handlePickImage}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-4 py-3 text-white font-semibold"
              >
                <span className="material-symbols-outlined">photo_camera</span>
                {t('mobileAiDoctor.chooseLeafPhoto')}
              </button>

              {previewUrl && (
                <div className="rounded-xl overflow-hidden ring-1 ring-white/10">
                  <img src={previewUrl} alt="Plant preview" className="w-full h-48 object-cover" />
                </div>
              )}

              <div>
                <label className="text-sm font-semibold text-white">{t('mobileAiDoctor.symptomsLabel')}</label>
                <textarea
                  value={symptoms}
                  onChange={(event) => setSymptoms(event.target.value)}
                  placeholder={t('mobileAiDoctor.symptomsPlaceholder')}
                  className="mt-2 w-full min-h-[100px] rounded-xl border border-mobile-border-dark bg-mobile-surface-dark px-3 py-2 text-sm text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                />
              </div>

              <button
                onClick={handleDiagnose}
                disabled={!imageFile || !provider || loading || premiumLoading}
                className={`w-full rounded-xl py-3 font-bold transition-colors ${
                  !imageFile || !provider || loading || premiumLoading
                    ? 'bg-white/10 text-mobile-text-muted'
                    : 'bg-mobile-primary text-mobile-bg-dark'
                }`}
              >
                {loading ? t('mobileAiDoctor.analyzing') : t('mobileAiDoctor.analyzeButton')}
              </button>
            </div>
          )}

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4">
              <p className="text-red-300 text-sm font-semibold">{t('mobileAiDoctor.diagnosisFailedTitle')}</p>
              <p className="text-red-200/90 text-xs mt-2">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-white text-base font-bold">{result.plantName || t('mobileAiDoctor.unknownPlant')}</p>
                    <p className="text-mobile-text-muted text-sm mt-1">
                      {t('mobileAiDoctor.confidenceLabel').replace('{value}', formatProbability(result.plantProbability))}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-wide rounded-full px-2 py-1 bg-white/10 text-mobile-text-muted">
                    {result.provider}
                  </span>
                </div>
                <div className="mt-3 text-sm">
                  <span className="text-mobile-text-muted mr-2">{t('mobileAiDoctor.healthStatusLabel')}</span>
                  <span
                    className={
                      result.isHealthy === true
                        ? 'text-emerald-400 font-semibold'
                        : result.isHealthy === false
                          ? 'text-amber-300 font-semibold'
                          : 'text-mobile-text-muted'
                    }
                  >
                    {result.isHealthy === true
                      ? t('mobileAiDoctor.healthLikelyHealthy')
                      : result.isHealthy === false
                        ? t('mobileAiDoctor.healthPossibleDisease')
                        : t('mobileAiDoctor.healthUnknown')}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                <p className="text-white font-bold">{t('mobileAiDoctor.diseaseCandidatesTitle')}</p>
                {diseaseSuggestions.length === 0 ? (
                  <p className="text-mobile-text-muted text-sm mt-2">{t('mobileAiDoctor.diseaseCandidatesEmpty')}</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {diseaseSuggestions.map((disease, index) => (
                      <div
                        key={`${disease.id || disease.name}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-mobile-surface-dark px-3 py-2"
                      >
                        <p className="text-sm text-white">{disease.name}</p>
                        <p className="text-xs font-semibold text-mobile-primary">{formatProbability(disease.probability)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {result.followUpQuestion && (
                <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                  <p className="text-white font-bold">{t('mobileAiDoctor.followUpQuestionTitle')}</p>
                  <p className="text-mobile-text-muted text-sm mt-2">{result.followUpQuestion}</p>
                </div>
              )}

              {result.llmAdvice && (
                <div className="rounded-2xl bg-mobile-card-dark ring-1 ring-white/5 p-4">
                  <p className="text-white font-bold">{t('mobileAiDoctor.aiTreatmentGuidanceTitle')}</p>
                  <p className="text-mobile-text-muted text-sm mt-2 whitespace-pre-wrap">{result.llmAdvice}</p>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-[11px] text-mobile-text-muted leading-relaxed">
              {t('mobileAiDoctor.disclaimer')}
            </p>
          </div>
        </div>
      </div>

      <MobilePremiumUpsellModal
        isOpen={upsellOpen}
        onClose={handleUpsellBack}
        onPrimaryAction={handleUpsellBuy}
        title={t('mobileAiDoctor.premiumOnlyTitle')}
        subtitle={t('mobileUpsell.subtitle')}
        primaryLabel={t('mobileUpsell.buyPremium')}
        secondaryLabel={t('mobileUpsell.back')}
      />
    </div>
  );
};

export default MobileAiDoctor;
