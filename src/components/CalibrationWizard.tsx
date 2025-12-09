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

interface CalibrationWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

type WizardStep = 'intro' | 'measuring' | 'volume' | 'result' | 'complete' | 'error';

const CalibrationWizard: React.FC<CalibrationWizardProps> = ({ isOpen, onClose }) => {
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
            setError(`Volumul minim este ${MIN_CALIBRATION_VOLUME_ML}ml`);
            return;
        }

        try {
            setError(null);
            const res = await finish(volumeInput);
            if (res.success) {
                setStep('result');
            } else {
                setError(res.error || 'Calibration failed');
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
                setError(res.error || 'Failed to apply');
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
                                Calibrare Senzor Debit
                            </h2>
                            <p className="text-gray-400">
                                Calibrarea măsoară câte pulsuri generează senzorul pentru fiecare litru de apă.
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4 text-left">
                            <h3 className="text-sm font-medium text-gray-300 mb-2">Înainte de a începe:</h3>
                            <ul className="text-sm text-gray-400 space-y-1">
                                <li>• Pregătiți un recipient gradat (2L recomandat)</li>
                                <li>• Asigurați-vă că aveți apă disponibilă</li>
                                <li>• Procesul durează 1-2 minute</li>
                            </ul>
                        </div>

                        <div className="bg-gray-800/30 rounded-lg p-3">
                            <p className="text-sm text-gray-500">
                                Calibrare curentă: <span className="text-white font-medium">
                                    {formatCalibration(currentPulsesPerLiter)}
                                </span>
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={handleClose} className="flex-1">
                                Anulează
                            </IonButton>
                            <IonButton expand="block" onClick={handleStart} className="flex-1">
                                Începe
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
                                Măsurare în curs...
                            </h2>
                            <p className="text-gray-400">
                                Deschideți robinetul și lăsați apa să curgă în recipient.
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6">
                            <div className="grid grid-cols-2 gap-4 text-center">
                                <div>
                                    <p className="text-3xl font-bold text-white">
                                        {progress?.pulses || 0}
                                    </p>
                                    <p className="text-sm text-gray-400">Pulsuri</p>
                                </div>
                                <div>
                                    <p className="text-3xl font-bold text-cyan-400">
                                        {elapsedTime}
                                    </p>
                                    <p className="text-sm text-gray-400">Timp</p>
                                </div>
                            </div>
                        </div>

                        <IonProgressBar type="indeterminate" color="success" />

                        <p className="text-sm text-amber-400">
                            ⚠️ Nu opriți apa până nu apăsați "Gata"
                        </p>

                        <div className="flex gap-3">
                            <IonButton expand="block" color="danger" fill="outline" onClick={handleStop} className="flex-1">
                                Anulează
                            </IonButton>
                            <IonButton expand="block" color="success" onClick={() => setStep('volume')} className="flex-1">
                                Gata
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
                                Cât de multă apă ați colectat?
                            </h2>
                            <p className="text-gray-400">
                                Măsurați volumul exact din recipient (în mililitri).
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-sm text-gray-400 mb-2">
                                Pulsuri numărate: <span className="text-white font-bold">{progress?.pulses || 0}</span>
                            </p>
                        </div>

                        <IonItem className="bg-gray-800/50 rounded-lg">
                            <IonLabel position="stacked" className="text-gray-400">Volum (ml)</IonLabel>
                            <IonInput
                                type="number"
                                value={volumeInput}
                                onIonChange={(e: any) => setVolumeInput(parseInt(e.detail.value!) || 0)}
                                className="text-white text-2xl text-center"
                                placeholder="2000"
                            />
                        </IonItem>

                        <p className="text-xs text-gray-500">
                            Minim {MIN_CALIBRATION_VOLUME_ML}ml, recomandat {RECOMMENDED_CALIBRATION_VOLUME_ML}ml
                        </p>

                        {error && (
                            <p className="text-red-400 text-sm">{error}</p>
                        )}

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={() => setStep('measuring')} className="flex-1">
                                Înapoi
                            </IonButton>
                            <IonButton expand="block" onClick={handleFinish} className="flex-1">
                                Calculează
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
                    high: 'Excelentă',
                    medium: 'Acceptabilă',
                    low: 'Verificați conexiunile'
                };

                return (
                    <div className="text-center space-y-6">
                        <div className="w-24 h-24 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                            <IonIcon icon={checkmarkCircle} className="text-5xl text-green-400" />
                        </div>

                        <div>
                            <h2 className="text-xl font-semibold text-white mb-2">
                                Calibrare Calculată!
                            </h2>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-6">
                            <p className="text-4xl font-bold text-cyan-400 mb-2">
                                {pulsesPerLiter}
                            </p>
                            <p className="text-gray-400">pulsuri / litru</p>
                            
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <p className={`text-sm ${accuracyColors[accuracy]}`}>
                                    Precizie: {accuracyLabels[accuracy]}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-800/30 rounded-lg p-3 text-sm text-gray-400">
                            <p>Pulsuri numărate: {result?.pulsesCounted}</p>
                            <p>Volum măsurat: {volumeInput}ml</p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={() => setStep('intro')} className="flex-1">
                                Renunță
                            </IonButton>
                            <IonButton expand="block" color="success" onClick={handleApply} className="flex-1">
                                Aplică
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
                                Calibrare Salvată!
                            </h2>
                            <p className="text-gray-400">
                                Noua calibrare a fost aplicată cu succes.
                            </p>
                        </div>

                        <div className="bg-gray-800/50 rounded-lg p-4">
                            <p className="text-lg text-white">
                                {formatCalibration(result?.pulsesPerLiter || currentPulsesPerLiter)}
                            </p>
                        </div>

                        <IonButton expand="block" onClick={handleClose}>
                            Închide
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
                                Eroare
                            </h2>
                            <p className="text-red-400">
                                {error || 'A apărut o eroare'}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <IonButton expand="block" fill="outline" onClick={handleClose} className="flex-1">
                                Închide
                            </IonButton>
                            <IonButton expand="block" onClick={() => setStep('intro')} className="flex-1">
                                Încearcă din nou
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
                    <IonTitle className="text-white">Calibrare Senzor</IonTitle>
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
