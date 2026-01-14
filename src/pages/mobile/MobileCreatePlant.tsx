import React, { useState, useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';

type Step = 'basic' | 'growth' | 'water' | 'review';

interface PlantFormData {
  // Basic
  name: string;
  scientificName: string;
  category: string;
  growthCycle: 'annual' | 'perennial' | 'biennial';
  
  // Growth stages (days)
  stageIni: number;
  stageDev: number;
  stageMid: number;
  stageEnd: number;
  
  // Water needs (Kc coefficients)
  kcIni: number;
  kcMid: number;
  kcEnd: number;
  
  // Root depth
  rootDepthMin: number;
  rootDepthMax: number;
  
  // Depletion fraction
  depletionFraction: number;
  
  // Irrigation method
  irrigationMethod: string;
}

interface ValidationError {
  field: string;
  message: string;
}

const CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Herbs',
  'Flowers',
  'Shrubs',
  'Trees',
  'Lawn',
  'Indoor',
  'Succulents',
  'Other',
];

const IRRIGATION_METHODS = [
  'Drip',
  'Sprinkler',
  'Manual',
  'Soaker',
  'Surface',
];

const DEFAULT_FORM: PlantFormData = {
  name: '',
  scientificName: '',
  category: 'Vegetables',
  growthCycle: 'annual',
  stageIni: 20,
  stageDev: 30,
  stageMid: 40,
  stageEnd: 20,
  kcIni: 0.4,
  kcMid: 1.0,
  kcEnd: 0.7,
  rootDepthMin: 20,
  rootDepthMax: 50,
  depletionFraction: 50,
  irrigationMethod: 'Drip',
};

