/**
 * Services Index Unit Tests
 * 
 * Tests for the services index exports and initialization.
 */
import { describe, it, expect } from 'vitest';
import {
    RESET_NAMES,
    RESET_DESCRIPTIONS,
    resetRequiresChannel,
    DEFAULT_PULSES_PER_LITER,
    MIN_CALIBRATION_VOLUME_ML,
    RECOMMENDED_CALIBRATION_VOLUME_ML,
    getCalibrationAccuracy,
    formatCalibration,
    calculateFlowRate,
    BleFragmentationManager,
    DatabaseService,
    initializeServices
} from '../services';

describe('Services Index', () => {
    describe('Re-exports from ResetService', () => {
        it('should export RESET_NAMES', () => {
            expect(RESET_NAMES).toBeDefined();
            expect(typeof RESET_NAMES).toBe('object');
        });

        it('should export RESET_DESCRIPTIONS', () => {
            expect(RESET_DESCRIPTIONS).toBeDefined();
            expect(typeof RESET_DESCRIPTIONS).toBe('object');
        });

        it('should export resetRequiresChannel', () => {
            expect(resetRequiresChannel).toBeDefined();
            expect(typeof resetRequiresChannel).toBe('function');
        });
    });

    describe('Re-exports from CalibrationService', () => {
        it('should export DEFAULT_PULSES_PER_LITER', () => {
            expect(DEFAULT_PULSES_PER_LITER).toBe(750);
        });

        it('should export MIN_CALIBRATION_VOLUME_ML', () => {
            expect(MIN_CALIBRATION_VOLUME_ML).toBe(500);
        });

        it('should export RECOMMENDED_CALIBRATION_VOLUME_ML', () => {
            expect(RECOMMENDED_CALIBRATION_VOLUME_ML).toBe(2000);
        });

        it('should export getCalibrationAccuracy', () => {
            expect(getCalibrationAccuracy).toBeDefined();
            expect(typeof getCalibrationAccuracy).toBe('function');
        });

        it('should export formatCalibration', () => {
            expect(formatCalibration).toBeDefined();
            expect(typeof formatCalibration).toBe('function');
        });

        it('should export calculateFlowRate', () => {
            expect(calculateFlowRate).toBeDefined();
            expect(typeof calculateFlowRate).toBe('function');
        });
    });

    describe('Re-exports from BleFragmentationManager', () => {
        it('should export BleFragmentationManager class', () => {
            expect(BleFragmentationManager).toBeDefined();
            expect(typeof BleFragmentationManager).toBe('function');
        });
    });

    describe('Re-exports from DatabaseService', () => {
        it('should export DatabaseService class', () => {
            expect(DatabaseService).toBeDefined();
            expect(typeof DatabaseService).toBe('function');
        });

        it('should be a singleton', () => {
            const instance1 = DatabaseService.getInstance();
            const instance2 = DatabaseService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('initializeServices', () => {
        it('should be a function', () => {
            expect(initializeServices).toBeDefined();
            expect(typeof initializeServices).toBe('function');
        });
    });
});
