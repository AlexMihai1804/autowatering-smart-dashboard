import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import MobileBottomSheet from '../../components/mobile/MobileBottomSheet';
import plantDb from '../../assets/plant_full_db.json';
import soilDb from '../../assets/soil_enhanced_db.json';

type PlantInfo = { id: number; name: string; kc?: number; category?: string };
type SoilInfo = { id: number; name: string; description?: string };

const MobileZoneConfig: React.FC = () => {
  const history = useHistory();
  const { channelId } = useParams<{ channelId: string }>();
  const { zones } = useAppStore();

  const channelIdNum = parseInt(channelId, 10);
  const zone = zones.find(z => z.channel_id === channelIdNum);

  // Form state
  const [zoneName, setZoneName] = useState(zone?.name || 'Zone 1');
  const [selectedPlant, setSelectedPlant] = useState<PlantInfo | null>(null);
  const [selectedSoil, setSelectedSoil] = useState<SoilInfo | null>(null);
  const [sunExposure, setSunExposure] = useState<'full' | 'partial' | 'shade'>('full');
  const [areaSize, setAreaSize] = useState(50);

  // Bottom sheet states
  const [showPlantSheet, setShowPlantSheet] = useState(false);
  const [showSoilSheet, setShowSoilSheet] = useState(false);
  const [plantSearch, setPlantSearch] = useState('');
  const [soilSearch, setSoilSearch] = useState('');

  // Parse databases
  const plants: PlantInfo[] = Array.isArray(plantDb) ? plantDb.slice(0, 100) : [];
  const soils: SoilInfo[] = Array.isArray(soilDb) ? soilDb : [];

  const filteredPlants = plants.filter(p => 
    p.name?.toLowerCase().includes(plantSearch.toLowerCase())
  );
  const filteredSoils = soils.filter(s => 
    s.name?.toLowerCase().includes(soilSearch.toLowerCase())
  );

  const sunOptions = [
    { value: 'full', label: 'Full Sun', icon: 'wb_sunny', desc: '6+ hours direct sun' },
    { value: 'partial', label: 'Partial', icon: 'partly_cloudy_day', desc: '3-6 hours direct sun' },
    { value: 'shade', label: 'Shade', icon: 'cloud', desc: 'Less than 3 hours' },
  ];

  const handleSave = () => {
    // In real app, would save to BLE device / store
    console.log('Saving zone config:', {
      zoneName,
      selectedPlant,
      selectedSoil,
      sunExposure,
      areaSize,
    });
    history.goBack();
  };

  if (!zone) {
    return (
      <div className="min-h-screen bg-mobile-bg-dark font-manrope flex items-center justify-center">
        <p className="text-mobile-text-muted">Zone not found</p>
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
          Configure Zone
        </h2>
        <button 
          onClick={handleSave}
          className="text-mobile-primary flex size-12 items-center justify-center rounded-full hover:bg-mobile-primary/10 transition-colors font-bold"
        >
          <span className="material-symbols-outlined">check</span>
        </button>
      </div>

      <div className="px-4 space-y-6">
        {/* Zone Name */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            Zone Name
          </label>
          <input
            type="text"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="w-full h-14 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl px-4 text-white text-lg font-semibold placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary transition-colors"
            placeholder="Enter zone name"
          />
        </div>

        {/* Plant Type */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            Plant Type
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
                {selectedPlant?.name || 'Select plant type'}
              </span>
            </div>
            <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
          </button>
          {selectedPlant?.kc && (
            <p className="text-mobile-text-muted text-sm pl-1">
              Crop coefficient (Kc): <span className="text-mobile-primary font-bold">{selectedPlant.kc}</span>
            </p>
          )}
        </div>

        {/* Soil Type */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            Soil Type
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
                {selectedSoil?.name || 'Select soil type'}
              </span>
            </div>
            <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
          </button>
        </div>

        {/* Sun Exposure */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block">
            Sun Exposure
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
              Area Size
            </label>
            <span className="text-mobile-primary font-bold">{areaSize} m²</span>
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
            <span>1 m²</span>
            <span>500 m²</span>
          </div>
        </div>

        {/* Irrigation Method Preview */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
          <div className="p-4 border-b border-mobile-border-dark flex items-center justify-between">
            <span className="text-white font-bold">Calculated Settings</span>
            <span className="text-xs text-mobile-text-muted bg-white/10 px-2 py-1 rounded-full">Auto</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">Daily water need</span>
              <span className="text-white font-semibold">~{(areaSize * 0.4).toFixed(0)} L</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">Recommended cycle</span>
              <span className="text-white font-semibold">{Math.max(5, Math.round(areaSize / 5))} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-mobile-text-muted">Frequency</span>
              <span className="text-white font-semibold">Every 2 days</span>
            </div>
          </div>
        </div>

        {/* Advanced Settings Link */}
        <button className="w-full flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark hover:border-mobile-primary/50 transition-colors">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-mobile-text-muted">tune</span>
            <span className="text-white font-semibold">Advanced Settings</span>
          </div>
          <span className="material-symbols-outlined text-mobile-text-muted">chevron_right</span>
        </button>
      </div>

      {/* Save Button - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12">
        <button
          onClick={handleSave}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">save</span>
          Save Configuration
        </button>
      </div>

      {/* Plant Selection Bottom Sheet */}
      <MobileBottomSheet
        isOpen={showPlantSheet}
        onClose={() => setShowPlantSheet(false)}
        title="Select Plant Type"
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
              placeholder="Search plants..."
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredPlants.length === 0 ? (
            <p className="text-center text-mobile-text-muted py-8">No plants found</p>
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
        title="Select Soil Type"
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
              placeholder="Search soils..."
              className="w-full h-12 bg-mobile-surface-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
            />
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {filteredSoils.length === 0 ? (
            <p className="text-center text-mobile-text-muted py-8">No soils found</p>
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
