import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IonIcon, IonRange, IonToggle, IonButton, IonChip } from '@ionic/react';
import { water, settings, chevronDown, chevronUp, play, stop, flash, alertCircle } from 'ionicons/icons';
import { ChannelConfigData } from '../types/firmware_structs';
import { getPlantIcon } from '../utils/mappings';
import { BleService } from '../services/BleService';
import { useI18n } from '../i18n';

const PLANT_TYPE_KEYS = [
    'types.plant.vegetables',
    'types.plant.herbs',
    'types.plant.flowers',
    'types.plant.shrubs',
    'types.plant.trees',
    'types.plant.lawn',
    'types.plant.succulents',
    'types.plant.custom'
];

const SOIL_TYPE_KEYS = [
    'types.soil.clay',
    'types.soil.sandy',
    'types.soil.loamy',
    'types.soil.silty',
    'types.soil.rocky',
    'types.soil.peaty',
    'types.soil.pottingMix',
    'types.soil.hydroponic'
];

const IRRIGATION_TYPE_KEYS = [
    'types.irrigation.drip',
    'types.irrigation.sprinkler',
    'types.irrigation.soakerHose',
    'types.irrigation.microSpray',
    'types.irrigation.handWatering',
    'types.irrigation.flood'
];

interface ZoneCardProps {
    zone: ChannelConfigData;
    currentDeficit?: number; // mm
    isWatering?: boolean;
    isConfigured?: boolean;
    onboardingFlagsHex?: string;
    onEdit: () => void;
    onStartJob?: () => void;
}

