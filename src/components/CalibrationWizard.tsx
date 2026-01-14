/**
 * CalibrationWizard Component
 * 
 * Step-by-step flow sensor calibration with visual feedback.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    IonModal,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonSpinner,
    IonProgressBar
} from '@ionic/react';
import { water, checkmarkCircle, closeCircle, refreshCircle, helpCircle } from 'ionicons/icons';
import { useCalibration } from '../hooks/useCalibration';
import { 
    MIN_CALIBRATION_VOLUME_ML, 
    RECOMMENDED_CALIBRATION_VOLUME_ML,
    getCalibrationAccuracy,
    formatCalibration
} from '../services/CalibrationService';
import { useI18n } from '../i18n';

interface CalibrationWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type WizardStep = 'intro' | 'measuring' | 'volume' | 'result' | 'complete' | 'error';

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const {
        isCalibrating,
        stage,
        progress,
        result,
        currentPulsesPerLiter,
        start,
        stop,
        finish,
        apply,
        reset,
        getElapsedTime
    } = useCalibration();

    const [step, setStep] = useState<WizardStep>('intro');
    const [volumeInput, setVolumeInput] = useState<number>(RECOMMENDED_CALIBRATION_VOLUME_ML);
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [elapsedTime, setElapsedTime] = useState('0:00');

    // Update elapsed time every second during calibration
    useEffect(() => {
        if (step === 'measuring') {
            timerRef.current = setInterval(() => {
                setElapsedTime(getElapsedTime());
            }, 1000);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [step, getElapsedTime]);

    // Reset on close
    useEffect(() => {
        if (!isOpen) {
            setStep('intro');
            setError(null);
            setElapsedTime('0:00');
        }
    }, [isOpen]);

    const handleStart = async () => {
        try {
            setError(null);
            await start();
            setStep('measuring');
        } catch (e: any) {
            setError(e.message);
            setStep('error');
        }
    };

    const handleStop = async () => {
        try {
            await stop();
            setStep('intro');
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleFinish = async () => {
        if (volumeInput < MIN_CALIBRATION_VOLUME_ML) {
            setError(t('calibration.minVolumeError').replace('{min}', String(MIN_CALIBRATION_VOLUME_ML)));
            return;
        }

        try {
            setError(null);
            const res = await finish(volumeInput);
            if (res.success) {
                setStep('result');
            } else {
                setError(res.error || t('calibration.calibrationFailed'));
                setStep('error');
            }
        } catch (e: any) {
            setError(e.message);
            setStep('error');
        }
    };

    const handleApply = async () => {
        try {
            setError(null);
            const res = await apply();
            if (res.success) {
                setStep('complete');
            } else {
                setError(res.error || t('calibration.applyFailed'));
                setStep('error');
            }
        } catch (e: any) {
            setError(e.message);
            setStep('error');
        }
    };

    const handleReset = async () => {
        try {
            await reset();
            setStep('complete');
        } catch (e: any) {
            setError(e.message);
        }
    };

    const handleClose = () => {
        if (isCalibrating) {
            stop().catch(() => {});
        }
        onClose();
    };

    const renderStep = () => {
        switch (step) {
            case 'intro':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={water} className="text-5xl text-blue-400" />
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.introTitle')}
                            </h2>
                            <p className="text-gray-400">
                                {t('calibration.introDescription')}
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">{t('calibration.beforeStartTitle')}</h3>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>{t('calibration.beforeStartItem1')}</li>
                                <li>{t('calibration.beforeStartItem2')}</li>
                                <li>{t('calibration.beforeStartItem3')}</li>
                            </ul>
                        </div>

                        <div className="bg-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-500">
                                {t('calibration.currentCalibration').replace('{value}', formatCalibration(currentPulsesPerLiter))}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={handleClose} className="flex-1">
                                {t('common.cancel')}
                            </IonButton>
                            <IonButton expand="block" onClick={handleStart} className="flex-1">
                                {t('common.start')}
                            </IonButton>
                        </div>
                    </div>
                );

            case 'measuring':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                            <IonIcon icon={water} className="text-5xl text-green-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.measuringTitle')}
                            </h2>
                            <p className="text-gray-400">
                                {t('calibration.measuringDescription')}
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-3xl font-bold text-white">
                                        {progress?.pulses || 0}
                                    </p>
                                    <p className="text-sm text-gray-400">{t('calibration.pulsesLabel')}</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-cyan-400">
                                        {elapsedTime}
                                    </p>
                                    <p className="text-sm text-gray-400">{t('calibration.timeLabel')}</p>
                                </div>
                            </div>
                        </div>

                        <IonProgressBar type="indeterminate" color="success" />

                        <p className="text-sm text-amber-400">
                            {t('calibration.dontStopWater')}
                        </p>

                        <div className="flex gap-3">
                            <IonButton expand="block" color="danger" fill="outline" onClick={handleStop} className="flex-1">
                                {t('common.cancel')}
                            </IonButton>
                            <IonButton expand="block" color="success" onClick={() => setStep('volume')} className="flex-1">
                                {t('common.finish')}
                            </IonButton>
                        </div>
                    </div>
                );

            case 'volume':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-amber-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={helpCircle} className="text-5xl text-amber-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.volumeTitle')}
                            </h2>
                            <p className="text-gray-400">
                                {t('calibration.volumeDescription')}
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">
                                {t('calibration.pulsesCounted').replace('{count}', String(progress?.pulses || 0))}
                            </p>
                        </div>

                        <IonItem className="bg-gray-800/50 rounded-lg">
                            <IonLabel position="stacked" className="text-gray-400">{t('calibration.volumeLabel')}</IonLabel>
                            <IonInput
                                type="number"
                                value={volumeInput}
                                onIonChange={(e: any) => setVolumeInput(parseInt(e.detail.value!) || 0)}
                                className="text-white text-2xl text-center"
                                placeholder="2000"
                            />
                        </IonItem>

                        <p className="text-xs text-gray-500">
                            {t('calibration.volumeHint')
                                .replace('{min}', String(MIN_CALIBRATION_VOLUME_ML))
                                .replace('{recommended}', String(RECOMMENDED_CALIBRATION_VOLUME_ML))}
                        </p>

                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={() => setStep('measuring')} className="flex-1">
                                {t('common.back')}
                            </IonButton>
                            <IonButton expand="block" onClick={handleFinish} className="flex-1">
                                {t('calibration.calculate')}
                            </IonButton>
                        </div>
                    </div>
                );

            case 'result':
                const pulsesPerLiter = result?.pulsesPerLiter || 0;
                const accuracy = getCalibrationAccuracy(pulsesPerLiter);
                const accuracyColors = {
                    high: 'text-green-400',
                    medium: 'text-amber-400',
                    low: 'text-red-400'
                };
                const accuracyLabels = {
                    high: t('calibration.accuracyHigh'),
                    medium: t('calibration.accuracyMedium'),
                    low: t('calibration.accuracyLow')
                };

                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={checkmarkCircle} className="text-5xl text-green-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.resultTitle')}
                            </h2>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6">
                            <p className="text-4xl font-bold text-cyan-400 mb-2">
                                {pulsesPerLiter}
                            </p>
                            <p className="text-gray-400">{t('calibration.pulsesPerLiterLabel')}</p>
                            
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className={`text-sm ${accuracyColors[accuracy]}`}>
                                    {t('calibration.accuracyLabel').replace('{level}', accuracyLabels[accuracy])}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-800/30 rounded-lg p-3 text-sm text-gray-400">
                            <p>{t('calibration.summaryPulses').replace('{count}', String(result?.pulsesCounted ?? 0))}</p>
                            <p>{t('calibration.summaryVolume').replace('{volume}', String(volumeInput))}</p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={() => setStep('intro')} className="flex-1">
                                {t('common.cancel')}
                            </IonButton>
                            <IonButton expand="block" color="success" onClick={handleApply} className="flex-1">
                                {t('common.apply')}
                            </IonButton>
                        </div>
                    </div>
                );

            case 'complete':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={checkmarkCircle} className="text-5xl text-green-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.completeTitle')}
                            </h2>
                            <p className="text-gray-400">
                                {t('calibration.completeDescription')}
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-lg text-white">
                                {formatCalibration(result?.pulsesPerLiter || currentPulsesPerLiter)}
                            </p>
                        </div>

                        <IonButton expand="block" onClick={handleClose}>
                            {t('common.close')}
                        </IonButton>
                    </div>
                );

            case 'error':
                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-red-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={closeCircle} className="text-5xl text-red-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                {t('calibration.errorTitle')}
                            </h2>
                            <p className="text-red-400">
                                {error || t('calibration.errorDefault')}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={handleClose} className="flex-1">
                                {t('common.close')}
                            </IonButton>
                            <IonButton expand="block" onClick={() => setStep('intro')} className="flex-1">
                                {t('calibration.retry')}
                            </IonButton>
                        </div>
                    </div>
                );
        }
    };

    return (
        <IonModal isOpen={isOpen} onDidDismiss={handleClose}>
            <IonHeader>
                <IonToolbar className="bg-gray-900">
                    <IonTitle className="text-white">{t('calibration.title')}</IonTitle>
                </IonToolbar>
            </IonHeader>
            <IonContent className="bg-gray-900">
                <div className="p-6 max-w-md mx-auto">
                    {renderStep()}
                </div>
            </IonContent>
        </IonModal>
    );
};

export default CalibrationWizard;
