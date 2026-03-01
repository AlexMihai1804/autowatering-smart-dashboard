import React, { useState } from 'react';
import { useI18n } from '../../i18n';

interface PlantGrowingGuideProps {
    plantData: Record<string, unknown>;
    careGuide?: string;
}

const KC_KEYS = ['kc_ini', 'kc_mid', 'kc_end', 'kc_dev'] as const;
const STAGE_KEYS = ['stage_days_ini', 'stage_days_dev', 'stage_days_mid', 'stage_days_end'] as const;
const STAGE_COLORS = ['bg-emerald-700', 'bg-emerald-500', 'bg-mobile-primary', 'bg-amber-500'];
const STAGE_ONGOING_SENTINEL = 999;

const TECH_META: Record<string, { label: string; unit?: string }> = {
    depletion_fraction_p: { label: 'Depletion fraction' },
    allowable_depletion_pct: { label: 'Allowable depletion', unit: '%' },
    yield_response_factor: { label: 'Yield response factor (Ky)' },
    spacing_row_m: { label: 'Row spacing', unit: 'm' },
    spacing_plant_m: { label: 'Plant spacing', unit: 'm' },
    default_density_plants_m2: { label: 'Planting density', unit: 'plants/m2' },
    canopy_cover_max_frac: { label: 'Max canopy cover' },
    maturity_days_min: { label: 'Min maturity', unit: 'days' },
    maturity_days_max: { label: 'Max maturity', unit: 'days' },
    juvenile_years_to_bearing: { label: 'Years to bearing' },
    growth_rate: { label: 'Growth rate' },
    fertility_need: { label: 'Fertility need' },
    pruning_need: { label: 'Pruning need' },
    edible_part: { label: 'Edible part' },
    toxic_flag: { label: 'Toxic' },
    kc_source_tag: { label: 'Kc data source' },
    root_depth_source: { label: 'Root depth source' },
};

const SHOWN_KEYS = new Set([
    ...KC_KEYS,
    ...STAGE_KEYS,
    'temp_opt_min_c',
    'temp_opt_max_c',
    'frost_tolerance_c',
    'ph_min',
    'ph_max',
    'drought_tolerance',
    'shade_tolerance',
    'salinity_tolerance',
    'growth_cycle',
    'primary_use',
    'indoor_ok',
    'typ_irrig_method',
    'water_stress_sensitive_stage',
    'root_depth_max_m',
    'root_depth_min_m',
    'id',
    'subtype',
    'category',
    'common_name_ro',
    'common_name_en',
    'scientific_name',
]);

type TolLevel = 'LOW' | 'MED' | 'HIGH';
type StageKey = typeof STAGE_KEYS[number];

function num(v: unknown): number | null {
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
        const n = Number.parseFloat(v);
        return Number.isNaN(n) ? null : n;
    }
    return null;
}

function formatCompactNumber(value: number, decimals = 2): string {
    return value.toFixed(decimals).replace(/\.?0+$/, '');
}

function normalizeEnumValue(value: string): string {
    return value.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

function humanizeEnumValue(value: string): string {
    return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase());
}

function tolLevel(v: unknown): TolLevel | null {
    const s = String(v || '').toUpperCase();
    if (s === 'LOW') return 'LOW';
    if (s === 'MED' || s === 'MEDIUM') return 'MED';
    if (s === 'HIGH') return 'HIGH';
    return null;
}

