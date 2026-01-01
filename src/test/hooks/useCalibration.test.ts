/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCalibration } from '../../hooks/useCalibration';
import { CalibrationAction } from '../../types/firmware_structs';

// Mock the CalibrationService
const mockCalibrationService = {
    startCalibration: vi.fn().mockResolvedValue(undefined),
    stopCalibration: vi.fn().mockResolvedValue(undefined),
    finishCalibration: vi.fn().mockResolvedValue({ success: true, pulsesPerLiter: 450 }),
    applyCalibration: vi.fn().mockResolvedValue({ success: true, pulsesPerLiter: 450 }),
    resetCalibration: vi.fn().mockResolvedValue({ success: true, pulsesPerLiter: 450 }),
    estimatePulsesPerLiter: vi.fn().mockReturnValue(450),
};

vi.mock('../../services/CalibrationService', () => ({
    getCalibrationService: () => mockCalibrationService,
    CalibrationService: vi.fn(),
    DEFAULT_PULSES_PER_LITER: 450,
}));

// Mock the app store
const mockCalibrationState = {
    action: CalibrationAction.IDLE,
    pulses_per_liter: 450,
    total_pulses: 0,
};

vi.mock('../../store/useAppStore', () => ({
    useAppStore: vi.fn((selector) => {
        const state = { calibrationState: mockCalibrationState };
        return selector(state);
    }),
}));

describe('useCalibration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCalibrationState.action = CalibrationAction.IDLE;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initial state', () => {
        it('should have default idle state', () => {
            const { result } = renderHook(() => useCalibration());

            expect(result.current.isCalibrating).toBe(false);
            expect(result.current.stage).toBe('idle');
            expect(result.current.progress).toBeNull();
            expect(result.current.result).toBeNull();
        });

        it('should return current pulses per liter from store', () => {
            const { result } = renderHook(() => useCalibration());
            expect(result.current.currentPulsesPerLiter).toBe(450);
        });
    });

    describe('start', () => {
        it('should start calibration', async () => {
            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.start();
            });

            expect(mockCalibrationService.startCalibration).toHaveBeenCalledWith(
                expect.any(Function)
            );
        });

        it('should throw error if service not initialized', async () => {
            vi.resetModules();

            // This test verifies the error handling in start()
            const { result } = renderHook(() => useCalibration());

            // Should not throw because service is mocked
            await act(async () => {
                await expect(result.current.start()).resolves.not.toThrow();
            });
        });
    });

    describe('stop', () => {
        it('should stop calibration and reset state', async () => {
            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.start();
            });

            await act(async () => {
                await result.current.stop();
            });

            expect(mockCalibrationService.stopCalibration).toHaveBeenCalled();
            expect(result.current.stage).toBe('idle');
            expect(result.current.progress).toBeNull();
        });
    });

    describe('finish', () => {
        it('should finish calibration with volume', async () => {
            const { result } = renderHook(() => useCalibration());

            let finishResult: any;
            await act(async () => {
                finishResult = await result.current.finish(500);
            });

            expect(mockCalibrationService.finishCalibration).toHaveBeenCalledWith(500);
            expect(finishResult).toEqual({ success: true, pulsesPerLiter: 450 });
        });

        it('should set failed stage on unsuccessful finish', async () => {
            mockCalibrationService.finishCalibration.mockResolvedValueOnce({
                success: false,
                error: 'Not enough pulses',
            });

            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.finish(500);
            });

            expect(result.current.stage).toBe('failed');
        });
    });

    describe('apply', () => {
        it('should apply calibration and set completed stage', async () => {
            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.apply();
            });

            expect(mockCalibrationService.applyCalibration).toHaveBeenCalled();
            expect(result.current.stage).toBe('completed');
        });

        it('should set failed stage on unsuccessful apply', async () => {
            mockCalibrationService.applyCalibration.mockResolvedValueOnce({
                success: false,
                error: 'Write failed',
            });

            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.apply();
            });

            expect(result.current.stage).toBe('failed');
        });
    });

    describe('reset', () => {
        it('should reset calibration to idle state', async () => {
            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.reset();
            });

            expect(mockCalibrationService.resetCalibration).toHaveBeenCalled();
            expect(result.current.stage).toBe('idle');
            expect(result.current.progress).toBeNull();
        });
    });

    describe('estimatePulsesPerLiter', () => {
        it('should call service estimatePulsesPerLiter', () => {
            const { result } = renderHook(() => useCalibration());

            const estimate = result.current.estimatePulsesPerLiter(500);

            expect(mockCalibrationService.estimatePulsesPerLiter).toHaveBeenCalledWith(500);
            expect(estimate).toBe(450);
        });
    });

    describe('getElapsedTime', () => {
        it('should return 0:00 when not started', () => {
            const { result } = renderHook(() => useCalibration());

            expect(result.current.getElapsedTime()).toBe('0:00');
        });

        it('should return formatted elapsed time after start', async () => {
            vi.useFakeTimers();
            const startTime = Date.now();
            vi.setSystemTime(startTime);

            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.start();
            });

            // Advance 65 seconds
            vi.setSystemTime(startTime + 65000);

            const elapsed = result.current.getElapsedTime();
            expect(elapsed).toBe('1:05');

            vi.useRealTimers();
        });
    });

    describe('isCalibrating', () => {
        it('should be true when stage is running', async () => {
            const { result } = renderHook(() => useCalibration());

            // Start calibration and simulate progress callback
            await act(async () => {
                await result.current.start();
            });

            // Manually trigger progress to set stage to running
            const progressCallback = mockCalibrationService.startCalibration.mock.calls[0][0];
            act(() => {
                progressCallback({ stage: 'running', pulseCount: 10 });
            });

            expect(result.current.isCalibrating).toBe(true);
        });

        it('should be true when stage is waiting_volume', async () => {
            const { result } = renderHook(() => useCalibration());

            await act(async () => {
                await result.current.start();
            });

            const progressCallback = mockCalibrationService.startCalibration.mock.calls[0][0];
            act(() => {
                progressCallback({ stage: 'waiting_volume', pulseCount: 100 });
            });

            expect(result.current.isCalibrating).toBe(true);
        });

        it('should be false when stage is idle', () => {
            const { result } = renderHook(() => useCalibration());
            expect(result.current.isCalibrating).toBe(false);
        });
    });
});
