/**
 * useReset Hook
 * 
 * React hook for device reset operations with safety confirmations.
 * 
 * Usage:
 * ```tsx
 * const { 
 *   isPending, progress, 
 *   performReset, isChannelRequired 
 * } = useReset();
 * 
 * // Perform a reset
 * const result = await performReset(ResetOpcode.RESET_CHANNEL_CONFIG, 0);
 * if (result.success) {
 *   console.log('Reset completed!');
 * }
 * ```
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
    ResetService, 
    getResetService,
    ResetProgress,
    ResetResult,
    RESET_NAMES,
    RESET_DESCRIPTIONS,
    resetRequiresChannel
} from '../services/ResetService';
import { useAppStore } from '../store/useAppStore';
import { ResetOpcode, ResetStatus } from '../types/firmware_structs';

export interface UseResetReturn {
    // State
    isPending: boolean;
    isExecuting: boolean;
    progress: ResetProgress | null;
    confirmationCode: number | null;
    
    // Actions
    performReset: (type: ResetOpcode, channelId?: number) => Promise<ResetResult>;
    requestCode: (type: ResetOpcode, channelId?: number) => Promise<number | null>;
    executeWithCode: (type: ResetOpcode, channelId: number, code: number) => Promise<ResetResult>;
    
    // Helpers
    isChannelRequired: (type: ResetOpcode) => boolean;
    getResetName: (type: ResetOpcode) => string;
    getResetDescription: (type: ResetOpcode) => string;
}

export function useReset(): UseResetReturn {
    const resetState = useAppStore(state => state.resetState);
    
    const [progress, setProgress] = useState<ResetProgress | null>(null);
    const [isExecuting, setIsExecuting] = useState(false);
    
    const serviceRef = useRef<ResetService | null>(null);

    // Get service instance
    useEffect(() => {
        serviceRef.current = getResetService();
    }, []);

    const handleProgress = useCallback((p: ResetProgress) => {
        setProgress(p);
    }, []);

    const performReset = useCallback(async (
        type: ResetOpcode, 
        channelId: number = 0xFF
    ): Promise<ResetResult> => {
        if (!serviceRef.current) {
            return { success: false, error: 'Service not initialized' };
        }
        
        setIsExecuting(true);
        try {
            return await serviceRef.current.performReset(type, channelId, handleProgress);
        } finally {
            setIsExecuting(false);
            setProgress(null);
        }
    }, [handleProgress]);

    const requestCode = useCallback(async (
        type: ResetOpcode, 
        channelId: number = 0xFF
    ): Promise<number | null> => {
        if (!serviceRef.current) return null;
        return serviceRef.current.requestConfirmationCode(type, channelId);
    }, []);

    const executeWithCode = useCallback(async (
        type: ResetOpcode, 
        channelId: number, 
        code: number
    ): Promise<ResetResult> => {
        if (!serviceRef.current) {
            return { success: false, error: 'Service not initialized' };
        }
        
        setIsExecuting(true);
        try {
            return await serviceRef.current.executeWithCode(type, channelId, code);
        } finally {
            setIsExecuting(false);
        }
    }, []);

    const isChannelRequired = useCallback((type: ResetOpcode): boolean => {
        return resetRequiresChannel(type);
    }, []);

    const getResetName = useCallback((type: ResetOpcode): string => {
        return RESET_NAMES[type] || `Reset 0x${type.toString(16)}`;
    }, []);

    const getResetDescription = useCallback((type: ResetOpcode): string => {
        return RESET_DESCRIPTIONS[type] || '';
    }, []);

    const isPending = resetState?.status === ResetStatus.PENDING;
    const confirmationCode = resetState?.confirmation_code || null;

    return {
        isPending,
        isExecuting,
        progress,
        confirmationCode,
        performReset,
        requestCode,
        executeWithCode,
        isChannelRequired,
        getResetName,
        getResetDescription
    };
}

/**
 * Available reset operations for UI
 */
export const RESET_OPTIONS = [
    { 
        type: ResetOpcode.RESET_CHANNEL_CONFIG, 
        name: RESET_NAMES[ResetOpcode.RESET_CHANNEL_CONFIG],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_CHANNEL_CONFIG],
        requiresChannel: true,
        dangerous: false
    },
    { 
        type: ResetOpcode.RESET_CHANNEL_SCHEDULES, 
        name: RESET_NAMES[ResetOpcode.RESET_CHANNEL_SCHEDULES],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_CHANNEL_SCHEDULES],
        requiresChannel: true,
        dangerous: false
    },
    { 
        type: ResetOpcode.RESET_ALL_CHANNEL_CONFIGS, 
        name: RESET_NAMES[ResetOpcode.RESET_ALL_CHANNEL_CONFIGS],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_ALL_CHANNEL_CONFIGS],
        requiresChannel: false,
        dangerous: true
    },
    { 
        type: ResetOpcode.RESET_ALL_SCHEDULES, 
        name: RESET_NAMES[ResetOpcode.RESET_ALL_SCHEDULES],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_ALL_SCHEDULES],
        requiresChannel: false,
        dangerous: true
    },
    { 
        type: ResetOpcode.RESET_SYSTEM_CONFIG, 
        name: RESET_NAMES[ResetOpcode.RESET_SYSTEM_CONFIG],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_SYSTEM_CONFIG],
        requiresChannel: false,
        dangerous: false
    },
    { 
        type: ResetOpcode.RESET_HISTORY, 
        name: RESET_NAMES[ResetOpcode.RESET_HISTORY],
        description: RESET_DESCRIPTIONS[ResetOpcode.RESET_HISTORY],
        requiresChannel: false,
        dangerous: false
    },
    { 
        type: ResetOpcode.FACTORY_RESET, 
        name: RESET_NAMES[ResetOpcode.FACTORY_RESET],
        description: RESET_DESCRIPTIONS[ResetOpcode.FACTORY_RESET],
        requiresChannel: false,
        dangerous: true
    }
] as const;
