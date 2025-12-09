/**
 * useCalibration Hook
 * 
 * React hook for flow sensor calibration with real-time progress updates.
 * 
 * Usage:
 * ```tsx
 * const { 
 *   isCalibrating, progress, result,
 *   start, stop, finish, apply, reset 
 * } = useCalibration();
 * 
 * // Start calibration
 * await start();
 * 
 * // When water is measured
 * await finish(volumeMl);
 * 
 * // Apply to device
 * await apply();
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
    CalibrationService, 
    getCalibrationService,
    CalibrationProgress,
    CalibrationResult,
    CalibrationStage,
    DEFAULT_PULSES_PER_LITER
} from '../services/CalibrationService';
import { useAppStore } from '../store/useAppStore';
import { CalibrationAction } from '../types/firmware_structs';

export interface UseCalibrationReturn {
    // State
    isCalibrating: boolean;
    stage: CalibrationStage;
    progress: CalibrationProgress | null;
    result: CalibrationResult | null;
    currentPulsesPerLiter: number;
    
    // Actions
    start: () => Promise<void>;
    stop: () => Promise<void>;
    finish: (volumeMl: number) => Promise<CalibrationResult>;
    apply: () => Promise<CalibrationResult>;
    reset: () => Promise<CalibrationResult>;
    
    // Helpers
    estimatePulsesPerLiter: (volumeMl: number) => number;
    getElapsedTime: () => string;
}

export function useCalibration(): UseCalibrationReturn {
    const calibrationState = useAppStore(state => state.calibrationState);
    
    const [stage, setStage] = useState<CalibrationStage>('idle');
    const [progress, setProgress] = useState<CalibrationProgress | null>(null);
    const [result, setResult] = useState<CalibrationResult | null>(null);
    
    const serviceRef = useRef<CalibrationService | null>(null);
    const startTimeRef = useRef<number>(0);

    // Get service instance
    useEffect(() => {
        serviceRef.current = getCalibrationService();
    }, []);

    // Sync stage with calibration state
    useEffect(() => {
        if (!calibrationState) return;
        
        switch (calibrationState.action) {
            case CalibrationAction.START:
            case CalibrationAction.IN_PROGRESS:
                setStage('running');
                break;
            case CalibrationAction.CALCULATED:
                setStage('calculated');
                break;
            case CalibrationAction.STOP:
                if (stage !== 'completed' && stage !== 'failed') {
                    setStage('idle');
                }
                break;
        }
    }, [calibrationState, stage]);

    const handleProgress = useCallback((p: CalibrationProgress) => {
        setProgress(p);
        setStage(p.stage);
    }, []);

    const start = useCallback(async () => {
        if (!serviceRef.current) throw new Error('Service not initialized');
        
        setResult(null);
        startTimeRef.current = Date.now();
        await serviceRef.current.startCalibration(handleProgress);
    }, [handleProgress]);

    const stop = useCallback(async () => {
        if (!serviceRef.current) throw new Error('Service not initialized');
        
        await serviceRef.current.stopCalibration();
        setStage('idle');
        setProgress(null);
    }, []);

    const finish = useCallback(async (volumeMl: number): Promise<CalibrationResult> => {
        if (!serviceRef.current) throw new Error('Service not initialized');
        
        const res = await serviceRef.current.finishCalibration(volumeMl);
        setResult(res);
        if (!res.success) {
            setStage('failed');
        }
        return res;
    }, []);

    const apply = useCallback(async (): Promise<CalibrationResult> => {
        if (!serviceRef.current) throw new Error('Service not initialized');
        
        setStage('applying');
        const res = await serviceRef.current.applyCalibration();
        setResult(res);
        setStage(res.success ? 'completed' : 'failed');
        return res;
    }, []);

    const reset = useCallback(async (): Promise<CalibrationResult> => {
        if (!serviceRef.current) throw new Error('Service not initialized');
        
        const res = await serviceRef.current.resetCalibration();
        setResult(res);
        setStage('idle');
        setProgress(null);
        return res;
    }, []);

    const estimatePulsesPerLiter = useCallback((volumeMl: number): number => {
        if (!serviceRef.current) return 0;
        return serviceRef.current.estimatePulsesPerLiter(volumeMl);
    }, []);

    const getElapsedTime = useCallback((): string => {
        if (startTimeRef.current === 0) return '0:00';
        const seconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const isCalibrating = stage === 'running' || stage === 'waiting_volume';
    const currentPulsesPerLiter = calibrationState?.pulses_per_liter || DEFAULT_PULSES_PER_LITER;

    return {
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
        estimatePulsesPerLiter,
        getElapsedTime
    };
}
