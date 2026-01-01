/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useReset, RESET_OPTIONS } from '../../hooks/useReset';
import { ResetService, getResetService, ResetResult, ResetProgress } from '../../services/ResetService';
import { useAppStore } from '../../store/useAppStore';
import { ResetOpcode, ResetStatus } from '../../types/firmware_structs';

// Mock dependencies
vi.mock('../../services/ResetService', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../services/ResetService')>();
    return {
        ...actual,
        ResetService: vi.fn(),
        getResetService: vi.fn(),
        resetRequiresChannel: vi.fn((type: number) => {
            // 0x01 = RESET_CHANNEL_CONFIG, 0x02 = RESET_CHANNEL_SCHEDULES
            return type === 0x01 || type === 0x02;
        }),
    };
});
vi.mock('../../store/useAppStore');

describe('useReset Hook', () => {
    let mockResetService: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Setup mock service
        mockResetService = {
            performReset: vi.fn(),
            requestConfirmationCode: vi.fn(),
            executeWithCode: vi.fn(),
        };
        (getResetService as any).mockReturnValue(mockResetService);

        // Setup mock store
        (useAppStore as any).mockReturnValue({
            resetState: {
                status: ResetStatus.IDLE,
                reset_type: 0,
                channel_id: 0,
                confirmation_code: 0
            }
        });
        // Mock the selector behavior
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector({
                resetState: {
                    status: ResetStatus.IDLE,
                    confirmation_code: 0
                }
            });
        });
    });

    it('should initialize with default states', () => {
        const { result } = renderHook(() => useReset());

        expect(result.current.isPending).toBe(false);
        expect(result.current.isExecuting).toBe(false);
        expect(result.current.progress).toBeNull();
        expect(result.current.confirmationCode).toBeNull();
    });

    it('should perform reset successfully', async () => {
        const { result } = renderHook(() => useReset());

        mockResetService.performReset.mockResolvedValue({ success: true });

        await act(async () => {
            const res = await result.current.performReset(ResetOpcode.RESET_HISTORY);
            expect(res.success).toBe(true);
        });

        expect(mockResetService.performReset).toHaveBeenCalledWith(
            ResetOpcode.RESET_HISTORY,
            0xFF,
            expect.any(Function)
        );
    });

    it('should update executing state during reset', async () => {
        const { result } = renderHook(() => useReset());

        let resolveReset: (value: ResetResult) => void;
        const resetPromise = new Promise<ResetResult>(resolve => {
            resolveReset = resolve;
        });

        mockResetService.performReset.mockReturnValue(resetPromise);

        let performResult: Promise<ResetResult>;

        // Start the reset operation
        await act(async () => {
            performResult = result.current.performReset(ResetOpcode.RESET_HISTORY);
        });

        // The hook sets executing to true synchronously before awaiting
        // However, in the test, we need to wait for the state update to be reflected
        expect(result.current.isExecuting).toBe(true);

        await act(async () => {
            resolveReset!({ success: true });
            await performResult;
        });

        expect(result.current.isExecuting).toBe(false);
    });

    it('should handle reset failure', async () => {
        const { result } = renderHook(() => useReset());

        mockResetService.performReset.mockResolvedValue({
            success: false,
            error: 'Failed'
        });

        await act(async () => {
            const res = await result.current.performReset(ResetOpcode.RESET_HISTORY);
            expect(res.success).toBe(false);
            expect(res.error).toBe('Failed');
        });
    });

    it('should handle service not initialized', async () => {
        (getResetService as any).mockReturnValue(null);
        const { result } = renderHook(() => useReset());

        await act(async () => {
            const res = await result.current.performReset(ResetOpcode.RESET_HISTORY);
            expect(res.success).toBe(false);
            expect(res.error).toContain('Service not initialized');
        });
    });

    it('should request confirmation code', async () => {
        const { result } = renderHook(() => useReset());
        mockResetService.requestConfirmationCode.mockResolvedValue(12345);

        await act(async () => {
            const code = await result.current.requestCode(ResetOpcode.FACTORY_RESET);
            expect(code).toBe(12345);
        });

        expect(mockResetService.requestConfirmationCode).toHaveBeenCalledWith(
            ResetOpcode.FACTORY_RESET,
            0xFF
        );
    });

    it('should execute with code', async () => {
        const { result } = renderHook(() => useReset());
        mockResetService.executeWithCode.mockResolvedValue({ success: true });

        await act(async () => {
            const res = await result.current.executeWithCode(
                ResetOpcode.FACTORY_RESET,
                0xFF,
                12345
            );
            expect(res.success).toBe(true);
        });

        expect(mockResetService.executeWithCode).toHaveBeenCalledWith(
            ResetOpcode.FACTORY_RESET,
            0xFF,
            12345
        );
    });

    it('should check if channel is required', () => {
        const { result } = renderHook(() => useReset());

        expect(result.current.isChannelRequired(ResetOpcode.RESET_CHANNEL_CONFIG)).toBe(true);
        expect(result.current.isChannelRequired(ResetOpcode.RESET_SYSTEM_CONFIG)).toBe(false);
    });

    it('should get reset name', () => {
        const { result } = renderHook(() => useReset());
        expect(result.current.getResetName(ResetOpcode.RESET_HISTORY)).toBeDefined();
    });

    it('should get reset description', () => {
        const { result } = renderHook(() => useReset());
        expect(result.current.getResetDescription(ResetOpcode.RESET_HISTORY)).toBeDefined();
    });

    it('should reflect pending state from store', () => {
        // Mock the selector to return pending state
        (useAppStore as any).mockImplementation((selector: any) => {
            return selector({
                resetState: {
                    status: ResetStatus.PENDING,
                    confirmation_code: 123
                }
            });
        });

        const { result } = renderHook(() => useReset());

        expect(result.current.isPending).toBe(true);
        expect(result.current.confirmationCode).toBe(123);
    });
});