const ZoneCard: React.FC<ZoneCardProps> = ({ zone, currentDeficit = 0, isWatering = false, isConfigured = true, onboardingFlagsHex, onEdit, onStartJob }) => {
    const { t } = useI18n();
    const [expanded, setExpanded] = useState(false);
    const [manualDuration, setManualDuration] = useState(10); // minutes
    const [manualMode, setManualMode] = useState<'duration' | 'volume'>('duration');
    const plantLabel = t(PLANT_TYPE_KEYS[zone.plant_type] || 'labels.unknown');
    const soilLabel = t(SOIL_TYPE_KEYS[zone.soil_type] || 'labels.unknown');
    const irrigationLabel = t(IRRIGATION_TYPE_KEYS[zone.irrigation_method] || 'labels.unknown');

    const handleStartWatering = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Action: 0=Duration (Minutes), 1=Volume (Liters)
            const action = manualMode === 'duration' ? 0 : 1;
            // Value: Minutes or Liters
            const value = manualDuration;
            
            await BleService.getInstance().writeValveControl(zone.channel_id, action, value);
        } catch (err) {
            console.error("Failed to start watering", err);
        }
    };

    const handleStopWatering = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // 0 = STOP
            await BleService.getInstance().writeValveControl(zone.channel_id, 0, 0);
        } catch (err) {
            console.error("Failed to stop watering", err);
        }
    };

    return (
        <motion.div 
            layout
            className={`glass-card mb-4 overflow-hidden border-l-4 ${
                isWatering ? 'border-l-cyber-cyan shadow-[0_0_15px_rgba(6,182,212,0.3)]' : 
                !isConfigured ? 'border-l-amber-500' : 'border-l-cyber-medium'
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
        >
            {/* Header / Collapsed View */}
            <div 
                className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`text-3xl w-12 h-12 rounded-full flex items-center justify-center ${
                            !isConfigured ? 'bg-amber-500/20' : 'bg-white/10'
                        }`}>
                            {!isConfigured ? <IonIcon icon={alertCircle} className="text-amber-500" /> : getPlantIcon(zone.plant_type)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-white">{zone.name || `${t('zoneDetails.zone')} ${zone.channel_id + 1}`}</h3>
                                {!isConfigured && (
                                    <IonChip color="warning" style={{ height: '20px', fontSize: '0.65rem', margin: 0 }}>
                                        {t('zoneDetails.notConfigured')}
                                    </IonChip>
                                )}
                            </div>
                            <p className="text-xs text-gray-400">
                                {isConfigured 
                                    ? `${plantLabel} - ${soilLabel}`
                                    : t('zoneDetails.tapToConfigure')
                                }
                            </p>
                            {onboardingFlagsHex && (
                                <p className="text-[10px] font-mono text-cyber-cyan">
                                    {onboardingFlagsHex}
                                </p>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {isWatering && (
                            <div className="flex items-center gap-1 text-cyber-cyan animate-pulse">
                                <IonIcon icon={water} />
                                <span className="text-xs font-bold">{t('labels.active')}</span>
                            </div>
                        )}
                        <IonIcon icon={expanded ? chevronUp : chevronDown} className="text-gray-500" />
                    </div>
                </div>

                {/* Soil Moisture Bar - only show if configured */}
                {isConfigured && (
                    <>
                        <div className="mt-4 relative h-2 bg-gradient-to-r from-amber-700 via-amber-900 to-blue-900 rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_5px_white]"
                                style={{ left: `${Math.max(0, Math.min(100, 100 - (currentDeficit * 2)))}%` }} 
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500 mt-1 font-mono">
                            <span>{t('zoneDetails.dry')}</span>
                            <span>{t('zoneDetails.wet')}</span>
                        </div>
                    </>
                )}
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
                {expanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10 bg-black/20"
                    >
                        <div className="p-4 space-y-6">
                            
                            {/* Not Configured State */}
                            {!isConfigured ? (
                                <div className="text-center py-6">
                                    <IonIcon icon={alertCircle} className="text-4xl text-amber-500 mb-3" />
                                    <h4 className="text-white font-bold mb-2">{t('zoneDetails.zoneNotConfiguredTitle')}</h4>
                                    <p className="text-gray-400 text-sm mb-6">
                                        {t('zoneDetails.zoneNotConfiguredDesc')}
                                    </p>
                                    <IonButton 
                                        expand="block"
                                        color="warning"
                                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                    >
                                        <IonIcon slot="start" icon={settings} />
                                        {t('zoneDetails.configureZone')}
                                    </IonButton>
                                </div>
                            ) : (
                                <>
                                    {/* Info Grid - only if configured */}
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-white/5 p-2 rounded">
                                            <span className="text-gray-500 block text-xs">{t('wizard.steps.irrigation')}</span>
                                            <span className="text-white">{irrigationLabel}</span>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded">
                                            <span className="text-gray-500 block text-xs">{t('zoneDetails.rootDepth')}</span>
                                            <span className="text-white">0.8{t('common.metersShort')}</span>
                                        </div>
                                    </div>

                                    {/* Quick Watering Button */}
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onStartJob?.(); }}
                                        className="w-full bg-gradient-to-r from-cyber-cyan/20 to-blue-500/20 hover:from-cyber-cyan/30 hover:to-blue-500/30 border border-cyber-cyan/50 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        <IonIcon icon={flash} className="text-2xl text-cyber-cyan" />
                                        <span className="text-cyber-cyan text-lg">{t('zoneDetails.quickWater')}</span>
                                    </button>

                                    {/* Manual Override Controls */}
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h4 className="text-cyber-cyan font-bold text-sm uppercase tracking-wider">{t('zoneDetails.manualOverride')}</h4>
                                            <div className="flex bg-black/40 rounded-lg p-1">
                                                <button 
                                                    className={`px-3 py-1 text-xs rounded ${manualMode === 'duration' ? 'bg-cyber-cyan text-black font-bold' : 'text-gray-400'}`}
                                                    onClick={() => setManualMode('duration')}
                                                >
                                                    {t('zoneDetails.duration')}
                                                </button>
                                                <button 
                                                    className={`px-3 py-1 text-xs rounded ${manualMode === 'volume' ? 'bg-cyber-cyan text-black font-bold' : 'text-gray-400'}`}
                                                    onClick={() => setManualMode('volume')}
                                                >
                                                    {t('zoneDetails.volume')}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="px-2">
                                            <div className="flex justify-between text-xs text-gray-400 mb-2">
                                                <span>{t('zoneDetails.duration')}</span>
                                                <span className="text-white font-mono text-lg">{manualDuration} {t('common.minutes')}</span>
                                            </div>
                                            <IonRange 
                                                min={1} 
                                                max={60} 
                                                value={manualDuration} 
                                                onIonChange={e => setManualDuration(e.detail.value as number)}
                                                color="secondary"
                                                className="pt-0"
                                            ></IonRange>
                                        </div>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={handleStartWatering}
                                                className="flex-1 bg-cyber-cyan/20 hover:bg-cyber-cyan/30 text-cyber-cyan border border-cyber-cyan/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                            >
                                                <IonIcon icon={play} /> {t('common.start')}
                                            </button>
                                            <button 
                                                onClick={handleStopWatering}
                                                className="flex-1 bg-cyber-rose/20 hover:bg-cyber-rose/30 text-cyber-rose border border-cyber-rose/50 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                                            >
                                                <IonIcon icon={stop} /> {t('common.stop')}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Footer Actions - Edit Settings */}
                                    <div className="pt-4 border-t border-white/10 flex justify-end">
                                        <IonButton 
                                            fill="clear" 
                                            size="small" 
                                            color="medium"
                                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                                        >
                                            <IonIcon slot="start" icon={settings} />
                                            {t('zoneDetails.editSettings')}
                                        </IonButton>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default ZoneCard;
