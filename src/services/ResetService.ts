/**
 * Reset Control Service
 * 
 * Provides a high-level API for device reset operations with two-stage
 * confirmation workflow for safety.
 * 
 * Workflow:
 * 1. requestReset() - Request a confirmation code from device
 * 2. Wait for notification with confirmation code (status=0x01)
 * 3. executeReset() - Execute reset with the received code
 * 4. Wait for completion notification (status=0xFF)
 * 
 * @see docs-embedded/ble-api/characteristics/25-reset-control.md
 */

import { BleService } from './BleService';
import { ResetOpcode, ResetStatus, ResetControlData } from '../types/firmware_structs';
import { useAppStore } from '../store/useAppStore';

export interface ResetResult {
    success: boolean;
    error?: string;
    errorCode?: string;
}

export interface ResetProgress {
    stage: 'idle' | 'requesting' | 'waiting_confirmation' | 'executing' | 'completed' | 'failed';
    resetType: ResetOpcode;
    channelId?: number;
    confirmationCode?: number;
    error?: string;
}

/**
 * Human-readable names for reset operations
 */
export const RESET_NAMES: Record<ResetOpcode, string> = {
    [ResetOpcode.RESET_CHANNEL_CONFIG]: 'Resetare configurație canal',
    [ResetOpcode.RESET_CHANNEL_SCHEDULES]: 'Resetare programări canal',
    [ResetOpcode.RESET_ALL_CHANNEL_CONFIGS]: 'Resetare toate configurațiile',
    [ResetOpcode.RESET_ALL_SCHEDULES]: 'Resetare toate programările',
    [ResetOpcode.RESET_SYSTEM_CONFIG]: 'Resetare configurație sistem',
    [ResetOpcode.RESET_HISTORY]: 'Ștergere istoric',
    [ResetOpcode.FACTORY_RESET]: 'Resetare la setări din fabrică',
};

/**
 * Descriptions for reset operations
 */
export const RESET_DESCRIPTIONS: Record<ResetOpcode, string> = {
    [ResetOpcode.RESET_CHANNEL_CONFIG]: 'Restaurează configurația canalului la valorile implicite, șterge numele și balanța de apă.',
    [ResetOpcode.RESET_CHANNEL_SCHEDULES]: 'Șterge toate programările pentru canalul selectat.',
    [ResetOpcode.RESET_ALL_CHANNEL_CONFIGS]: 'Restaurează toate configurațiile canalelor la valorile implicite.',
    [ResetOpcode.RESET_ALL_SCHEDULES]: 'Șterge toate programările pentru toate canalele.',
    [ResetOpcode.RESET_SYSTEM_CONFIG]: 'Restaurează configurația sistemului (fus orar, setări automate).',
    [ResetOpcode.RESET_HISTORY]: 'Șterge istoricul de ploaie și contoarele asociate.',
    [ResetOpcode.FACTORY_RESET]: '⚠️ PERICULOS: Resetează complet dispozitivul la starea din fabrică. Toate datele vor fi pierdute!',
};

/**
 * Check if reset type requires a channel ID
 */
export function resetRequiresChannel(type: ResetOpcode): boolean {
    return type === ResetOpcode.RESET_CHANNEL_CONFIG || 
           type === ResetOpcode.RESET_CHANNEL_SCHEDULES;
}

export class ResetService {
    private bleService: BleService;
    private pendingReset: ResetProgress | null = null;
    private confirmationTimeout: NodeJS.Timeout | null = null;

    // Timeout for waiting for confirmation code (10 seconds)
    private static readonly CONFIRMATION_TIMEOUT_MS = 10000;
    // Firmware confirmation validity (5 minutes)
    private static readonly CONFIRMATION_VALIDITY_SEC = 300;

    constructor(bleService: BleService) {
        this.bleService = bleService;
    }

    /**
     * Perform a complete reset operation with two-stage confirmation
     * 
     * @param type - Reset operation type
     * @param channelId - Channel ID (required for channel-specific resets)
     * @param onProgress - Callback for progress updates
     * @returns Promise resolving to reset result
     */
    async performReset(
        type: ResetOpcode,
        channelId: number = 0xFF,
        onProgress?: (progress: ResetProgress) => void
    ): Promise<ResetResult> {
        // Validate channel requirement
        if (resetRequiresChannel(type) && (channelId < 0 || channelId > 7)) {
            return {
                success: false,
                error: `Tipul de resetare ${RESET_NAMES[type]} necesită un canal valid (0-7)`
            };
        }

        this.pendingReset = {
            stage: 'requesting',
            resetType: type,
            channelId
        };
        onProgress?.(this.pendingReset);

        try {
            // Step 1: Request confirmation code
            console.log(`[ResetService] Requesting reset: ${RESET_NAMES[type]}, channel=${channelId}`);
            await this.bleService.requestReset(type, channelId);

            // Step 2: Wait for confirmation code notification
            this.pendingReset.stage = 'waiting_confirmation';
            onProgress?.(this.pendingReset);

            const confirmationCode = await this.waitForConfirmationCode(type, channelId);
            
            if (!confirmationCode) {
                throw new Error('Nu s-a primit codul de confirmare în timpul alocat');
            }

            this.pendingReset.confirmationCode = confirmationCode;
            this.pendingReset.stage = 'executing';
            onProgress?.(this.pendingReset);

            // Step 3: Execute reset with confirmation code
            console.log(`[ResetService] Executing reset with code: ${confirmationCode}`);
            await this.bleService.executeReset(type, channelId, confirmationCode);

            // Step 4: Wait for completion (idle status)
            await this.waitForIdle();

            this.pendingReset.stage = 'completed';
            onProgress?.(this.pendingReset);

            console.log(`[ResetService] Reset completed successfully`);
            return { success: true };

        } catch (error: any) {
            const errorMessage = this.mapError(error);
            this.pendingReset.stage = 'failed';
            this.pendingReset.error = errorMessage;
            onProgress?.(this.pendingReset);

            console.error(`[ResetService] Reset failed:`, error);
            return {
                success: false,
                error: errorMessage,
                errorCode: error.code
            };
        } finally {
            this.clearTimeout();
            this.pendingReset = null;
        }
    }

