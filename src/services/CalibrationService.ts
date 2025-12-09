/**
 * Calibration Service
 * 
 * Provides a high-level API for flow sensor calibration with a simple workflow.
 * 
 * Calibration Workflow:
 * 1. startCalibration() - Begin counting pulses
 * 2. Device sends periodic progress notifications (action=0x02)
 * 3. finishCalibration(volumeMl) - Provide measured volume, get pulses_per_liter
 * 4. applyCalibration() - Persist to device NVS
 * 
 * Alternative:
 * - resetCalibration() - Restore default calibration (750 pulses/L)
 * - stopCalibration() - Abort without saving
 * 
 * @see docs-embedded/ble-api/characteristics/11-calibration-management.md
 */

import { BleService } from './BleService';
import { CalibrationAction, CalibrationData, CalibrationState } from '../types/firmware_structs';
import { useAppStore } from '../store/useAppStore';

export interface CalibrationResult {
    success: boolean;
    pulsesPerLiter?: number;
    pulsesCounted?: number;
    error?: string;
}

export interface CalibrationProgress {
    stage: CalibrationStage;
    pulses: number;
    volumeMl: number;
    pulsesPerLiter: number;
    elapsedSeconds: number;
}

export type CalibrationStage = 
    | 'idle' 
    | 'running' 
    | 'waiting_volume' 
    | 'calculated' 
    | 'applying' 
    | 'completed' 
    | 'failed';

// Default calibration value
export const DEFAULT_PULSES_PER_LITER = 750;

// Minimum volume for accurate calibration (1 liter recommended)
export const MIN_CALIBRATION_VOLUME_ML = 500;

// Recommended volume for best accuracy
export const RECOMMENDED_CALIBRATION_VOLUME_ML = 2000;

export class CalibrationService {
    private bleService: BleService;
    private startTime: number = 0;
    private progressCallback: ((progress: CalibrationProgress) => void) | null = null;
    private unsubscribeStore: (() => void) | null = null;

    constructor(bleService: BleService) {
        this.bleService = bleService;
    }

    /**
     * Start calibration measurement
     * 
     * This begins counting pulses from the flow sensor.
     * Progress updates will be sent via notifications (~200ms interval).
     * 
     * @param onProgress - Callback for progress updates
     */
    async startCalibration(
        onProgress?: (progress: CalibrationProgress) => void
    ): Promise<void> {
        this.progressCallback = onProgress || null;
        this.startTime = Date.now();

        // Subscribe to store for progress updates
        this.subscribeToProgress();

        try {
            console.log('[CalibrationService] Starting calibration...');
            await this.bleService.writeCalibration(CalibrationAction.START, 0);
            
            // Initial progress
            this.emitProgress('running');
        } catch (error: any) {
            this.cleanup();
            throw new Error(this.mapError(error));
        }
    }

    /**
     * Stop calibration without saving
     * 
     * Aborts the current calibration run. Pulse count is preserved
     * but no calculation is performed.
     */
    async stopCalibration(): Promise<void> {
        try {
            console.log('[CalibrationService] Stopping calibration...');
            await this.bleService.writeCalibration(CalibrationAction.STOP, 0);
            this.emitProgress('idle');
        } finally {
            this.cleanup();
        }
    }

    /**
     * Finish calibration and calculate pulses per liter
     * 
     * @param volumeMl - Actual volume dispensed in milliliters
     * @returns Calculated pulses per liter
     */
    async finishCalibration(volumeMl: number): Promise<CalibrationResult> {
        if (volumeMl < MIN_CALIBRATION_VOLUME_ML) {
            return {
                success: false,
                error: `Volumul minim pentru calibrare este ${MIN_CALIBRATION_VOLUME_ML}ml. Încercați din nou cu mai multă apă.`
            };
        }

        try {
            console.log(`[CalibrationService] Finishing with volume: ${volumeMl}ml`);
            await this.bleService.writeCalibration(CalibrationAction.CALCULATED, volumeMl);
            
            // Wait for response
            await this.waitForAction(CalibrationAction.CALCULATED, 5000);
            
            const state = this.getCurrentState();
            if (!state || state.pulses_per_liter === 0) {
                throw new Error('Calculul a eșuat - nu s-au numărat pulsuri');
            }

            this.emitProgress('calculated');

            return {
                success: true,
                pulsesPerLiter: state.pulses_per_liter,
                pulsesCounted: state.pulses
            };
        } catch (error: any) {
            this.emitProgress('failed');
            return {
                success: false,
                error: this.mapError(error)
            };
        }
    }

