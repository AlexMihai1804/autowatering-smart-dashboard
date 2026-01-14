import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { PackSyncService } from '../../services/packSyncService';
import { PackPlantListEntry, PackListEntry } from '../../types/firmware_structs';

type TabType = 'plants' | 'packs';

// Skeleton loader component
const SkeletonCard: React.FC = () => (
  <div className="bg-white/5 rounded-2xl p-4 animate-pulse">
    <div className="h-4 bg-white/10 rounded w-1/3 mb-3"></div>
    <div className="h-8 bg-white/10 rounded w-2/3 mb-2"></div>
    <div className="h-3 bg-white/10 rounded w-1/2"></div>
  </div>
);

const MobilePacksSettings: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const {
    packStats,
    packSyncInProgress,
    plantDb,
    customPlants,
    installedPacks
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<TabType>('plants');
  const [expandedRomSection, setExpandedRomSection] = useState(false);
  const [expandedCustomSection, setExpandedCustomSection] = useState(true);
  const [expandedRomCategories, setExpandedRomCategories] = useState<Set<string>>(new Set());
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [syncProgress, setSyncProgress] = useState({ progress: 0, count: 0, total: 0 });
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'uptodate'>('idle');
  
  // Modals
  const [selectedPlant, setSelectedPlant] = useState<PackPlantListEntry | null>(null);
  const [selectedPack, setSelectedPack] = useState<PackListEntry | null>(null);

  const packSyncService = PackSyncService.getInstance();

  // Minimum cooldown between refreshes (3 seconds)
  const REFRESH_COOLDOWN_MS = 3000;

  // Progress handler for streaming
  const handleProgress = (progress: number, count: number, total: number) => {
    setSyncProgress({ progress, count, total });
  };

  useEffect(() => {
    setSyncError(null);
    setSyncProgress({ progress: 0, count: 0, total: 0 });
    packSyncService.syncCustomPlantsFromDevice(false, handleProgress).catch(err => {
      console.error('[MobilePacksSettings] Sync failed:', err);
      setSyncError(t('mobilePacksSettings.syncError'));
    });
  }, []);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Calculate storage percentage
  const storagePercent = packStats
    ? Math.round((packStats.used_bytes / packStats.total_bytes) * 100)
    : 0;

  // Group ROM plants by category
  const romPlantsByCategory = plantDb.reduce((acc, plant) => {
    const category = plant.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(plant);
    return acc;
  }, {} as Record<string, typeof plantDb>);

  const romCategories = Object.keys(romPlantsByCategory).sort();

  // Check if refresh is on cooldown
  const isOnCooldown = Date.now() - lastRefreshTime < REFRESH_COOLDOWN_MS;
  const canRefresh = !packSyncInProgress && !isOnCooldown;

  // Manual refresh handler - force=true to bypass cache
  const handleRefresh = () => {
    if (!canRefresh) return;
    
    setSyncError(null);
    setSyncProgress({ progress: 0, count: 0, total: 0 });
    setLastRefreshTime(Date.now());
    
    packSyncService.syncCustomPlantsFromDevice(true, handleProgress).catch(err => {
      console.error('[MobilePacksSettings] Refresh failed:', err);
      setSyncError(t('mobilePacksSettings.syncError'));
    });
  };

  // Check for updates handler (placeholder - would call a server API)
  const handleCheckUpdates = async () => {
    setCheckingUpdates(true);
    setUpdateStatus('checking');
    
    try {
      // Simulate checking for updates (in real app, this would call a server)
      await new Promise(r => setTimeout(r, 2000));
      
      // For now, always say up to date
      setUpdateStatus('uptodate');
    } catch (err) {
      console.error('[MobilePacksSettings] Check updates failed:', err);
      setUpdateStatus('idle');
    } finally {
      setCheckingUpdates(false);
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-mobile-bg-dark">
        <div className="flex items-center p-4 pb-2 justify-between">
          <button
            onClick={() => history.goBack()}
            className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            {t('mobilePacksSettings.title')}
          </h2>
          <button
            onClick={handleRefresh}
            disabled={!canRefresh}
            className={`text-white flex size-12 shrink-0 items-center justify-center rounded-full transition-colors ${
              !canRefresh ? 'opacity-50' : 'hover:bg-white/10'
            }`}
          >
            <span className={`material-symbols-outlined ${packSyncInProgress ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-4 gap-2 pb-2">
          <button
            onClick={() => setActiveTab('plants')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'plants'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">eco</span>
              {t('mobilePacksSettings.tabs.plants')}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('packs')}
            className={`flex-1 py-2.5 px-4 rounded-xl font-medium text-sm transition-all ${
              activeTab === 'packs'
                ? 'bg-emerald-500 text-white'
                : 'bg-white/5 text-mobile-text-muted hover:bg-white/10'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">inventory_2</span>
              {t('mobilePacksSettings.tabs.packs')}
            </span>
          </button>
        </div>
      </div>

      {/* Loading Progress Bar */}
      {packSyncInProgress && (
        <div className="px-4 py-2">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all duration-200" 
              style={{ width: `${syncProgress.total > 0 ? Math.round(syncProgress.progress * 100) : 30}%` }} 
            />
          </div>
          <p className="text-xs text-mobile-text-muted text-center mt-2">
            {syncProgress.total > 0 
              ? `${t('mobilePacksSettings.loading')} (${syncProgress.count}/${syncProgress.total})`
              : t('mobilePacksSettings.loading')
            }
          </p>
        </div>
      )}

      {/* Error Banner */}
      {syncError && !packSyncInProgress && (
        <div className="px-4 py-2">
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-red-400">error</span>
            <p className="text-sm text-red-300 flex-1">{syncError}</p>
            <button
              onClick={() => setSyncError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 gap-4 pb-8 mt-2">

        {/* ============ PLANTS TAB ============ */}
        {activeTab === 'plants' && (
          <>
            {/* Storage Summary */}
            {packStats && (
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <span className="material-symbols-outlined">storage</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{t('mobilePacksSettings.storage.flash')}</p>
                      <p className="text-xs text-mobile-text-muted">
                        {formatBytes(packStats.used_bytes)} / {formatBytes(packStats.total_bytes)}
                      </p>
                    </div>
                  </div>
                  <span className="text-emerald-400 font-semibold">{storagePercent}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Plant Stats Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-blue-400 text-lg">memory</span>
                  <span className="text-xs text-mobile-text-muted uppercase">{t('mobilePacksSettings.storage.romPlants')}</span>
                </div>
                <p className="text-3xl font-bold text-white">{plantDb.length}</p>
                <p className="text-xs text-mobile-text-muted mt-1">{t('mobilePacksSettings.plants.builtIn')}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-emerald-400 text-lg">add_circle</span>
                  <span className="text-xs text-mobile-text-muted uppercase">{t('mobilePacksSettings.storage.customPlants')}</span>
                </div>
                <p className="text-3xl font-bold text-emerald-400">{customPlants.length}</p>
                <p className="text-xs text-mobile-text-muted mt-1">{t('mobilePacksSettings.plants.installed')}</p>
              </div>
            </div>

            {/* Custom Plants List */}
            {customPlants.length > 0 && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setExpandedCustomSection(!expandedCustomSection)}
                  className="flex items-center justify-between px-2"
                >
                  <h3 className="text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
                    {t('mobilePacksSettings.customPlants.title')} ({customPlants.length})
                  </h3>
                  <span className={`material-symbols-outlined text-mobile-text-muted transition-transform ${expandedCustomSection ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {expandedCustomSection && (
                  <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                    {customPlants.map((plant, idx) => {
                      const pack = installedPacks.find(p => p.pack_id === plant.pack_id);
                      return (
                        <button
                          key={plant.plant_id}
                          onClick={() => setSelectedPlant(plant)}
                          className={`w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors ${idx > 0 ? 'border-t border-white/5' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                              <span className="material-symbols-outlined">eco</span>
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-white">{plant.name}</p>
                              <p className="text-xs text-mobile-text-muted">
                                {t('mobilePacksSettings.labels.id')}: {plant.plant_id} • {t('mobilePacksSettings.labels.version')}{plant.version}
                                {pack && ` • ${pack.name}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                              {t('mobilePacksSettings.labels.pack')} {plant.pack_id}
                            </span>
                            <span className="material-symbols-outlined text-mobile-text-muted text-sm">
                              chevron_right
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Empty custom plants state */}
            {!packSyncInProgress && customPlants.length === 0 && packStats && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-mobile-text-muted">eco</span>
                </div>
                <p className="text-base font-medium text-white mb-1">{t('mobilePacksSettings.customPlants.empty')}</p>
                <p className="text-sm text-mobile-text-muted">{t('mobilePacksSettings.customPlants.emptyHint')}</p>
              </div>
            )}

            {/* ROM Plants Section */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setExpandedRomSection(!expandedRomSection)}
                className="flex items-center justify-between px-2"
              >
                <h3 className="text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
                  {t('mobilePacksSettings.romPlants.title')} ({plantDb.length})
                </h3>
                <span className={`material-symbols-outlined text-mobile-text-muted transition-transform ${expandedRomSection ? 'rotate-180' : ''}`}>
                  expand_more
                </span>
              </button>

              {expandedRomSection && (
                <div className="space-y-3">
                  {romCategories.map((category) => {
                    const isExpanded = expandedRomCategories.has(category);
                    const plants = romPlantsByCategory[category];
                    const displayPlants = isExpanded ? plants : plants.slice(0, 5);
                    
                    return (
                      <div key={category} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedRomCategories);
                            if (isExpanded) {
                              newSet.delete(category);
                            } else {
                              newSet.add(category);
                            }
                            setExpandedRomCategories(newSet);
                          }}
                          className="w-full px-4 py-3 bg-white/5 border-b border-white/5 flex items-center justify-between"
                        >
                          <div className="text-left">
                            <p className="text-sm font-medium text-white">{category}</p>
                            <p className="text-xs text-mobile-text-muted">{plants.length} {t('mobilePacksSettings.romPlants.plantsCount')}</p>
                          </div>
                          <span className={`material-symbols-outlined text-mobile-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            expand_more
                          </span>
                        </button>
                        <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
                          {displayPlants.map((plant) => (
                            <button
                              key={plant.id}
                              onClick={() => setSelectedPlant({
                                plant_id: plant.id,
                                pack_id: 0,
                                version: 0,
                                name: plant.common_name_en
                              })}
                              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <span className="material-symbols-outlined text-sm">grass</span>
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm text-white truncate">{plant.common_name_en}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ PACKS TAB ============ */}
        {activeTab === 'packs' && (
          <>
            {/* Installed Packs */}
            {installedPacks.length > 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
                    {t('mobilePacksSettings.packs.installed')} ({installedPacks.length})
                  </h3>
                  <button
                    onClick={handleCheckUpdates}
                    disabled={checkingUpdates}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                      checkingUpdates
                        ? 'bg-white/5 text-mobile-text-muted'
                        : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-sm ${checkingUpdates ? 'animate-spin' : ''}`}>
                      {checkingUpdates ? 'refresh' : 'system_update'}
                    </span>
                    {checkingUpdates ? t('mobilePacksSettings.updates.checking') : t('mobilePacksSettings.updates.check')}
                  </button>
                </div>

                <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                  {installedPacks.map((pack, idx) => (
                    <button
                      key={pack.pack_id}
                      onClick={() => setSelectedPack(pack)}
                      className={`w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors ${idx > 0 ? 'border-t border-white/5' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                          <span className="material-symbols-outlined">inventory_2</span>
                        </div>
                        <div className="text-left">
                          <p className="text-base font-medium text-white">{pack.name}</p>
                          <p className="text-xs text-mobile-text-muted">
                            {t('mobilePacksSettings.labels.version')}{pack.version} • {pack.plant_count} {t('mobilePacksSettings.romPlants.plantsCount')}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-mobile-text-muted">
                        chevron_right
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Update Status */}
            {updateStatus === 'uptodate' && (
              <div className="bg-emerald-500/10 rounded-2xl p-4 border border-emerald-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-400">check_circle</span>
                <p className="text-sm text-emerald-400">{t('mobilePacksSettings.updates.upToDate')}</p>
              </div>
            )}

            {updateStatus === 'available' && (
              <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-400">info</span>
                <p className="text-sm text-blue-400">{t('mobilePacksSettings.updates.available')}</p>
              </div>
            )}

            {/* Empty packs state */}
            {!packSyncInProgress && installedPacks.length === 0 && packStats && (
              <div className="bg-white/5 rounded-2xl p-6 border border-white/5 text-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-mobile-text-muted">inventory_2</span>
                </div>
                <p className="text-base font-medium text-white mb-1">{t('mobilePacksSettings.packs.empty')}</p>
                <p className="text-sm text-mobile-text-muted">{t('mobilePacksSettings.packs.emptyHint')}</p>
              </div>
            )}

            {/* Available Packs (placeholder for future) */}
            {installedPacks.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
                  {t('mobilePacksSettings.packs.available')}
                </h3>
                
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5 border-dashed">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-mobile-text-muted">
                      <span className="material-symbols-outlined">cloud_download</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-mobile-text-muted font-medium">{t('mobilePacksSettings.packs.comingSoon')}</p>
                      <p className="text-xs text-mobile-text-muted">{t('mobilePacksSettings.packs.comingSoonHint')}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* Plant Details Modal */}
      {selectedPlant && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setSelectedPlant(null)}>
          <div 
            className="w-full bg-mobile-bg-dark rounded-t-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <span className="material-symbols-outlined text-3xl">eco</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedPlant.name}</h2>
                  {(() => {
                    // Find plant in ROM or get info from custom plant
                    const romPlant = plantDb.find(p => p.id === selectedPlant.plant_id);
                    const pack = installedPacks.find(p => p.pack_id === selectedPlant.pack_id);
                    return (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                          {selectedPlant.pack_id === 0 ? 'ROM' : `Pack ${selectedPlant.pack_id}`}
                        </span>
                        {pack && (
                          <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                            {pack.name}
                          </span>
                        )}
                        <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-mobile-text-muted">
                          {t('mobilePacksSettings.labels.version')}{selectedPlant.version}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Details Grid */}
              {(() => {
                const romPlant = plantDb.find(p => p.id === selectedPlant.plant_id);
                if (!romPlant) {
                  return (
                    <div className="space-y-3">
                      <DetailRow label={t('mobilePacksSettings.plantDetails.plantId')} value={selectedPlant.plant_id.toString()} />
                      <DetailRow label={t('mobilePacksSettings.plantDetails.packId')} value={selectedPlant.pack_id.toString()} />
                      <DetailRow label={t('mobilePacksSettings.plantDetails.version')} value={selectedPlant.version.toString()} />
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    <DetailRow label={t('mobilePacksSettings.plantDetails.scientificName')} value={romPlant.scientific_name || '-'} />
                    <DetailRow label={t('mobilePacksSettings.plantDetails.category')} value={romPlant.category || '-'} />
                    <DetailRow label={t('mobilePacksSettings.plantDetails.plantId')} value={romPlant.id.toString()} />
                    <DetailRow label={t('mobilePacksSettings.plantDetails.packId')} value={selectedPlant.pack_id.toString()} />
                    {romPlant.kc_ini !== undefined && romPlant.kc_ini !== null && (
                      <DetailRow label={t('mobilePacksSettings.plantDetails.kcIni')} value={romPlant.kc_ini.toFixed(2)} />
                    )}
                    {romPlant.kc_mid !== undefined && romPlant.kc_mid !== null && (
                      <DetailRow label={t('mobilePacksSettings.plantDetails.kcMid')} value={romPlant.kc_mid.toFixed(2)} />
                    )}
                    {romPlant.kc_end !== undefined && romPlant.kc_end !== null && (
                      <DetailRow label={t('mobilePacksSettings.plantDetails.kcEnd')} value={romPlant.kc_end.toFixed(2)} />
                    )}
                    {romPlant.root_depth_max_m !== undefined && romPlant.root_depth_max_m !== null && (
                      <DetailRow 
                        label={t('mobilePacksSettings.plantDetails.rootingDepth')} 
                        value={`${(romPlant.root_depth_max_m * 100).toFixed(0)} cm`} 
                      />
                    )}
                  </div>
                );
              })()}

              {/* Close Button */}
              <button
                onClick={() => setSelectedPlant(null)}
                className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
              >
                {t('mobilePacksSettings.plantDetails.close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pack Details Modal */}
      {selectedPack && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-end" onClick={() => setSelectedPack(null)}>
          <div 
            className="w-full bg-mobile-bg-dark rounded-t-3xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined text-3xl">inventory_2</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white mb-1">{selectedPack.name}</h2>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                      {t('mobilePacksSettings.labels.pack')} {selectedPack.pack_id}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-mobile-text-muted">
                      {t('mobilePacksSettings.labels.version')}{selectedPack.version}
                    </span>
                    <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">
                      {selectedPack.plant_count} {t('mobilePacksSettings.romPlants.plantsCount')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plants in Pack */}
              <div className="space-y-2 mb-6">
                <h3 className="text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
                  {t('mobilePacksSettings.packDetails.plantsInPack')}
                </h3>
                <div className="bg-white/5 rounded-2xl border border-white/5 divide-y divide-white/5 max-h-80 overflow-y-auto">
                  {customPlants
                    .filter(p => p.pack_id === selectedPack.pack_id)
                    .map((plant) => {
                      const romPlant = plantDb.find(p => p.id === plant.plant_id);
                      return (
                        <button
                          key={plant.plant_id}
                          onClick={() => {
                            setSelectedPack(null);
                            setSelectedPlant(plant);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                            <span className="material-symbols-outlined">eco</span>
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-white">{plant.name}</p>
                            {romPlant && (
                              <p className="text-xs text-mobile-text-muted">{romPlant.scientific_name}</p>
                            )}
                          </div>
                          <span className="material-symbols-outlined text-mobile-text-muted text-sm">
                            chevron_right
                          </span>
                        </button>
                      );
                    })}
                  {customPlants.filter(p => p.pack_id === selectedPack.pack_id).length === 0 && (
                    <div className="p-6 text-center">
                      <p className="text-sm text-mobile-text-muted">{t('mobilePacksSettings.packDetails.noPlants')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setSelectedPack(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
              >
                {t('mobilePacksSettings.packDetails.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper component for detail rows
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
    <span className="text-sm text-mobile-text-muted">{label}</span>
    <span className="text-sm font-medium text-white">{value}</span>
  </div>
);

export default MobilePacksSettings;
