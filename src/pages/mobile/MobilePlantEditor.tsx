import React, { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAuth } from '../../auth';
import * as MarketplaceService from '../../services/MarketplaceService';
import type { MarketplacePlant, PlantEditorData } from '../../types/marketplace';
import { PLANT_CATEGORIES } from '../../types/marketplace';
import MobileHeader from '../../components/mobile/MobileHeader';

const MobilePlantEditor: React.FC = () => {
    const { plantId } = useParams<{ plantId?: string }>();
    const isEditing = plantId && plantId !== 'new';
    const history = useHistory();
    const { t } = useI18n();
    const { isAuthenticated } = useAuth();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [existingPlant, setExistingPlant] = useState<MarketplacePlant | null>(null);

    // Form fields
    const [commonNameEn, setCommonNameEn] = useState('');
    const [commonNameRo, setCommonNameRo] = useState('');
    const [scientificName, setScientificName] = useState('');
    const [category, setCategory] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [descriptionRo, setDescriptionRo] = useState('');
    const [tags, setTags] = useState('');
    const [plantData, setPlantData] = useState<Record<string, unknown>>({});

    // Image upload
    const [uploading, setUploading] = useState(false);
    const [imageFiles, setImageFiles] = useState<File[]>([]);

    // ── Load existing plant ───────────────────────────────────────
    useEffect(() => {
        if (!isEditing || !plantId) return;
        setLoading(true);
        MarketplaceService.getPlantDetail(plantId)
            .then((res) => {
                const p = res.plant;
                setExistingPlant(p);
                setCommonNameEn(p.commonNameEn);
                setCommonNameRo(p.commonNameRo);
                setScientificName(p.scientificName);
                setCategory(p.category);
                setDescriptionEn(p.descriptionEn);
                setDescriptionRo(p.descriptionRo);
                setTags(p.tags.join(', '));
                setPlantData(p.plantData || {});
            })
            .catch((err) => setError(err.message))
            .finally(() => setLoading(false));
    }, [plantId, isEditing]);

    // ── AI Fill Gaps ──────────────────────────────────────────────
    const handleAiFillGaps = async () => {
        if (!scientificName && !commonNameEn) {
            setError('Enter a plant name first');
            return;
        }
        setAiLoading(true);
        setError(null);
        try {
            const res = await MarketplaceService.aiFillGaps({
                scientificName,
                commonName: commonNameEn,
                existingData: plantData,
            });
            const s = res.suggestions as Record<string, unknown>;
            // Apply suggestions to empty fields
            if (!commonNameEn && typeof s.commonNameEn === 'string') setCommonNameEn(s.commonNameEn);
            if (!commonNameRo && typeof s.commonNameRo === 'string') setCommonNameRo(s.commonNameRo);
            if (!scientificName && typeof s.scientificName === 'string') setScientificName(s.scientificName);
            if (!category && typeof s.category === 'string') setCategory(s.category);
            if (!descriptionEn && typeof s.descriptionEn === 'string') setDescriptionEn(s.descriptionEn);
            if (!descriptionRo && typeof s.descriptionRo === 'string') setDescriptionRo(s.descriptionRo);
            if (typeof s.fao56 === 'object' && s.fao56) {
                setPlantData((prev) => ({ ...prev, ...s.fao56 as Record<string, unknown> }));
            }
            if (Array.isArray(s.tags) && !tags) {
                setTags(s.tags.join(', '));
            }
        } catch (err: any) {
            setError(err.message || 'AI fill-gaps failed');
        } finally {
            setAiLoading(false);
        }
    };

    // ── AI Translate ──────────────────────────────────────────────
    const handleAiTranslate = async (from: 'en' | 'ro') => {
        setAiLoading(true);
        setError(null);
        try {
            const fields: Record<string, string> = {};
            if (from === 'en') {
                if (commonNameEn) fields.commonName = commonNameEn;
                if (descriptionEn) fields.description = descriptionEn;
            } else {
                if (commonNameRo) fields.commonName = commonNameRo;
                if (descriptionRo) fields.description = descriptionRo;
            }
            const res = await MarketplaceService.aiTranslate(fields, from);
            const tr = res.translations as Record<string, string>;
            if (from === 'en') {
                if (tr.commonName && !commonNameRo) setCommonNameRo(tr.commonName);
                if (tr.description && !descriptionRo) setDescriptionRo(tr.description);
            } else {
                if (tr.commonName && !commonNameEn) setCommonNameEn(tr.commonName);
                if (tr.description && !descriptionEn) setDescriptionEn(tr.description);
            }
        } catch (err: any) {
            setError(err.message || 'Translation failed');
        } finally {
            setAiLoading(false);
        }
    };

    // ── Save ──────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!commonNameEn && !commonNameRo && !scientificName) {
            setError('At least one name is required');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const data: PlantEditorData = {
                commonNameEn,
                commonNameRo,
                scientificName,
                category,
                descriptionEn,
                descriptionRo,
                tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
                plantData,
            };

            let savedPlantId: string;
            if (isEditing && existingPlant) {
                const res = await MarketplaceService.updatePlant(plantId!, {
                    ...data,
                    version: existingPlant.version,
                });
                savedPlantId = res.plant.plantId;
            } else {
                const res = await MarketplaceService.createPlant(data);
                savedPlantId = res.plant.plantId;
            }

            // Upload images
            if (imageFiles.length > 0) {
                setUploading(true);
                for (let i = 0; i < imageFiles.length; i++) {
                    await MarketplaceService.uploadPlantImage(savedPlantId, imageFiles[i], i === 0);
                }
                setUploading(false);
            }

            history.replace(`/marketplace/plants/${savedPlantId}`);
        } catch (err: any) {
            setError(err.message || 'Save failed');
        } finally {
            setSaving(false);
        }
    };

    // ── Submit for review ─────────────────────────────────────────
    const handleSubmit = async () => {
        if (!isEditing || !plantId) return;
        setSaving(true);
        try {
            await MarketplaceService.submitForReview(plantId);
            history.replace(`/marketplace/plants/${plantId}`);
        } catch (err: any) {
            setError(err.message || 'Submit failed');
        } finally {
            setSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center px-8 text-center">
                    <p className="text-gray-400">{t('marketplace.signInRequired')}</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex flex-col h-screen bg-mobile-bg-dark text-white">
                <MobileHeader title="" onBack={() => history.goBack()} />
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-10 h-10 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
            <MobileHeader
                title={isEditing ? t('marketplace.editPlant') : t('marketplace.newPlant')}
                onBack={() => history.goBack()}
            />

            <main className="flex-1 overflow-y-auto px-4 pb-32">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* AI Actions */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={handleAiFillGaps}
                        disabled={aiLoading}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-mobile-primary/20 to-emerald-500/10 border border-mobile-primary/30 text-mobile-primary text-xs font-medium disabled:opacity-50"
                    >
                        {aiLoading ? (
                            <div className="w-4 h-4 border-2 border-mobile-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <span className="material-symbols-outlined text-base">auto_awesome</span>
                        )}
                        {t('marketplace.aiFillGaps')}
                    </button>
                    <button
                        onClick={() => handleAiTranslate('en')}
                        disabled={aiLoading}
                        className="px-3 py-2.5 rounded-xl bg-mobile-surface-dark border border-white/10 text-xs text-gray-300 disabled:opacity-50"
                    >
                        {t('marketplace.translateEnToRo')}
                    </button>
                    <button
                        onClick={() => handleAiTranslate('ro')}
                        disabled={aiLoading}
                        className="px-3 py-2.5 rounded-xl bg-mobile-surface-dark border border-white/10 text-xs text-gray-300 disabled:opacity-50"
                    >
                        {t('marketplace.translateRoToEn')}
                    </button>
                </div>

                {/* Scientific Name */}
                <label className="block mb-4">
                    <span className="text-xs text-gray-400 mb-1 block">
                        {t('marketplace.scientificName')}
                    </span>
                    <input
                        type="text"
                        value={scientificName}
                        onChange={(e) => setScientificName(e.target.value)}
                        placeholder={t('marketplace.placeholderScientificName')}
                        className="mobile-form-field px-4 text-sm"
                    />
                </label>

                {/* Common Names */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                    <label className="block">
                        <span className="text-xs text-gray-400 mb-1 block">
                            {t('marketplace.commonNameEn')}
                        </span>
                        <input
                            type="text"
                            value={commonNameEn}
                            onChange={(e) => setCommonNameEn(e.target.value)}
                            placeholder={t('marketplace.placeholderCommonNameEn')}
                            className="mobile-form-field px-4 text-sm"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs text-gray-400 mb-1 block">
                            {t('marketplace.commonNameRo')}
                        </span>
                        <input
                            type="text"
                            value={commonNameRo}
                            onChange={(e) => setCommonNameRo(e.target.value)}
                            placeholder={t('marketplace.placeholderCommonNameRo')}
                            className="mobile-form-field px-4 text-sm"
                        />
                    </label>
                </div>

                {/* Category */}
                <label className="block mb-4">
                    <span className="text-xs text-gray-400 mb-1 block">
                        {t('marketplace.category')}
                    </span>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="mobile-form-select px-4 text-sm"
                    >
                        <option value="">{t('marketplace.selectCategory')}</option>
                        {PLANT_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                                {cat}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Descriptions */}
                <label className="block mb-4">
                    <span className="text-xs text-gray-400 mb-1 block">
                        {t('marketplace.descriptionEn')}
                    </span>
                    <textarea
                        value={descriptionEn}
                        onChange={(e) => setDescriptionEn(e.target.value)}
                        rows={3}
                        className="mobile-form-textarea px-4 text-sm resize-none"
                    />
                </label>
                <label className="block mb-4">
                    <span className="text-xs text-gray-400 mb-1 block">
                        {t('marketplace.descriptionRo')}
                    </span>
                    <textarea
                        value={descriptionRo}
                        onChange={(e) => setDescriptionRo(e.target.value)}
                        rows={3}
                        className="mobile-form-textarea px-4 text-sm resize-none"
                    />
                </label>

                {/* Tags */}
                <label className="block mb-4">
                    <span className="text-xs text-gray-400 mb-1 block">
                        {t('marketplace.tags')}
                    </span>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        placeholder={t('marketplace.placeholderTags')}
                        className="mobile-form-field px-4 text-sm"
                    />
                </label>

                {/* Images */}
                <div className="mb-4">
                    <span className="text-xs text-gray-400 mb-2 block">
                        {t('marketplace.images')}
                    </span>

                    {/* Existing images */}
                    {existingPlant && existingPlant.images.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto">
                            {existingPlant.images.map((img, i) => (
                                <div key={i} className="w-20 h-20 rounded-lg bg-mobile-surface-dark overflow-hidden shrink-0 border border-white/10">
                                    <img src={img.url || ''} alt="" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New images preview */}
                    {imageFiles.length > 0 && (
                        <div className="flex gap-2 mb-2 overflow-x-auto">
                            {imageFiles.map((f, i) => (
                                <div key={i} className="w-20 h-20 rounded-lg bg-mobile-surface-dark overflow-hidden shrink-0 border border-mobile-primary/30 relative">
                                    <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => setImageFiles((prev) => prev.filter((_, j) => j !== i))}
                                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center"
                                    >
                                        <span className="material-symbols-outlined text-xs text-white">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-mobile-surface-dark border border-dashed border-white/10 cursor-pointer text-sm text-gray-400 hover:border-mobile-primary/30">
                        <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                        {t('marketplace.addImages')}
                        <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []);
                                setImageFiles((prev) => [...prev, ...files].slice(0, 10));
                                e.target.value = '';
                            }}
                        />
                    </label>
                </div>

                {/* FAO-56 Data (simplified display) */}
                {Object.keys(plantData).length > 0 && (
                    <div className="mb-4">
                        <span className="text-xs text-gray-400 mb-2 block">
                            {t('marketplace.technicalData')}
                        </span>
                        <div className="bg-mobile-surface-dark rounded-xl p-3 border border-white/5">
                            <pre className="text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(plantData, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom actions */}
            <div className="fixed bottom-0 left-0 right-0 bg-mobile-surface-dark/95 backdrop-blur border-t border-white/5 p-4 pb-safe">
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || uploading}
                        className="mobile-btn-surface flex-1 py-3 text-sm font-medium"
                    >
                        {saving || uploading
                            ? t('common.saving')
                            : t('marketplace.saveDraft')}
                    </button>
                    {isEditing && existingPlant?.status === 'draft' && (
                        <button
                            onClick={async () => {
                                await handleSave();
                                await handleSubmit();
                            }}
                            disabled={saving}
                            className="mobile-btn-primary flex-1 py-3 text-sm font-medium"
                        >
                            {t('marketplace.submitForReview')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MobilePlantEditor;