    /**
     * Apply the calculated calibration to device storage
     * 
     * This persists the calibration value to NVS.
     * Call after finishCalibration() succeeds.
     */
    async applyCalibration(): Promise<CalibrationResult> {
        const state = this.getCurrentState();
        if (!state || state.pulses_per_liter === 0) {
            return {
                success: false,
                error: 'Nu există o calibrare calculată de aplicat'
            };
        }

        try {
            console.log(`[CalibrationService] Applying calibration: ${state.pulses_per_liter} pulses/L`);
            this.emitProgress('applying');
            
            await this.bleService.writeCalibration(CalibrationAction.APPLY, 0);
            
            // Wait for idle state
            await this.waitForAction(CalibrationAction.STOP, 5000);
            
            this.emitProgress('completed');
            this.cleanup();

            return {
                success: true,
                pulsesPerLiter: state.pulses_per_liter
            };
        } catch (error: any) {
            this.emitProgress('failed');
            return {
                success: false,
                error: this.mapError(error)
            };
        }
    }

    /**
     * Reset calibration to default value
     * 
     * Restores the default calibration (750 pulses/L).
     */
    async resetCalibration(): Promise<CalibrationResult> {
        try {
            console.log('[CalibrationService] Resetting to default calibration...');
            await this.bleService.writeCalibration(CalibrationAction.RESET, 0);
            
            await this.waitForAction(CalibrationAction.STOP, 5000);
            
            this.cleanup();

            return {
                success: true,
                pulsesPerLiter: DEFAULT_PULSES_PER_LITER
            };
        } catch (error: any) {
            return {
                success: false,
                error: this.mapError(error)
            };
        }
    }

    /**
     * Perform complete calibration flow
     * 
     * This is a convenience method that guides through the entire process.
     * Note: You must call getVolumeMl callback when water dispensing is complete.
     * 
     * @param getVolumeMl - Async function that returns the measured volume
     * @param onProgress - Callback for progress updates
     */
    async performFullCalibration(
        getVolumeMl: () => Promise<number>,
        onProgress?: (progress: CalibrationProgress) => void
    ): Promise<CalibrationResult> {
        try {
            // Step 1: Start
            await this.startCalibration(onProgress);

            // Step 2: Wait for user to measure water and provide volume
            this.emitProgress('waiting_volume');
            const volumeMl = await getVolumeMl();

            if (volumeMl <= 0) {
                await this.stopCalibration();
                return {
                    success: false,
                    error: 'Calibrare anulată'
                };
            }

            // Step 3: Calculate
            const calcResult = await this.finishCalibration(volumeMl);
            if (!calcResult.success) {
                return calcResult;
            }

            // Step 4: Apply
            return await this.applyCalibration();

        } catch (error: any) {
            await this.stopCalibration().catch(() => {});
            return {
                success: false,
                error: this.mapError(error)
            };
        }
    }

    /**
     * Read current calibration from device
     */
    async readCurrentCalibration(): Promise<CalibrationData> {
        return this.bleService.readCalibration();
    }

    /**
     * Get current calibration state from store
     */
    getCurrentState(): CalibrationData | null {
        return useAppStore.getState().calibrationState;
    }

    /**
     * Check if calibration is currently running
     */
    isCalibrating(): boolean {
        const state = this.getCurrentState();
        return state?.action === CalibrationAction.START || 
               state?.action === CalibrationAction.IN_PROGRESS;
    }