const MobileCreatePlant: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  
  const [currentStep, setCurrentStep] = useState<Step>('basic');
  const [formData, setFormData] = useState<PlantFormData>(DEFAULT_FORM);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ['basic', 'growth', 'water', 'review'];
  const stepIndex = steps.indexOf(currentStep);

  // Validation logic
  const validate = useMemo((): ValidationError[] => {
    const errors: ValidationError[] = [];
    
    // Basic validation
    if (!formData.name.trim()) {
      errors.push({ field: 'name', message: t('mobileCreatePlant.validation.nameRequired') });
    }
    
    // Growth stages validation
    const totalDays = formData.stageIni + formData.stageDev + formData.stageMid + formData.stageEnd;
    if (totalDays < 30) {
      errors.push({ field: 'stages', message: t('mobileCreatePlant.validation.stagesTooShort') });
    }
    if (totalDays > 365) {
      errors.push({ field: 'stages', message: t('mobileCreatePlant.validation.stagesTooLong') });
    }
    if (formData.stageIni < 5) {
      errors.push({ field: 'stageIni', message: t('mobileCreatePlant.validation.stageIniMin') });
    }
    if (formData.stageMid < 10) {
      errors.push({ field: 'stageMid', message: t('mobileCreatePlant.validation.stageMidMin') });
    }
    
    // Kc validation
    if (formData.kcIni < 0.1 || formData.kcIni > 1.5) {
      errors.push({ field: 'kcIni', message: t('mobileCreatePlant.validation.kcRange') });
    }
    if (formData.kcMid < 0.5 || formData.kcMid > 1.5) {
      errors.push({ field: 'kcMid', message: t('mobileCreatePlant.validation.kcMidRange') });
    }
    if (formData.kcEnd < 0.1 || formData.kcEnd > 1.5) {
      errors.push({ field: 'kcEnd', message: t('mobileCreatePlant.validation.kcRange') });
    }
    if (formData.kcMid < formData.kcIni) {
      errors.push({ field: 'kcMid', message: t('mobileCreatePlant.validation.kcMidHigher') });
    }
    
    // Root depth validation
    if (formData.rootDepthMin < 5 || formData.rootDepthMin > 200) {
      errors.push({ field: 'rootDepthMin', message: t('mobileCreatePlant.validation.rootRange') });
    }
    if (formData.rootDepthMax < formData.rootDepthMin) {
      errors.push({ field: 'rootDepthMax', message: t('mobileCreatePlant.validation.rootMaxHigher') });
    }
    if (formData.rootDepthMax > 300) {
      errors.push({ field: 'rootDepthMax', message: t('mobileCreatePlant.validation.rootMaxTooDeep') });
    }
    
    // Depletion validation
    if (formData.depletionFraction < 20 || formData.depletionFraction > 80) {
      errors.push({ field: 'depletionFraction', message: t('mobileCreatePlant.validation.depletionRange') });
    }
    
    return errors;
  }, [formData, t]);

  const errorsForStep = (step: Step): ValidationError[] => {
    switch (step) {
      case 'basic':
        return validate.filter(e => ['name', 'category'].includes(e.field));
      case 'growth':
        return validate.filter(e => ['stages', 'stageIni', 'stageDev', 'stageMid', 'stageEnd'].includes(e.field));
      case 'water':
        return validate.filter(e => ['kcIni', 'kcMid', 'kcEnd', 'rootDepthMin', 'rootDepthMax', 'depletionFraction'].includes(e.field));
      default:
        return validate;
    }
  };

  const hasError = (field: string): boolean => {
    return touched.has(field) && validate.some(e => e.field === field);
  };

  const getError = (field: string): string | undefined => {
    if (!touched.has(field)) return undefined;
    return validate.find(e => e.field === field)?.message;
  };

  const updateField = <K extends keyof PlantFormData>(field: K, value: PlantFormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTouched(prev => new Set(prev).add(field));
  };

  const canProceed = (): boolean => {
    return errorsForStep(currentStep).length === 0;
  };

  const handleNext = () => {
    // Mark all fields in current step as touched
    const stepFields: Record<Step, string[]> = {
      basic: ['name', 'category'],
      growth: ['stageIni', 'stageDev', 'stageMid', 'stageEnd', 'stages'],
      water: ['kcIni', 'kcMid', 'kcEnd', 'rootDepthMin', 'rootDepthMax', 'depletionFraction'],
      review: [],
    };
    const newTouched = new Set(touched);
    stepFields[currentStep].forEach(f => newTouched.add(f));
    setTouched(newTouched);

    if (canProceed() && stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1]);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1]);
    } else {
      history.goBack();
    }
  };

  const handleSave = async () => {
    if (validate.length > 0) return;
    
    setSaving(true);
    try {
      // TODO: Implement actual save via BLE/pack system
      // For now, just simulate success
      await new Promise(r => setTimeout(r, 1000));
      history.goBack();
    } catch (err) {
      console.error('[MobileCreatePlant] Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const totalDays = formData.stageIni + formData.stageDev + formData.stageMid + formData.stageEnd;

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-mobile-bg-dark border-b border-white/5">
        <div className="flex items-center p-4 justify-between">
          <button
            onClick={handleBack}
            className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">
              {stepIndex === 0 ? 'close' : 'arrow_back_ios_new'}
            </span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            {t('mobileCreatePlant.title')}
          </h2>
          <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 pb-4 px-4">
          {steps.map((step, idx) => (
            <div key={step} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  idx < stepIndex
                    ? 'bg-emerald-500 text-white'
                    : idx === stepIndex
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500'
                      : 'bg-white/5 text-mobile-text-muted'
                }`}
              >
                {idx < stepIndex ? (
                  <span className="material-symbols-outlined text-sm">check</span>
                ) : (
                  idx + 1
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 ${idx < stepIndex ? 'bg-emerald-500' : 'bg-white/10'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 gap-4 py-6">
        
        {/* Step: Basic Info */}
        {currentStep === 'basic' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-emerald-400">eco</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t('mobileCreatePlant.steps.basic.title')}</h3>
              <p className="text-sm text-mobile-text-muted">{t('mobileCreatePlant.steps.basic.subtitle')}</p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t('mobileCreatePlant.fields.name')} *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder={t('mobileCreatePlant.placeholders.name')}
                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-mobile-text-muted focus:outline-none focus:ring-2 transition-all ${
                  hasError('name') ? 'border-red-500 focus:ring-red-500' : 'border-white/10 focus:ring-emerald-500'
                }`}
              />
              {getError('name') && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">error</span>
                  {getError('name')}
                </p>
              )}
            </div>

            {/* Scientific Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t('mobileCreatePlant.fields.scientificName')}</label>
              <input
                type="text"
                value={formData.scientificName}
                onChange={e => updateField('scientificName', e.target.value)}
                placeholder={t('mobileCreatePlant.placeholders.scientificName')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-mobile-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all italic"
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t('mobileCreatePlant.fields.category')}</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => updateField('category', cat)}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      formData.category === cat
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Growth Cycle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t('mobileCreatePlant.fields.growthCycle')}</label>
              <div className="flex gap-2">
                {(['annual', 'perennial', 'biennial'] as const).map(cycle => (
                  <button
                    key={cycle}
                    onClick={() => updateField('growthCycle', cycle)}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      formData.growthCycle === cycle
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
                    }`}
                  >
                    {t(`mobileCreatePlant.cycles.${cycle}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Growth Stages */}
        {currentStep === 'growth' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-green-400">schedule</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t('mobileCreatePlant.steps.growth.title')}</h3>
              <p className="text-sm text-mobile-text-muted">{t('mobileCreatePlant.steps.growth.subtitle')}</p>
            </div>

            {/* Visual Timeline Preview */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">{t('mobileCreatePlant.growthTimeline')}</p>
                <span className={`text-sm font-medium ${totalDays >= 30 && totalDays <= 365 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalDays} {t('common.days')}
                </span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-8">
                {formData.stageIni > 0 && (
                  <div 
                    className="bg-yellow-500 flex items-center justify-center transition-all"
                    style={{ width: `${(formData.stageIni / totalDays) * 100}%` }}
                  >
                    <span className="text-xs text-black font-medium">{formData.stageIni}</span>
                  </div>
                )}
                {formData.stageDev > 0 && (
                  <div 
                    className="bg-lime-500 flex items-center justify-center transition-all"
                    style={{ width: `${(formData.stageDev / totalDays) * 100}%` }}
                  >
                    <span className="text-xs text-black font-medium">{formData.stageDev}</span>
                  </div>
                )}
                {formData.stageMid > 0 && (
                  <div 
                    className="bg-green-500 flex items-center justify-center transition-all"
                    style={{ width: `${(formData.stageMid / totalDays) * 100}%` }}
                  >
                    <span className="text-xs text-black font-medium">{formData.stageMid}</span>
                  </div>
                )}
                {formData.stageEnd > 0 && (
                  <div 
                    className="bg-amber-500 flex items-center justify-center transition-all"
                    style={{ width: `${(formData.stageEnd / totalDays) * 100}%` }}
                  >
                    <span className="text-xs text-black font-medium">{formData.stageEnd}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-mobile-text-muted">
                <span>{t('mobilePacksSettings.plantDetails.stageIni')}</span>
                <span>{t('mobilePacksSettings.plantDetails.stageDev')}</span>
                <span>{t('mobilePacksSettings.plantDetails.stageMid')}</span>
                <span>{t('mobilePacksSettings.plantDetails.stageEnd')}</span>
              </div>
            </div>

            {errorsForStep('growth').length > 0 && (
              <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                {errorsForStep('growth').map((err, i) => (
                  <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Stage Sliders */}
            <div className="space-y-4">
              <StageSlider
                label={t('mobileCreatePlant.stages.initial')}
                value={formData.stageIni}
                onChange={v => updateField('stageIni', v)}
                min={0}
                max={60}
                color="bg-yellow-500"
                hint={t('mobileCreatePlant.hints.stageIni')}
              />
              <StageSlider
                label={t('mobileCreatePlant.stages.development')}
                value={formData.stageDev}
                onChange={v => updateField('stageDev', v)}
                min={0}
                max={90}
                color="bg-lime-500"
                hint={t('mobileCreatePlant.hints.stageDev')}
              />
              <StageSlider
                label={t('mobileCreatePlant.stages.midSeason')}
                value={formData.stageMid}
                onChange={v => updateField('stageMid', v)}
                min={10}
                max={120}
                color="bg-green-500"
                hint={t('mobileCreatePlant.hints.stageMid')}
              />
              <StageSlider
                label={t('mobileCreatePlant.stages.lateSeason')}
                value={formData.stageEnd}
                onChange={v => updateField('stageEnd', v)}
                min={0}
                max={60}
                color="bg-amber-500"
                hint={t('mobileCreatePlant.hints.stageEnd')}
              />
            </div>
          </div>
        )}

        {/* Step: Water Needs */}
        {currentStep === 'water' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-cyan-400">water_drop</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t('mobileCreatePlant.steps.water.title')}</h3>
              <p className="text-sm text-mobile-text-muted">{t('mobileCreatePlant.steps.water.subtitle')}</p>
            </div>

            {/* Kc Coefficients Visual */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-sm font-medium text-white mb-3">{t('mobileCreatePlant.kcPreview')}</p>
              <div className="flex items-end justify-between gap-3 h-24 px-2">
                {[
                  { label: 'Kc Ini', value: formData.kcIni, color: 'bg-cyan-400' },
                  { label: 'Kc Mid', value: formData.kcMid, color: 'bg-cyan-600' },
                  { label: 'Kc End', value: formData.kcEnd, color: 'bg-cyan-400' },
                ].map((stage, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-sm font-bold text-white">{stage.value.toFixed(2)}</span>
                    <div 
                      className={`w-full rounded-t-lg ${stage.color} transition-all`}
                      style={{ height: `${stage.value * 60}px` }}
                    />
                    <span className="text-[10px] text-mobile-text-muted">{stage.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {errorsForStep('water').length > 0 && (
              <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                {errorsForStep('water').map((err, i) => (
                  <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {err.message}
                  </p>
                ))}
              </div>
            )}

            {/* Kc Sliders */}
            <div className="space-y-4">
              <KcSlider
                label={t('mobileCreatePlant.kc.initial')}
                value={formData.kcIni}
                onChange={v => updateField('kcIni', v)}
                hint={t('mobileCreatePlant.hints.kcIni')}
              />
              <KcSlider
                label={t('mobileCreatePlant.kc.mid')}
                value={formData.kcMid}
                onChange={v => updateField('kcMid', v)}
                hint={t('mobileCreatePlant.hints.kcMid')}
              />
              <KcSlider
                label={t('mobileCreatePlant.kc.end')}
                value={formData.kcEnd}
                onChange={v => updateField('kcEnd', v)}
                hint={t('mobileCreatePlant.hints.kcEnd')}
              />
            </div>

            {/* Root Depth */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-400">straighten</span>
                <p className="text-sm font-medium text-white">{t('mobileCreatePlant.rootDepth')}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-mobile-text-muted mb-1 block">{t('mobileCreatePlant.fields.rootMin')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.rootDepthMin}
                      onChange={e => updateField('rootDepthMin', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-mobile-text-muted text-sm">cm</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-mobile-text-muted mb-1 block">{t('mobileCreatePlant.fields.rootMax')}</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.rootDepthMax}
                      onChange={e => updateField('rootDepthMax', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-mobile-text-muted text-sm">cm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Depletion Fraction */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">humidity_percentage</span>
                  <p className="text-sm font-medium text-white">{t('mobileCreatePlant.depletionFraction')}</p>
                </div>
                <span className="text-lg font-bold text-white">{formData.depletionFraction}%</span>
              </div>
              <input
                type="range"
                min={20}
                max={80}
                value={formData.depletionFraction}
                onChange={e => updateField('depletionFraction', parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <p className="text-xs text-mobile-text-muted">{t('mobileCreatePlant.hints.depletion')}</p>
            </div>

            {/* Irrigation Method */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">{t('mobileCreatePlant.irrigationMethod')}</label>
              <div className="flex flex-wrap gap-2">
                {IRRIGATION_METHODS.map(method => (
                  <button
                    key={method}
                    onClick={() => updateField('irrigationMethod', method)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      formData.irrigationMethod === method
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Review */}
        {currentStep === 'review' && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-3xl text-purple-400">fact_check</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{t('mobileCreatePlant.steps.review.title')}</h3>
              <p className="text-sm text-mobile-text-muted">{t('mobileCreatePlant.steps.review.subtitle')}</p>
            </div>

            {/* Validation Status */}
            {validate.length === 0 ? (
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400 text-2xl">check_circle</span>
                <div>
                  <p className="text-sm font-medium text-emerald-400">{t('mobileCreatePlant.validation.allValid')}</p>
                  <p className="text-xs text-mobile-text-muted">{t('mobileCreatePlant.validation.readyToSave')}</p>
                </div>
              </div>
            ) : (
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-red-400">error</span>
                  <p className="text-sm font-medium text-red-400">{t('mobileCreatePlant.validation.hasErrors')}</p>
                </div>
                <ul className="space-y-1">
                  {validate.map((err, i) => (
                    <li key={i} className="text-xs text-red-300">• {err.message}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Summary Cards */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <h4 className="text-sm font-medium text-white mb-3">{t('mobileCreatePlant.summary.basic')}</h4>
              <div className="space-y-2">
                <SummaryRow label={t('mobileCreatePlant.fields.name')} value={formData.name || '-'} />
                {formData.scientificName && (
                  <SummaryRow label={t('mobileCreatePlant.fields.scientificName')} value={formData.scientificName} italic />
                )}
                <SummaryRow label={t('mobileCreatePlant.fields.category')} value={formData.category} />
                <SummaryRow label={t('mobileCreatePlant.fields.growthCycle')} value={t(`mobileCreatePlant.cycles.${formData.growthCycle}`)} />
              </div>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <h4 className="text-sm font-medium text-white mb-3">{t('mobileCreatePlant.summary.growth')}</h4>
              <div className="flex rounded-lg overflow-hidden h-6 mb-2">
                <div className="bg-yellow-500" style={{ width: `${(formData.stageIni / totalDays) * 100}%` }} />
                <div className="bg-lime-500" style={{ width: `${(formData.stageDev / totalDays) * 100}%` }} />
                <div className="bg-green-500" style={{ width: `${(formData.stageMid / totalDays) * 100}%` }} />
                <div className="bg-amber-500" style={{ width: `${(formData.stageEnd / totalDays) * 100}%` }} />
              </div>
              <SummaryRow label={t('mobileCreatePlant.totalDays')} value={`${totalDays} ${t('common.days')}`} />
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <h4 className="text-sm font-medium text-white mb-3">{t('mobileCreatePlant.summary.water')}</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">{formData.kcIni.toFixed(2)}</p>
                  <p className="text-[10px] text-mobile-text-muted">Kc Ini</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">{formData.kcMid.toFixed(2)}</p>
                  <p className="text-[10px] text-mobile-text-muted">Kc Mid</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">{formData.kcEnd.toFixed(2)}</p>
                  <p className="text-[10px] text-mobile-text-muted">Kc End</p>
                </div>
              </div>
              <SummaryRow label={t('mobileCreatePlant.rootDepth')} value={`${formData.rootDepthMin}-${formData.rootDepthMax} cm`} />
              <SummaryRow label={t('mobileCreatePlant.depletionFraction')} value={`${formData.depletionFraction}%`} />
              <SummaryRow label={t('mobileCreatePlant.irrigationMethod')} value={formData.irrigationMethod} />
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent">
        <button
          onClick={currentStep === 'review' ? handleSave : handleNext}
          disabled={saving || (currentStep === 'review' && validate.length > 0)}
          className={`w-full py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
            saving || (currentStep === 'review' && validate.length > 0)
              ? 'bg-white/10 text-mobile-text-muted'
              : 'bg-emerald-500 text-white hover:bg-emerald-600'
          }`}
        >
          {saving ? (
            <>
              <span className="material-symbols-outlined animate-spin">refresh</span>
              {t('common.loading')}
            </>
          ) : currentStep === 'review' ? (
            <>
              <span className="material-symbols-outlined">save</span>
              {t('mobileCreatePlant.save')}
            </>
          ) : (
            <>
              {t('common.next')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

// Helper components
const StageSlider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  color: string;
  hint?: string;
}> = ({ label, value, onChange, min, max, color, hint }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${color}`} />
        <span className="text-sm font-medium text-white">{label}</span>
      </div>
      <span className="text-lg font-bold text-white">{value} <span className="text-xs text-mobile-text-muted font-normal">days</span></span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={e => onChange(parseInt(e.target.value))}
      className="w-full accent-emerald-500"
    />
    {hint && <p className="text-xs text-mobile-text-muted mt-1">{hint}</p>}
  </div>
);

const KcSlider: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}> = ({ label, value, onChange, hint }) => (
  <div className="bg-white/5 rounded-xl p-4 border border-white/5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-medium text-white">{label}</span>
      <span className="text-lg font-bold text-cyan-400">{value.toFixed(2)}</span>
    </div>
    <input
      type="range"
      min={10}
      max={150}
      value={Math.round(value * 100)}
      onChange={e => onChange(parseInt(e.target.value) / 100)}
      className="w-full accent-cyan-500"
    />
    {hint && <p className="text-xs text-mobile-text-muted mt-1">{hint}</p>}
  </div>
);

const SummaryRow: React.FC<{ label: string; value: string; italic?: boolean }> = ({ label, value, italic }) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-mobile-text-muted">{label}</span>
    <span className={`text-sm text-white ${italic ? 'italic' : ''}`}>{value}</span>
  </div>
);

export default MobileCreatePlant;