function TolBar({ level }: { level: TolLevel }) {
    const dots = level === 'LOW' ? 1 : level === 'MED' ? 2 : 3;
    const color = level === 'LOW' ? 'bg-red-400' : level === 'MED' ? 'bg-yellow-400' : 'bg-emerald-400';

    return (
        <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-sm ${i <= dots ? color : 'bg-white/10'}`} />
            ))}
        </div>
    );
}

function isOngoingMaturityStage(value: number | null): boolean {
    return value !== null && value >= STAGE_ONGOING_SENTINEL;
}

function stageLabelKey(stageKey: StageKey): string {
    switch (stageKey) {
        case 'stage_days_ini':
            return 'marketplace.stageIni';
        case 'stage_days_dev':
            return 'marketplace.stageDev';
        case 'stage_days_mid':
            return 'marketplace.stageMid';
        case 'stage_days_end':
        default:
            return 'marketplace.stageEnd';
    }
}

function kcLabelKey(kcKey: string): string {
    switch (kcKey) {
        case 'kc_ini':
            return 'marketplace.kcInitialLabel';
        case 'kc_mid':
            return 'marketplace.kcMidLabel';
        case 'kc_end':
            return 'marketplace.kcEndLabel';
        case 'kc_dev':
        default:
            return 'marketplace.kcDevLabel';
    }
}

const PlantGrowingGuide: React.FC<PlantGrowingGuideProps> = ({ plantData, careGuide }) => {
    const { t } = useI18n();
    const [techOpen, setTechOpen] = useState(false);
    const [openHelpKey, setOpenHelpKey] = useState<string | null>(null);
    const notSet = t('common.notSet');
    const celsiusUnit = t('common.degreesC');

    const d = plantData || {};

    if (Object.keys(d).length === 0 && !careGuide) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                <span className="material-symbols-outlined text-5xl mb-3">psychiatry</span>
                <p className="text-sm">{t('marketplace.noGrowingData')}</p>
            </div>
        );
    }

    const kcValues = KC_KEYS
        .map((k) => ({ key: k, val: num(d[k]) }))
        .filter((r): r is { key: (typeof KC_KEYS)[number]; val: number } => r.val !== null);

    const rawStageValues = STAGE_KEYS
        .map((k) => ({ key: k, val: num(d[k]) }))
        .filter((r): r is { key: StageKey; val: number } => r.val !== null);

    const hasOngoingMaturity = rawStageValues.some((stage) => isOngoingMaturityStage(stage.val));
    const finiteStageValues = rawStageValues.filter((stage) => !isOngoingMaturityStage(stage.val));
    const finiteStageDays = finiteStageValues.reduce((sum, stage) => sum + stage.val, 0);

    type StageSegment = {
        key: string;
        label: string;
        value: number | null;
        widthPct: number;
        colorClass: string;
        ongoing: boolean;
    };

    const stageSegments: StageSegment[] = [];
    if (hasOngoingMaturity) {
        if (finiteStageValues.length > 0 && finiteStageDays > 0) {
            const finiteBudget = 65;
            finiteStageValues.forEach((stage, index) => {
                stageSegments.push({
                    key: stage.key,
                    label: t(stageLabelKey(stage.key)),
                    value: stage.val,
                    widthPct: (stage.val / finiteStageDays) * finiteBudget,
                    colorClass: STAGE_COLORS[index % STAGE_COLORS.length],
                    ongoing: false,
                });
            });
            stageSegments.push({
                key: 'ongoing_maturity',
                label: t('marketplace.stageMaturityLabel'),
                value: null,
                widthPct: 35,
                colorClass: STAGE_COLORS[2],
                ongoing: true,
            });
        } else {
            stageSegments.push({
                key: 'ongoing_maturity_only',
                label: t('marketplace.stageMaturityLabel'),
                value: null,
                widthPct: 100,
                colorClass: STAGE_COLORS[2],
                ongoing: true,
            });
        }
    } else {
        const totalStageDays = rawStageValues.reduce((sum, stage) => sum + stage.val, 0);
        rawStageValues.forEach((stage, index) => {
            stageSegments.push({
                key: stage.key,
                label: t(stageLabelKey(stage.key)),
                value: stage.val,
                widthPct: totalStageDays > 0 ? (stage.val / totalStageDays) * 100 : 25,
                colorClass: STAGE_COLORS[index % STAGE_COLORS.length],
                ongoing: false,
            });
        });
    }

    const tMin = num(d.temp_opt_min_c);
    const tMax = num(d.temp_opt_max_c);
    const frost = num(d.frost_tolerance_c);
    const pHMin = num(d.ph_min);
    const pHMax = num(d.ph_max);
    const drought = tolLevel(d.drought_tolerance);
    const shade = tolLevel(d.shade_tolerance);
    const salinity = tolLevel(d.salinity_tolerance);

    const growthCycle = (() => {
        if (!d.growth_cycle) return null;
        const normalized = normalizeEnumValue(String(d.growth_cycle));
        const map: Record<string, string> = {
            ANNUAL: 'marketplace.growthCycleAnnual',
            PERENNIAL: 'marketplace.growthCyclePerennial',
            BIENNIAL: 'marketplace.growthCycleBiennial',
        };
        return map[normalized] ? t(map[normalized]) : humanizeEnumValue(normalized);
    })();

    const primaryUse = (() => {
        if (!d.primary_use) return null;
        const normalized = normalizeEnumValue(String(d.primary_use));
        const map: Record<string, string> = {
            ORNAMENTAL: 'marketplace.primaryUseOrnamental',
            FOOD: 'marketplace.primaryUseFood',
            FRUIT: 'marketplace.primaryUseFruit',
            VEGETABLE: 'marketplace.primaryUseVegetable',
            HERB: 'marketplace.primaryUseHerb',
            MEDICINAL: 'marketplace.primaryUseMedicinal',
            AROMATIC: 'marketplace.primaryUseAromatic',
            FORAGE: 'marketplace.primaryUseForage',
            LAWN: 'marketplace.primaryUseLawn',
            TIMBER: 'marketplace.primaryUseTimber',
            INDUSTRIAL: 'marketplace.primaryUseIndustrial',
        };
        return map[normalized] ? t(map[normalized]) : humanizeEnumValue(normalized);
    })();

    const indoorOk = d.indoor_ok === true;

    const irrigMethod = (() => {
        if (!d.typ_irrig_method) return null;
        const normalized = normalizeEnumValue(String(d.typ_irrig_method));
        const map: Record<string, string> = {
            DRIP: 'marketplace.irrigMethodDrip',
            SPRINKLER: 'marketplace.irrigMethodSprinkler',
            SURFACE: 'marketplace.irrigMethodSurface',
            MANUAL: 'marketplace.irrigMethodManual',
            RAINFED: 'marketplace.irrigMethodRainfed',
        };
        if (map[normalized]) return t(map[normalized]);
        if (normalized.includes('DRIP')) return t('marketplace.irrigMethodDrip');
        if (normalized.includes('SPRINKLER')) return t('marketplace.irrigMethodSprinkler');
        if (normalized.includes('SURFACE') || normalized.includes('FURROW') || normalized.includes('FLOOD')) return t('marketplace.irrigMethodSurface');
        if (normalized.includes('MANUAL')) return t('marketplace.irrigMethodManual');
        if (normalized.includes('RAINFED')) return t('marketplace.irrigMethodRainfed');
        if (/^[A-Z0-9_]{1,6}$/.test(normalized)) return null;
        return humanizeEnumValue(normalized);
    })();

    const rawStressStage = d.water_stress_sensitive_stage ? String(d.water_stress_sensitive_stage) : null;
    const stressStage = (() => {
        if (!rawStressStage) return null;
        const value = rawStressStage.trim();
        if (!value) return null;

        const upper = value.toUpperCase();
        if (upper === 'NONE') return null;
        const known: Record<string, string> = {
            EST: 'marketplace.criticalStageEstLabel',
            INI: 'marketplace.stageIni',
            INITIAL: 'marketplace.stageIni',
            DEV: 'marketplace.stageDev',
            DEVELOPMENT: 'marketplace.stageDev',
            MID: 'marketplace.stageMid',
            MID_SEASON: 'marketplace.stageMid',
            END: 'marketplace.stageEnd',
            LATE: 'marketplace.stageEnd',
        };
        if (known[upper]) return t(known[upper]);
        if (/^[A-Z0-9_]{1,5}$/.test(value)) return t('marketplace.criticalStageGenericLabel');
        return value.replace(/_/g, ' ');
    })();

    const hasConditions =
        tMin !== null || tMax !== null || frost !== null || pHMin !== null || pHMax !== null ||
        drought !== null || shade !== null || salinity !== null || stressStage !== null;

    const rootMax = num(d.root_depth_max_m);
    const rootMin = num(d.root_depth_min_m);

    const techEntries = Object.entries(d).filter(
        ([k, v]) => !SHOWN_KEYS.has(k) && v !== undefined && v !== null && v !== '',
    );

    const formatTechValue = (key: string, val: unknown): string => {
        if (key === 'canopy_cover_max_frac') {
            const n = num(val);
            return n !== null ? `${Math.round(n * 100)}%` : String(val ?? notSet);
        }
        if (val === true) return t('common.yes');
        if (val === false) return t('common.no');
        const n = num(val);
        return n !== null ? formatCompactNumber(n, 3) : String(val ?? notSet);
    };

    const toleranceHint = (type: 'drought' | 'shade' | 'salinity', level: TolLevel): string => {
        if (type === 'drought') {
            if (level === 'LOW') return t('marketplace.droughtHintLow');
            if (level === 'MED') return t('marketplace.droughtHintMedium');
            return t('marketplace.droughtHintHigh');
        }
        if (type === 'shade') {
            if (level === 'LOW') return t('marketplace.shadeHintLow');
            if (level === 'MED') return t('marketplace.shadeHintMedium');
            return t('marketplace.shadeHintHigh');
        }
        if (level === 'LOW') return t('marketplace.salinityHintLow');
        if (level === 'MED') return t('marketplace.salinityHintMedium');
        return t('marketplace.salinityHintHigh');
    };

    const formatRange = (min: number | null, max: number | null, unit = '', decimals = 2): string => {
        if (min !== null && max !== null) return `${formatCompactNumber(min, decimals)} - ${formatCompactNumber(max, decimals)}${unit}`;
        if (min !== null) return t('marketplace.fromValueTemplate').replace('{value}', formatCompactNumber(min, decimals)).replace('{unit}', unit);
        if (max !== null) return t('marketplace.upToValueTemplate').replace('{value}', formatCompactNumber(max, decimals)).replace('{unit}', unit);
        return notSet;
    };

    const toggleHelp = (key: string) => setOpenHelpKey((current) => (current === key ? null : key));

    const helpButton = (key: string, hint: string) => (
        <button
            type="button"
            onClick={() => toggleHelp(key)}
            className={`inline-flex size-4 items-center justify-center rounded-full border text-[10px] font-bold leading-none transition-colors ${openHelpKey === key ? 'border-mobile-primary/40 bg-mobile-primary/20 text-mobile-primary' : 'border-white/20 text-gray-400 hover:text-white'}`}
            aria-label={t('marketplace.moreInfoLabel')}
            title={hint}
        >
            ?
        </button>
    );

    const helpHint = (key: string, hint: string) => openHelpKey === key ? <p className="mt-1 pl-9 text-[11px] text-gray-500 leading-relaxed">{hint}</p> : null;

    const renderRow = (id: string, icon: string, iconClass: string, label: string, value: React.ReactNode, hint: string) => (
        <div className="px-4 py-3" key={id}>
            <div className="flex items-center gap-3">
                <span className={`material-symbols-outlined text-lg w-6 shrink-0 ${iconClass}`}>{icon}</span>
                <div className="flex items-center gap-1 w-32 shrink-0">
                    <span className="text-xs text-gray-400">{label}</span>
                    {helpButton(id, hint)}
                </div>
                <div className="text-sm text-white font-medium">{value}</div>
            </div>
            {helpHint(id, hint)}
        </div>
    );

    const ongoingSummary = t('marketplace.growthStagesOngoingSummary').replace('{days}', String(finiteStageDays)).replace('{unit}', t('marketplace.daysLabel'));
    const ongoingOnlySummary = t('marketplace.growthStagesOngoingOnlySummary');
    const fixedStagesTotal = rawStageValues.reduce((sum, stage) => sum + stage.val, 0);
    const fixedSummary = `${fixedStagesTotal} ${t('marketplace.daysLabel')} ${t('marketplace.totalLabel')}`;

    return (
        <div className="space-y-5 pb-4">
            {careGuide && (
                <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-mobile-primary text-base">menu_book</span>
                        {t('marketplace.careGuideTitle')}
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{careGuide}</p>
                </div>
            )}

            {kcValues.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-white mb-1.5 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-mobile-primary text-base">water_drop</span>
                        {t('marketplace.cropCoefficients')}
                    </h3>
                    <p className="text-[11px] text-gray-500 mb-3">{t('marketplace.cropCoefficientsHint')}</p>
                    <div className="space-y-2.5">
                        {kcValues.map(({ key, val }) => (
                            <div key={key}>
                                <div className="flex justify-between mb-1">
                                    <span className="text-xs text-gray-400">{t(kcLabelKey(key))}</span>
                                    <span className="text-xs text-white font-medium">{val.toFixed(2)}</span>
                                </div>
                                <div className="h-2 bg-mobile-bg-dark rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-mobile-primary/60 to-mobile-primary rounded-full" style={{ width: `${Math.min(100, (val / 1.4) * 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {stageSegments.length > 0 && (
                <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-mobile-primary text-base">timeline</span>
                        {t('marketplace.growthStages')}
                        <span className="ml-auto text-[11px] text-gray-500 font-normal">
                            {hasOngoingMaturity ? (finiteStageDays > 0 ? ongoingSummary : ongoingOnlySummary) : fixedSummary}
                        </span>
                    </h3>
                    <div className="flex rounded-lg overflow-hidden h-7 mb-2">
                        {stageSegments.map((stage) => (
                            <div key={stage.key} className={`${stage.colorClass} flex items-center justify-center text-[9px] font-bold text-white/90`} style={{ width: `${stage.widthPct}%` }}>
                                {stage.ongoing ? t('marketplace.stageOngoingShort') : `${stage.value}d`}
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {stageSegments.map((stage) => (
                            <div key={`${stage.key}_legend`} className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-sm ${stage.colorClass}`} />
                                <span className="text-[11px] text-gray-400">{stage.ongoing ? `${stage.label}: ${t('marketplace.stageOngoingLabel')}` : `${stage.label}: ${stage.value} ${t('marketplace.daysLabel')}`}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(rootMin !== null || rootMax !== null) && (
                <div className="flex items-center gap-3 bg-mobile-surface-dark rounded-xl px-4 py-3 border border-white/5">
                    <span className="material-symbols-outlined text-mobile-primary text-xl shrink-0">compost</span>
                    <div>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1">
                            {t('marketplace.rootDepthLabel')}
                            {helpButton('rootDepth', t('marketplace.rootDepthHint'))}
                        </p>
                        <p className="text-sm text-white font-medium">{formatRange(rootMin, rootMax, ' m', 2)}</p>
                        {helpHint('rootDepth', t('marketplace.rootDepthHint'))}
                    </div>
                </div>
            )}

            {hasConditions && (
                <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-mobile-primary text-base">eco</span>
                        {t('marketplace.growingConditions')}
                    </h3>
                    <div className="bg-mobile-surface-dark rounded-xl border border-white/5 divide-y divide-white/5">
                        {(tMin !== null || tMax !== null) && renderRow('temp', 'device_thermostat', 'text-orange-400', t('marketplace.optimalTempLabel'), formatRange(tMin, tMax, celsiusUnit, 1), t('marketplace.optimalTempHint'))}
                        {frost !== null && renderRow('frost', 'ac_unit', 'text-blue-400', t('marketplace.qfFrost'), `${formatCompactNumber(frost, 1)}${celsiusUnit}`, t('marketplace.frostToleranceHint'))}
                        {(pHMin !== null || pHMax !== null) && renderRow('ph', 'science', 'text-purple-400', t('marketplace.soilPhLabel'), formatRange(pHMin, pHMax, '', 1), t('marketplace.soilPhHint'))}
                        {drought && renderRow('drought', 'wb_sunny', 'text-amber-400', t('marketplace.droughtLabel'), <TolBar level={drought} />, toleranceHint('drought', drought))}
                        {shade && renderRow('shade', 'partly_cloudy_day', 'text-gray-400', t('marketplace.shadeLabel'), <TolBar level={shade} />, toleranceHint('shade', shade))}
                        {salinity && renderRow('salinity', 'water', 'text-cyan-400', t('marketplace.salinityLabel'), <TolBar level={salinity} />, toleranceHint('salinity', salinity))}
                        {stressStage && renderRow('criticalStage', 'warning', 'text-amber-400', t('marketplace.criticalStageLabel'), <span className="text-amber-300">{stressStage}</span>, t('marketplace.criticalStageHint'))}
                    </div>
                </div>
            )}

            {(growthCycle || primaryUse || irrigMethod || indoorOk) && (
                <div className="flex flex-wrap gap-2">
                    {growthCycle && <span className="flex items-center gap-1.5 bg-mobile-surface-dark rounded-full px-3 py-1.5 border border-white/5 text-xs text-gray-300"><span className="material-symbols-outlined text-mobile-primary text-sm">schedule</span>{growthCycle}</span>}
                    {primaryUse && <span className="flex items-center gap-1.5 bg-mobile-surface-dark rounded-full px-3 py-1.5 border border-white/5 text-xs text-gray-300"><span className="material-symbols-outlined text-mobile-primary text-sm">category</span>{primaryUse}</span>}
                    {irrigMethod && <span className="flex items-center gap-1.5 bg-mobile-surface-dark rounded-full px-3 py-1.5 border border-white/5 text-xs text-gray-300"><span className="material-symbols-outlined text-mobile-primary text-sm">water_drop</span>{irrigMethod}</span>}
                    {indoorOk && <span className="flex items-center gap-1.5 bg-mobile-surface-dark rounded-full px-3 py-1.5 border border-white/5 text-xs text-gray-300"><span className="material-symbols-outlined text-mobile-primary text-sm">home</span>{t('marketplace.indoorSuitableLabel')}</span>}
                </div>
            )}

            {techEntries.length > 0 && (
                <div>
                    <button
                        onClick={() => setTechOpen((v) => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-mobile-surface-dark/50 border border-white/5 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        <span className="flex items-center gap-2 text-xs">
                            <span className="material-symbols-outlined text-base">data_object</span>
                            {t('marketplace.technicalDetails')} ({techEntries.length})
                        </span>
                        <span className={`material-symbols-outlined text-base transition-transform duration-200 ${techOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {techOpen && (
                        <div className="mt-2 bg-mobile-surface-dark rounded-xl border border-white/5 divide-y divide-white/5">
                            {techEntries.map(([key, value]) => {
                                const meta = TECH_META[key];
                                const label = meta?.label ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
                                const display = formatTechValue(key, value);
                                return (
                                    <div key={key} className="flex items-center justify-between px-4 py-2.5">
                                        <span className="text-xs text-gray-500">{label}</span>
                                        <span className="text-xs text-gray-300 font-medium ml-4">{display}{meta?.unit ? ` ${meta.unit}` : ''}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PlantGrowingGuide;
