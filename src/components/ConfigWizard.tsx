import React, { useState, useMemo } from 'react';
import { IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonSearchbar, IonList, IonItem, IonLabel, IonNote, IonIcon } from '@ionic/react';
import { close, checkmark } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../i18n';
import { PlantDBEntry, SoilDBEntry } from '../services/DatabaseService';

interface ConfigWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (config: any) => void;
    initialConfig?: any;
}

const ConfigWizard: React.FC<ConfigWizardProps> = ({ isOpen, onClose, onSave, initialConfig }) => {
    const [step, setStep] = useState(1);
    const [searchText, setSearchText] = useState('');
    const { plantDb, soilDb } = useAppStore();
    const { t, language } = useI18n();

    const getPlantName = (plant: PlantDBEntry) => (language === 'ro' && plant.common_name_ro ? plant.common_name_ro : plant.common_name_en);

    // Form State
    const [selectedPlant, setSelectedPlant] = useState<PlantDBEntry | null>(null);
    const [selectedSoil, setSelectedSoil] = useState<SoilDBEntry | null>(null);
    const [autoEnabled, setAutoEnabled] = useState(true);

    const filteredPlants = useMemo(() => {
        if (!searchText) return plantDb.slice(0, 20); // Show first 20 by default
        const query = searchText.toLowerCase();
        return plantDb.filter(p => 
            p.common_name_en.toLowerCase().includes(query) ||
            p.common_name_ro.toLowerCase().includes(query) ||
            p.scientific_name.toLowerCase().includes(query)
        );
    }, [plantDb, searchText]);

    const handleNext = () => {
        if (step < 3) setStep(step + 1);
        else {
            // Save
            onSave({
                plantId: selectedPlant?.id,
                soilId: selectedSoil?.id,
                autoEnabled,
                name: selectedPlant ? getPlantName(selectedPlant) : t('zoneDetails.zone')
            });
            onClose();
        }
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={onClose} className="glass-modal">
            <IonHeader className="ion-no-border">
                <IonToolbar className="bg-cyber-dark text-white" style={{ '--background': '#0f172a' }}>
                    <IonTitle>
                        {t('wizard.title')} - {t('wizard.tutorial.stepProgress')
                            .replace('{current}', String(step))
                            .replace('{total}', '3')}
                    </IonTitle>
                    <IonButtons slot="end">
                        <IonButton onClick={onClose}>
                            <IonIcon icon={close} />
                        </IonButton>
                    </IonButtons>
                </IonToolbar>
            </IonHeader>
            <IonContent className="bg-cyber-dark">
                <div className="p-4 h-full flex flex-col">
                    
                    {/* Step 1: Plant Selection */}
                    {step === 1 && (
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-xl font-bold text-white mb-2">{t('wizard.steps.plant')}</h2>
                            <IonSearchbar 
                                value={searchText} 
                                onIonInput={e => setSearchText(e.detail.value!)} 
                                placeholder={t('wizard.plant.searchPlaceholder')}
                                className="mb-4"
                            />
                            <div className="flex-1 overflow-y-auto glass-panel">
                                <IonList className="bg-transparent">
                                    {filteredPlants.map(plant => (
                                        <IonItem 
                                            key={plant.id} 
                                            button 
                                            onClick={() => setSelectedPlant(plant)}
                                            className={selectedPlant?.id === plant.id ? 'selected-item' : ''}
                                            style={{ '--background': 'transparent', '--color': 'white' }}
                                        >
                                            <IonLabel>
                                                <h2>{getPlantName(plant)}</h2>
                                                <p className="text-gray-400">{plant.category}</p>
                                            </IonLabel>
                                            {selectedPlant?.id === plant.id && <IonIcon icon={checkmark} slot="end" color="secondary" />}
                                        </IonItem>
                                    ))}
                                </IonList>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Soil Selection */}
                    {step === 2 && (
                        <div className="flex-1 flex flex-col">
                            <h2 className="text-xl font-bold text-white mb-4">{t('wizard.soil.title')}</h2>
                            <div className="flex-1 overflow-y-auto glass-panel">
                                <IonList className="bg-transparent">
                                    {soilDb.map(soil => (
                                        <IonItem 
                                            key={soil.id} 
                                            button 
                                            onClick={() => setSelectedSoil(soil)}
                                            style={{ '--background': 'transparent', '--color': 'white' }}
                                        >
                                            <IonLabel>
                                                <h2>{soil.texture}</h2>
                                                <p className="text-gray-400">{t('wizard.soil.infiltration')}: {soil.infiltration_rate_mm_h} {t('common.mmPerHour')}</p>
                                            </IonLabel>
                                            {selectedSoil?.id === soil.id && <IonIcon icon={checkmark} slot="end" color="secondary" />}
                                        </IonItem>
                                    ))}
                                </IonList>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Automation Settings */}
                    {step === 3 && (
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-6">{t('wizard.steps.schedule')}</h2>
                            
                            <div className="glass-panel p-4 mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{t('wizard.schedule.fao56Smart')}</h3>
                                    <p className="text-sm text-gray-400">{t('wizard.schedule.fao56SmartDesc')}</p>
                                </div>
                                <div 
                                    className={`w-14 h-8 rounded-full p-1 cursor-pointer transition-colors ${autoEnabled ? 'bg-cyber-emerald' : 'bg-gray-600'}`}
                                    onClick={() => setAutoEnabled(!autoEnabled)}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${autoEnabled ? 'translate-x-6' : ''}`} />
                                </div>
                            </div>

                            <div className="glass-panel p-4">
                                <h3 className="text-white font-bold mb-2">{t('wizard.summary.title')}</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('wizard.summary.plant')}:</span>
                                        <span className="text-white">{selectedPlant ? getPlantName(selectedPlant) : t('labels.none')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">{t('wizard.summary.soil')}:</span>
                                        <span className="text-white">{selectedSoil?.texture || t('labels.none')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Footer Navigation */}
                    <div className="mt-4 flex justify-between pt-4 border-t border-white/10">
                        <IonButton fill="clear" color="medium" onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
                            {step === 1 ? t('common.cancel') : t('common.back')}
                        </IonButton>
                        <IonButton 
                            color="secondary" 
                            onClick={handleNext}
                            disabled={(step === 1 && !selectedPlant) || (step === 2 && !selectedSoil)}
                        >
                            {step === 3 ? t('common.save') : t('common.next')}
                        </IonButton>
                    </div>
                </div>
            </IonContent>
        </IonModal>
    );
};

export default ConfigWizard;