    /**
     * Get elapsed time in seconds since calibration started
     */
    getElapsedSeconds(): number {
        if (this.startTime === 0) return 0;
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    /**
     * Calculate estimated pulses per liter based on current readings
     */
    estimatePulsesPerLiter(estimatedVolumeMl: number): number {
        const state = this.getCurrentState();
        if (!state || state.pulses === 0 || estimatedVolumeMl <= 0) return 0;
        return Math.round((state.pulses * 1000) / estimatedVolumeMl);
    }

    /**
     * Subscribe to store updates for progress
     */
    private subscribeToProgress(): void {
        this.unsubscribeStore = useAppStore.subscribe((state, prevState) => {
            const current = state.calibrationState;
            const prev = prevState.calibrationState;

            if (current && current !== prev) {
                this.handleStateChange(current);
            }
        });
    }

    /**
     * Handle calibration state changes
     */
    private handleStateChange(state: CalibrationData): void {
        switch (state.action) {
            case CalibrationAction.START:
            case CalibrationAction.IN_PROGRESS:
                this.emitProgress('running');
                break;
            case CalibrationAction.CALCULATED:
                this.emitProgress('calculated');
                break;
            case CalibrationAction.STOP:
                this.emitProgress('idle');
                break;
        }
    }

    /**
     * Emit progress to callback
     */
    private emitProgress(stage: CalibrationStage): void {
        if (!this.progressCallback) return;

        const state = this.getCurrentState();
        this.progressCallback({
            stage,
            pulses: state?.pulses || 0,
            volumeMl: state?.volume_ml || 0,
            pulsesPerLiter: state?.pulses_per_liter || 0,
            elapsedSeconds: this.getElapsedSeconds()
        });
    }

    /**
     * Wait for specific action in state
     */
    private waitForAction(action: CalibrationAction, timeoutMs: number): Promise<void> {
        return new Promise((resolve, reject) => {
            const checkState = () => {
                const state = this.getCurrentState();
                // Action 0 (STOP) means idle state after apply/reset
                if (action === CalibrationAction.STOP && state?.action === 0) return true;
                if (state?.action === action) return true;
                return false;
            };

            if (checkState()) {
                resolve();
                return;
            }

            const unsubscribe = useAppStore.subscribe(() => {
                if (checkState()) {
                    unsubscribe();
                    resolve();
                }
            });

            setTimeout(() => {
                unsubscribe();
                reject(new Error('Timeout așteptând răspunsul dispozitivului'));
            }, timeoutMs);
        });
    }

    /**
     * Cleanup subscriptions
     */
    private cleanup(): void {
        if (this.unsubscribeStore) {
            this.unsubscribeStore();
            this.unsubscribeStore = null;
        }
        this.progressCallback = null;
        this.startTime = 0;
    }

    /**
     * Map BLE errors to user-friendly messages
     */
    private mapError(error: any): string {
        const message = error.message || String(error);

        if (message.includes('VALUE_NOT_ALLOWED')) {
            const state = this.getCurrentState();
            if (state?.action === CalibrationAction.IN_PROGRESS) {
                return 'Nu s-au detectat pulsuri sau volumul este zero';
            }
            return 'Operație invalidă în starea curentă';
        }
        if (message.includes('UNLIKELY')) {
            return 'Eroare la salvarea calibrării - verificați dispozitivul';
        }
        if (message.includes('INVALID_OFFSET')) {
            return 'Eroare de comunicare - încercați din nou';
        }
        if (message.includes('Not connected')) {
            return 'Dispozitivul nu este conectat';
        }

        return message;
    }
}

// Singleton instance
let calibrationServiceInstance: CalibrationService | null = null;

export function initCalibrationService(bleService: BleService): CalibrationService {
    calibrationServiceInstance = new CalibrationService(bleService);
    return calibrationServiceInstance;
}

export function getCalibrationService(): CalibrationService | null {
    return calibrationServiceInstance;
}

/**
 * Helper: Calculate accuracy of calibration
 */
export function getCalibrationAccuracy(pulsesPerLiter: number): 'high' | 'medium' | 'low' {
    // Typical flow sensors have 300-1500 pulses/L
    if (pulsesPerLiter < 100 || pulsesPerLiter > 3000) return 'low';
    if (pulsesPerLiter < 200 || pulsesPerLiter > 2000) return 'medium';
    return 'high';
}

/**
 * Helper: Format calibration value for display
 */
export function formatCalibration(pulsesPerLiter: number): string {
    return `${pulsesPerLiter} pulsuri/L`;
}

/**
 * Helper: Calculate flow rate from pulses
 */
export function calculateFlowRate(pulsesPerSecond: number, pulsesPerLiter: number): number {
    if (pulsesPerLiter === 0) return 0;
    // Returns liters per minute
    return (pulsesPerSecond / pulsesPerLiter) * 60;
}
