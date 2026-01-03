import React, { useState } from 'react';
import { IonContent, IonPage, IonFab, IonFabButton, IonIcon } from '@ionic/react';
import { add } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import ZoneCard from '../components/ZoneCard';
import ZoneConfigModal from '../components/ZoneConfigModal';
import { TaskStatus, isChannelConfigComplete } from '../types/firmware_structs';
import { useI18n } from '../i18n';

const Zones: React.FC = () => {
  const { zones, currentTask, autoCalcStatus, systemConfig, wizardState, onboardingState } = useAppStore();
  const { t } = useI18n();
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(0);
  const [modalMode, setModalMode] = useState<'setup' | 'edit' | 'job'>('edit');

  // Check if a channel is configured using completedZones from store
  const isChannelConfigured = (channelId: number): boolean => {
    if (onboardingState && onboardingState.channel_extended_flags !== undefined) {
      const ext = onboardingState.channel_extended_flags;
      if (isChannelConfigComplete(ext, channelId)) return true;
    }
    return wizardState.completedZones.includes(channelId);
  };

  const handleAddZone = () => {
    // Find first unconfigured channel
    const numChannels = systemConfig?.num_channels || 8;
    for (let i = 0; i < numChannels; i++) {
      if (!isChannelConfigured(i)) {
        setSelectedChannel(i);
        setModalMode('setup');
        setModalOpen(true);
        return;
      }
    }
    // All channels configured, just open first one
    setSelectedChannel(0);
    setModalMode('setup');
    setModalOpen(true);
  };

  const handleEditZone = (channelId: number) => {
    setSelectedChannel(channelId);
    // If not configured, show setup; otherwise show edit
    setModalMode(isChannelConfigured(channelId) ? 'edit' : 'setup');
    setModalOpen(true);
  };

  const handleStartJob = (channelId: number) => {
    setSelectedChannel(channelId);
    setModalMode('job');
    setModalOpen(true);
  };

  const getChannelFlagState = (channelId: number): { show: boolean; complete: boolean } => {
    if (onboardingState && onboardingState.channel_config_flags !== undefined) {
      const baseFlags = onboardingState.channel_config_flags ?? BigInt(0);
      const extFlags = onboardingState.channel_extended_flags ?? BigInt(0);
      const baseByte = Number((baseFlags >> BigInt(channelId * 8)) & BigInt(0xFF));
      const extByte = Number((extFlags >> BigInt(channelId * 8)) & BigInt(0xFF));
      const complete = isChannelConfigComplete(extFlags, channelId);
      const hasAny = baseByte > 0 || extByte > 0 || complete;
      return { show: hasAny, complete };
    }
    // Fallback: use wizard completion tracking
    const complete = wizardState.completedZones.includes(channelId);
    return { show: complete, complete };
  };

  const getOnboardingFlagsHex = (channelId: number): string | undefined => {
    if (!onboardingState) return undefined;

    const baseFlags = onboardingState.channel_config_flags ?? BigInt(0);
    const extFlags = onboardingState.channel_extended_flags ?? BigInt(0);
    const schedFlags = onboardingState.schedule_config_flags ?? 0;

    const baseByte = Number((baseFlags >> BigInt(channelId * 8)) & BigInt(0xFF));
    const extByte = Number((extFlags >> BigInt(channelId * 8)) & BigInt(0xFF));
    const schedBit = (schedFlags >> channelId) & 0x01;

    const toHex = (v: number) => `0x${v.toString(16).padStart(2, '0')}`;
    return `base=${toHex(baseByte)} ext=${toHex(extByte)} sched=${schedBit}`;
  };

  return (
    <IonPage>
      <IonContent className="bg-cyber-dark">
        <div className="p-6 max-w-7xl mx-auto pb-24">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-white">{t('zones.irrigationZones')}</h1>
            <span className="text-gray-400 text-sm">
              {t('zones.activeCount').replace('{count}', String(zones.length))}
            </span>
          </div>

          {(() => {
            const visibleZones = zones.filter((z) => getChannelFlagState(z.channel_id).show);
            if (visibleZones.length === 0) {
              return (
                <div className="text-center py-20 opacity-50">
                  <div className="text-6xl mb-4">{t('common.notAvailable')}</div>
                  <h3 className="text-xl font-bold text-white">{t('zones.noZonesConfigured')}</h3>
                  <p className="text-gray-400">{t('zones.tapAddZone')}</p>
                </div>
              );
            }
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {visibleZones.map((zone) => {
                  const flags = getChannelFlagState(zone.channel_id);
                  return (
                  <ZoneCard 
                    key={zone.channel_id} 
                    zone={zone}
                    currentDeficit={autoCalcStatus.get(zone.channel_id)?.current_deficit_mm || 0}
                    isWatering={currentTask?.status === TaskStatus.RUNNING && currentTask?.channel_id === zone.channel_id}
                    isConfigured={flags.complete}
                    onboardingFlagsHex={getOnboardingFlagsHex(zone.channel_id)}
                    onEdit={() => handleEditZone(zone.channel_id)}
                    onStartJob={() => handleStartJob(zone.channel_id)}
                  />
                  );
                })}
              </div>
            );
          })()}
        </div>

        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="mb-16 mr-4">
          <IonFabButton color="secondary" onClick={handleAddZone}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Zone Config Modal */}
        <ZoneConfigModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          channelId={selectedChannel}
          mode={modalMode}
        />
      </IonContent>
    </IonPage>
  );
};

export default Zones;

