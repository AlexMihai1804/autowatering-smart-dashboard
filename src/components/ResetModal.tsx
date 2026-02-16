/**
 * ResetModal Component
 * 
 * Device reset operations with confirmation workflow.
 */

import React, { useState } from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonRadio,
    IonRadioGroup,
    IonSelect,
    IonSelectOption,
    IonSpinner,
    IonAlert
} from '@ionic/react';
import { warning, checkmarkCircle, closeCircle, refresh, trash } from 'ionicons/icons';
import { useReset, RESET_OPTIONS } from '../hooks/useReset';
import { ResetOpcode } from '../types/firmware_structs';
import { useI18n } from '../i18n';

interface ResetModalProps {
    isOpen: boolean;
    onClose: () => void;
    channelNames?: string[]; // Optional channel names for display
}

type ModalStep = 'select' | 'confirm' | 'executing' | 'complete' | 'error';

const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, channelNames }) => {
    const {
        isPending,
        isExecuting,
        progress,
        performReset,
        getResetName,
        getResetDescription,
        isChannelRequired
    } = useReset();

    const { t } = useI18n();

    const [step, setStep] = useState<ModalStep>('select');
    const [selectedType, setSelectedType] = useState<ResetOpcode | null>(null);
    const [selectedChannel, setSelectedChannel] = useState<number>(0);
    const [error, setError] = useState<string | null>(null);
    const [showDangerConfirm, setShowDangerConfirm] = useState(false);

    // Reset state when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setStep('select');
            setSelectedType(null);
            setSelectedChannel(0);
            setError(null);
        }
    }, [isOpen]);

    const selectedOption = RESET_OPTIONS.find(o => o.type === selectedType);
    const requiresChannel = selectedType !== null && isChannelRequired(selectedType);

    const handleProceed = () => {
        if (!selectedType) return;

        if (selectedOption?.dangerous) {
            setShowDangerConfirm(true);
        } else {
            executeReset();
        }
    };

    const executeReset = async () => {
        if (selectedType === null) return;

        setStep('executing');
        setError(null);

        try {
            const channelId = requiresChannel ? selectedChannel : 0xFF;
            const result = await performReset(selectedType, channelId);

            if (result.success) {
                setStep('complete');
            } else {
                setError(result.error || t('mobileDeviceReset.resetFailed').replace('{reason}', ''));
                setStep('error');
            }
        } catch (e: any) {
            setError(e.message);
            setStep('error');
        }
    };

    const getChannelName = (index: number): string => {
        if (channelNames && channelNames[index]) {
            return channelNames[index];
        }
        return `${t('reset.channel')} ${index + 1}`;
    };

    const renderStep = () => {
        switch (step) {
            case 'select':
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <div className="w-16 h-16 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center mb-4">
                                <IonIcon icon={refresh} className="text-3xl text-amber-400" />
                            </div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('reset.deviceReset')}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {t('reset.selectType')}
                            </p>
                        </div>

                        <IonRadioGroup
                            value={selectedType}
                            onIonChange={e => setSelectedType(e.detail.value)}
                        >
                            <IonList className="bg-transparent">
                                {RESET_OPTIONS.map(option => (
                                    <IonItem
                                        key={option.type}
                                        className={`bg-gray-800/50 rounded-lg mb-2 ${option.dangerous ? 'border border-red-900/50' : ''}`}
                                        lines="none"
                                    >
                                        <IonRadio slot="start" value={option.type} />
                                        <IonLabel>
                                            <h3 className={`font-medium ${option.dangerous ? 'text-red-400' : 'text-white'}`}>
                                                {option.dangerous && <IonIcon icon={warning} className="mr-1" />}
                                                {option.name}
                                            </h3>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {option.description.substring(0, 80)}...
                                            </p>
                                        </IonLabel>
                                    </IonItem>
                                ))}
                            </IonList>
                        </IonRadioGroup>

                        {requiresChannel && (
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <IonLabel className="text-gray-400 text-sm">{t('reset.selectChannel')}</IonLabel>
                                <IonSelect
                                    value={selectedChannel}
                                    onIonChange={e => setSelectedChannel(e.detail.value)}
                                    interface="popover"
                                    className="text-white mt-2"
                                >
                                    {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
                                        <IonSelectOption key={i} value={i}>
                                            {getChannelName(i)}
                                        </IonSelectOption>
                                    ))}
                                </IonSelect>
                            </div>
                        )}

                        {selectedOption && (
                            <div className={`rounded-lg p-4 ${selectedOption.dangerous ? 'bg-red-900/20 border border-red-900/50' : 'bg-gray-800/30'}`}>
                                <p className={`text-sm ${selectedOption.dangerous ? 'text-red-400' : 'text-gray-400'}`}>
                                    {selectedOption.description}
                                </p>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={onClose} className="flex-1">
                                {t('common.cancel')}
                            </IonButton>
                            <IonButton
                                expand="block"
                                color={selectedOption?.dangerous ? 'danger' : 'primary'}
                                onClick={handleProceed}
                                disabled={!selectedType}
                                className="flex-1"
                            >
                                {t('reset.continue')}
                            </IonButton>
                        </div>
                    </div>
                );

            case 'executing':
                return (
                    <div className="text-center space-y-6 py-8">
                        <IonSpinner name="crescent" className="w-16 h-16 text-cyan-400" />

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {progress?.stage === 'waiting_confirmation' ? t('reset.waitingConfirmation') : t('reset.executing')}
                            </h2>
                            <p className="text-gray-400">
                                {selectedType !== null && getResetName(selectedType)}
                            </p>
                        </div>

                        {progress?.confirmationCode && (
                            <div className="bg-gray-800/50 rounded-lg p-4">
                                <p className="text-sm text-gray-400">{t('reset.confirmationCode')}</p>
                                <p className="text-2xl font-mono text-cyan-400">
                                    {progress.confirmationCode}
                                </p>
                            </div>
                        )}

                        <p className="text-sm text-amber-400">
                            {t('reset.doNotClose')}
                        </p>
                    </div>
                );

            case 'complete':
                return (
                    <div className="text-center space-y-6 py-8">
                        <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={checkmarkCircle} className="text-5xl text-green-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('reset.complete')}
                            </h2>
                            <p className="text-gray-400">
                                {selectedType !== null && getResetName(selectedType)}
                            </p>
                        </div>

                        <IonButton expand="block" onClick={onClose}>
                            {t('common.close')}
                        </IonButton>
                    </div>
                );

            case 'error':
                return (
                    <div className="text-center space-y-6 py-8">
                        <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={closeCircle} className="text-5xl text-red-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('reset.error')}
                            </h2>
                            <p className="text-red-400">
                                {error}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={onClose} className="flex-1">
                                {t('common.close')}
                            </IonButton>
                            <IonButton expand="block" onClick={() => setStep('select')} className="flex-1">
                                {t('reset.tryAgain')}
                            </IonButton>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <IonModal isOpen={isOpen} onDidDismiss={onClose}>
                <IonHeader>
                    <IonToolbar className="bg-gray-900">
                        <IonTitle className="text-white">{t('reset.title')}</IonTitle>
                    </IonToolbar>
                </IonHeader>
                <IonContent className="bg-gray-900">
                    <div className="p-6 max-w-md mx-auto">
                        {renderStep()}
                    </div>
                </IonContent>
            </IonModal>

            <IonAlert
                isOpen={showDangerConfirm}
                onDidDismiss={() => setShowDangerConfirm(false)}
                header={`⚠️ ${t('reset.warning')}`}
                message={t('reset.confirmDanger')}
                buttons={[
                    {
                        text: t('common.cancel'),
                        role: 'cancel'
                    },
                    {
                        text: t('reset.yesContinue'),
                        role: 'destructive',
                        handler: () => {
                            setShowDangerConfirm(false);
                            executeReset();
                        }
                    }
                ]}
            />
        </>
    );
};

export default ResetModal;