    /**
     * Request only the confirmation code without executing
     * Useful for UI that wants to show the code before final confirmation
     */
    async requestConfirmationCode(
        type: ResetOpcode,
        channelId: number = 0xFF
    ): Promise<number | null> {
        await this.bleService.requestReset(type, channelId);
        return this.waitForConfirmationCode(type, channelId);
    }

    /**
     * Execute reset with a known confirmation code
     */
    async executeWithCode(
        type: ResetOpcode,
        channelId: number,
        confirmationCode: number
    ): Promise<ResetResult> {
        try {
            await this.bleService.executeReset(type, channelId, confirmationCode);
            await this.waitForIdle();
            return { success: true };
        } catch (error: any) {
            return {
                success: false,
                error: this.mapError(error),
                errorCode: error.code
            };
        }
    }

    /**
     * Get current reset state from store
     */
    getCurrentState(): ResetControlData | null {
        return useAppStore.getState().resetState;
    }

    /**
     * Check if a reset is pending
     */
    isResetPending(): boolean {
        const state = this.getCurrentState();
        return state?.status === ResetStatus.PENDING;
    }

    /**
     * Wait for confirmation code notification
     */
    private waitForConfirmationCode(
        type: ResetOpcode,
        channelId: number
    ): Promise<number | null> {
        return new Promise((resolve) => {
            const checkState = () => {
                const resetState = useAppStore.getState().resetState;
                if (resetState && 
                    resetState.status === ResetStatus.PENDING &&
                    resetState.reset_type === type &&
                    resetState.channel_id === channelId &&
                    resetState.confirmation_code !== 0) {
                    this.clearTimeout();
                    resolve(resetState.confirmation_code);
                    return true;
                }
                return false;
            };

            // Check immediately in case notification already arrived
            if (checkState()) return;

            // Subscribe to store changes - callback receives entire store state
            const unsubscribe = useAppStore.subscribe(() => {
                if (checkState()) {
                    unsubscribe();
                }
            });

            // Set timeout
            this.confirmationTimeout = setTimeout(() => {
                unsubscribe();
                resolve(null);
            }, ResetService.CONFIRMATION_TIMEOUT_MS);
        });
    }

    /**
     * Wait for reset to complete (idle status)
     */
    private waitForIdle(): Promise<void> {
        return new Promise((resolve, reject) => {
            const checkState = () => {
                const resetState = useAppStore.getState().resetState;
                if (resetState && resetState.status === ResetStatus.IDLE) {
                    return true;
                }
                return false;
            };

            if (checkState()) {
                resolve();
                return;
            }

            // Subscribe to store changes - callback receives entire store state
            const unsubscribe = useAppStore.subscribe(() => {
                if (checkState()) {
                    unsubscribe();
                    resolve();
                }
            });

            // Timeout after 30 seconds
            setTimeout(() => {
                unsubscribe();
                reject(new Error('Timeout așteptând finalizarea resetării'));
            }, 30000);
        });
    }

    private clearTimeout(): void {
        if (this.confirmationTimeout) {
            clearTimeout(this.confirmationTimeout);
            this.confirmationTimeout = null;
        }
    }

    /**
     * Map BLE errors to user-friendly messages
     */
    private mapError(error: any): string {
        const message = error.message || String(error);
        
        // ATT error codes from firmware
        if (message.includes('VALUE_NOT_ALLOWED') || message.includes('0x13')) {
            return 'Operație nepermisă sau canal invalid';
        }
        if (message.includes('AUTHENTICATION') || message.includes('0x05')) {
            return 'Cod de confirmare greșit';
        }
        if (message.includes('AUTHORIZATION') || message.includes('0x06')) {
            return 'Codul de confirmare a expirat (peste 5 minute)';
        }
        if (message.includes('INSUFFICIENT_RESOURCES') || message.includes('0x11')) {
            return 'Eroare de stocare - verificați starea dispozitivului';
        }
        if (message.includes('UNLIKELY') || message.includes('0x0E')) {
            return 'Eroare internă a dispozitivului';
        }
        if (message.includes('Not connected')) {
            return 'Dispozitivul nu este conectat';
        }

        return message;
    }
}

// Singleton instance - will be initialized with BleService
let resetServiceInstance: ResetService | null = null;

export function initResetService(bleService: BleService): ResetService {
    resetServiceInstance = new ResetService(bleService);
    return resetServiceInstance;
}

export function getResetService(): ResetService | null {
    return resetServiceInstance;
}
