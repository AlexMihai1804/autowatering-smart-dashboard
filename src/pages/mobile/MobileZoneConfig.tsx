import React, { useState, useEffect, useMemo } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';

type PlantInfo = { id: number; name: string; kc?: number; category?: string };
type SoilInfo = { id: number; name: string; description?: string };

const MobileZoneConfig: React.FC = () => {
  const history = useHistory();
  const { channelId } = useParams<{ channelId: string }>();
  const { zones, plantDb, soilDb, growingEnv } = useAppStore();
  const bleService = BleService.getInstance();
  const { t } = useI18n();

  const channelIdNum = parseInt(channelId, 10);
  const zone = zones.find(z => z.channel_id === channelIdNum);
  const zoneGrowingEnv = growingEnv.get(channelIdNum);

  // Form state
  const [zoneName, setZoneName] = useState(zone?.name || `${t('zones.zone')} ${channelIdNum + 1}`);
  const [selectedPlant, setSelectedPlant] = useState<PlantInfo | null>(null);
  const [selectedSoil, setSelectedSoil] = useState<SoilInfo | null>(null);
  const [sunExposure, setSunExposure] = useState<'full' | 'partial' | 'shade'>('full');
  const [areaSize, setAreaSize] = useState(50);
  const [isSaving, setIsSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Bottom sheet states
  const [showPlantSheet, setShowPlantSheet] = useState(false);
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const [plantSearch, setPlantSearch] = useState('');
  const [soilSearch, setSoilSearch] = useState('');

  const plants: PlantInfo[] = useMemo(
    () => (Array.isArray(plantDb)
      ? plantDb.map((plant) => ({
        id: plant.id,
        name: plant.common_name_en,
        kc: plant.kc_mid ?? undefined,
        category: plant.category
      }))
      : []),
    [plantDb]
  );

  const soils: SoilInfo[] = useMemo(
    () => (Array.isArray(soilDb)
      ? soilDb.map((soil) => ({
        id: soil.id,
        name: soil.soil_type,
        description: soil.texture
      }))
      : []),
    [soilDb]
  );

  useEffect(() => {
    if (!zone || formInitialized) return;

    setZoneName(zone.name || `${t('zones.zone')} ${zone.channel_id + 1}`);
    setAreaSize(zone.coverage.area_m2 ? Math.max(1, Math.round(zone.coverage.area_m2)) : 50);

    if (zone.sun_percentage >= 70) setSunExposure('full');
    else if (zone.sun_percentage >= 40) setSunExposure('partial');
    else setSunExposure('shade');

    const plantId = zoneGrowingEnv?.plant_db_index ?? zone.plant_type;
    const soilId = zoneGrowingEnv?.soil_db_index ?? zone.soil_type;
    const initialPlant = plants.find((plant) => plant.id === plantId) ?? null;
    const initialSoil = soils.find((soil) => soil.id === soilId) ?? null;
    setSelectedPlant(initialPlant);
    setSelectedSoil(initialSoil);
    setFormInitialized(true);
  }, [zone, zoneGrowingEnv, plants, soils, t, formInitialized]);

  useEffect(() => {
    setFormInitialized(false);
  }, [channelIdNum]);

  const filteredPlants = plants.filter(p => 
    p.name?.toLowerCase().includes(plantSearch.toLowerCase())
  );
  const filteredSoils = soils.filter(s => 
    s.name?.toLowerCase().includes(soilSearch.toLowerCase())
  );

  const sunOptions = [
    { value: 'full', label: t('mobileZoneConfig.sun.full'), icon: 'wb_sunny', desc: t('mobileZoneConfig.sun.fullDesc') },
    { value: 'partial', label: t('mobileZoneConfig.sun.partial'), icon: 'partly_cloudy_day', desc: t('mobileZoneConfig.sun.partialDesc') },
    { value: 'shade', label: t('mobileZoneConfig.sun.shade'), icon: 'cloud', desc: t('mobileZoneConfig.sun.shadeDesc') },
  ];

  const handleSave = async () => {
    if (!zone) return;
    if (isSaving) return;

    const sunPercentageMap: Record<typeof sunExposure, number> = {
      full: 100,
      partial: 60,
      shade: 30
    };

    const sanitizedName = zoneName.trim() || `${t('zones.zone')} ${channelIdNum + 1}`;
    const selectedPlantId = selectedPlant?.id ?? zoneGrowingEnv?.plant_db_index ?? zone.plant_type;
    const selectedSoilId = selectedSoil?.id ?? zoneGrowingEnv?.soil_db_index ?? zone.soil_type;
    const firmwarePlantType = Math.min(Math.max(selectedPlantId, 0), 7);
    const firmwareSoilType = Math.min(Math.max(selectedSoilId, 0), 7);
    const sunPercentage = sunPercentageMap[sunExposure] ?? 100;

    setIsSaving(true);
    try {
      await bleService.writeChannelConfigObject({
        ...zone,
        name: sanitizedName,
        name_len: sanitizedName.length,
        plant_type: firmwarePlantType,
        soil_type: firmwareSoilType,
        coverage_type: 0,
        coverage: { area_m2: areaSize },
        sun_percentage: sunPercentage
      });

      const baseGrowingEnv = zoneGrowingEnv ?? await bleService.readGrowingEnvironment(channelIdNum).catch(() => null);
      if (baseGrowingEnv) {
        await bleService.writeGrowingEnvironment({
          ...baseGrowingEnv,
          plant_db_index: selectedPlantId,
          soil_db_index: firmwareSoilType,
          use_area_based: true,
          coverage: { area_m2: areaSize },
          sun_exposure_pct: sunPercentage,
          sun_percentage: sunPercentage,
          custom_name: sanitizedName,
          plant_type: firmwarePlantType,
          soil_type: firmwareSoilType
        });
      }

      await bleService.readChannelConfig(channelIdNum);
      await bleService.readGrowingEnvironment(channelIdNum).catch(() => undefined);
      history.goBack();
    } catch (error) {
      console.error('[MobileZoneConfig] Failed to save zone config:', error);
      const reason = error instanceof Error ? error.message : String(error);
      alert(`${t('common.error')}: ${reason}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!zone) {
    return (
      <div className="min-h-screen bg-mobile-bg-dark font-manrope flex items-center justify-center">
        <p className="text-mobile-text-muted">{t('mobileZoneConfig.zoneNotFound')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-32">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          {t('mobileZoneConfig.title')}
        </h2>
        <button 
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="text-mobile-primary flex size-12 items-center justify-center rounded-full hover:bg-mobile-primary/10 transition-colors font-bold"
        >
          <span className="material-symbols-outlined">check</span>
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Zone Name */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            {t('mobileZoneConfig.zoneName')}
          </label>
          <input
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="w-full h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-lg font-semibold placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary transition-colors"
            placeholder={t('mobileZoneConfig.zoneNamePlaceholder')}
          />
        </div>

        {/* Plant Type */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            {t('mobileZoneConfig.plantType')}
          </label>
          <button
            onClick={() => setShowPlantSheet(true)}
            className="w-full flex items-center justify-between gap-4 h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 hover:border-mobile-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-mobile-primary/10 flex items-center justify-center text-mobile-primary">
                <span className="material-symbols-outlined">eco</span>
              </div>
              <span className="text-white text-base font-semibold">
                {selectedPlant?.name || t('mobileZoneConfig.selectPlant')}
              </span>
            </div>
            <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
          </button>
          {selectedPlant?.kc && (
            <p className="text-mobile-text-muted text-sm pl-1">
              {t('mobileZoneConfig.cropCoefficient')}{' '}
              <span className="text-mobile-primary font-bold">{selectedPlant.kc}</span>
            </p>
          )}
        </div>

        {/* Soil Type */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            {t('mobileZoneConfig.soilType')}
          </label>
          <button
            onClick={() => setShowSoilSheet(true)}
            className="w-full flex items-center justify-between gap-4 h-16 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 hover:border-mobile-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                <span className="material-symbols-outlined">landscape</span>
              </div>
              <span className="text-white text-base font-semibold">
                {selectedSoil?.name || t('mobileZoneConfig.selectSoil')}
              </span>
            </div>
            <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
          </button>
        </div>

        {/* Sun Exposure */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            {t('mobileZoneConfig.sunExposure')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {sunOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSunExposure(opt.value as typeof sunExposure)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                  sunExposure === opt.value
                    ? 'bg-mobile-primary/10 border-mobile-primary'
                    : 'bg-mobile-surface-dark border-mobile-border-dark hover:border-mobile-primary/50'
                }`}
              >
                <span className={`material-symbols-outlined text-2xl ${
                  sunExposure === opt.value ? 'text-mobile-primary' : 'text-mobile-text-muted'
                }`}>
                  {opt.icon}
                </span>
                <span className={`text-sm font-bold ${
                  sunExposure === opt.value ? 'text-white' : 'text-mobile-text-muted'
                }`}>
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
          <p className="text-mobile-text-muted text-sm pl-1">
            {sunOptions.find(o => o.value === sunExposure)?.desc}
          </p>
        </div>

        {/* Area Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted">
              {t('mobileZoneConfig.areaSize')}
            </label>
            <span className="text-mobile-primary font-bold">{areaSize} {t('mobileZoneConfig.areaUnit')}</span>
          </div>
          <input
            type="range"
            min="1"
            max="500"
            value={areaSize}
            onChange={(e) => setAreaSize(Number(e.target.value))}
            className="w-full h-2 bg-mobile-surface-dark rounded-lg appearance-none cursor-pointer accent-mobile-primary"
          />
          <div className="flex justify-between text-xs text-mobile-text-muted">
            <span>1 {t('mobileZoneConfig.areaUnit')}</span>
            <span>500 {t('mobileZoneConfig.areaUnit')}</span>
          </div>
        </div>

        {/* Irrigation Method Preview */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
          <div className="p-4 border-b border-mobile-border-dark flex items-center justify-between">
            <span className="text-white font-bold">{t('mobileZoneConfig.calculatedSettings')}</span>
            <span className="text-xs text-mobile-text-muted bg-white/10 px-2 py-1 rounded-full">{t('mobileZoneConfig.autoBadge')}</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">{t('mobileZoneConfig.dailyWaterNeed')}</span>
              <span className="text-white font-semibold">~{(areaSize * 0.4).toFixed(0)} {t('common.litersShort')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">{t('mobileZoneConfig.recommendedCycle')}</span>
              <span className="text-white font-semibold">{Math.max(5, Math.round(areaSize / 5))} {t('common.minutesShort')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">{t('mobileZoneConfig.frequency')}</span>
              <span className="text-white font-semibold">{t('mobileZoneConfig.everyTwoDays')}</span>
            </div>
          </div>
        </div>

        {/* Advanced Settings Link */}
        <button
          onClick={() => history.push(`/zones/${channelIdNum}`)}
          className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark hover:border-mobile-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-mobile-text-muted">tune</span>
            <span className="text-white font-semibold">{t('mobileZoneConfig.advancedSettings')}</span>
          </div>
          <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
        </button>
      </div>

      {/* Save Button - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 disabled:opacity-60"
        >
          <span className="material-symbols-outlined">{isSaving ? 'sync' : 'save'}</span>
          {isSaving ? t('common.loading') : t('mobileZoneConfig.save')}
        </button>
      </div>

      {/* Plant Selection Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showPlantSheet}
        onClose={() => setShowPlantSheet(false)}
        title={t('mobileZoneConfig.selectPlantTitle')}
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">
              search
            </span>
            <input
              type="text"
              value={plantSearch}
              onChange={(e) => setPlantSearch(e.target.value)}
              placeholder={t('mobileZoneConfig.searchPlants')}
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredPlants.length === 0 ? (
            <p className="text-center text-mobile-text-muted py-8">{t('mobileZoneConfig.noPlants')}</p>
          ) : (
            <div className="divide-y divide-mobile-border-dark">
              {filteredPlants.slice(0, 50).map(plant => (
                <button
                  key={plant.id}
                  onClick={() => {
                    setSelectedPlant(plant);
                    setShowPlantSheet(false);
                    setPlantSearch('');
                  }}
                  className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                    selectedPlant?.id === plant.id ? 'bg-mobile-primary/10' : ''
                  }`}
                >
                  <div className="size-10 rounded-full bg-mobile-primary/10 flex items-center justify-center text-mobile-primary">
                    <span className="material-symbols-outlined">eco</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">{plant.name}</p>
                    {plant.category && (
                      <p className="text-mobile-text-muted text-sm">{plant.category}</p>
                    )}
                  </div>
                  {selectedPlant?.id === plant.id && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </MobileBottomSheet>

      {/* Soil Selection Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showSoilSheet}
        onClose={() => setShowSoilSheet(false)}
        title={t('mobileZoneConfig.selectSoilTitle')}
      >
        <div className="p-4 border-b border-mobile-border-dark">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">
              search
            </span>
            <input
              type="text"
              value={soilSearch}
              onChange={(e) => setSoilSearch(e.target.value)}
              placeholder={t('mobileZoneConfig.searchSoils')}
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredSoils.length === 0 ? (
            <p className="text-center text-mobile-text-muted py-8">{t('mobileZoneConfig.noSoils')}</p>
          ) : (
            <div className="divide-y divide-mobile-border-dark">
              {filteredSoils.map(soil => (
                <button
                  key={soil.id}
                  onClick={() => {
                    setSelectedSoil(soil);
                    setShowSoilSheet(false);
                    setSoilSearch('');
                  }}
                  className={`w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors ${
                    selectedSoil?.id === soil.id ? 'bg-mobile-primary/10' : ''
                  }`}
                >
                  <div className="size-10 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500">
                    <span className="material-symbols-outlined">landscape</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-white font-semibold">{soil.name}</p>
                    {soil.description && (
                      <p className="text-mobile-text-muted text-sm line-clamp-1">{soil.description}</p>
                    )}
                  </div>
                  {selectedSoil?.id === soil.id && (
                    <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </MobileBottomSheet>
    </div>
  );
};

export default MobileZoneConfig;


