/**
 * ResetService Unit Tests
 * 
 * Tests for exported helper functions and constants that don't require BLE hardware.
 */
import { describe, it, expect } from 'vitest';
import {
    RESET_NAMES,
    RESET_DESCRIPTIONS,
    resetRequiresChannel
} from '../services/ResetService';
import { ResetOpcode } from '../types/firmware_structs';

describe('ResetService', () => {
    describe('RESET_NAMES', () => {
        it('should have name for RESET_CHANNEL_CONFIG', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_CHANNEL_CONFIG]).toBe('Resetare configurație canal');
        });

        it('should have name for RESET_CHANNEL_SCHEDULES', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_CHANNEL_SCHEDULES]).toBe('Resetare programări canal');
        });

        it('should have name for RESET_ALL_CHANNEL_CONFIGS', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_ALL_CHANNEL_CONFIGS]).toBe('Resetare toate configurațiile');
        });

        it('should have name for RESET_ALL_SCHEDULES', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_ALL_SCHEDULES]).toBe('Resetare toate programările');
        });

        it('should have name for RESET_SYSTEM_CONFIG', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_SYSTEM_CONFIG]).toBe('Resetare configurație sistem');
        });

        it('should have name for RESET_HISTORY', () => {
            expect(RESET_NAMES[ResetOpcode.RESET_HISTORY]).toBe('Ștergere istoric');
        });

        it('should have name for FACTORY_RESET', () => {
            expect(RESET_NAMES[ResetOpcode.FACTORY_RESET]).toBe('Resetare la setări din fabrică');
        });

        it('should have entries for all ResetOpcode values', () => {
            const allOpcodes = [
                ResetOpcode.RESET_CHANNEL_CONFIG,
                ResetOpcode.RESET_CHANNEL_SCHEDULES,
                ResetOpcode.RESET_ALL_CHANNEL_CONFIGS,
                ResetOpcode.RESET_ALL_SCHEDULES,
                ResetOpcode.RESET_SYSTEM_CONFIG,
                ResetOpcode.RESET_HISTORY,
                ResetOpcode.FACTORY_RESET
            ];
            allOpcodes.forEach(opcode => {
                expect(RESET_NAMES[opcode]).toBeDefined();
                expect(typeof RESET_NAMES[opcode]).toBe('string');
                expect(RESET_NAMES[opcode].length).toBeGreaterThan(0);
            });
        });
    });

    describe('RESET_DESCRIPTIONS', () => {
        it('should have description for RESET_CHANNEL_CONFIG', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_CHANNEL_CONFIG]).toContain('configurația canalului');
        });

        it('should have description for RESET_CHANNEL_SCHEDULES', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_CHANNEL_SCHEDULES]).toContain('programările');
        });

        it('should have description for RESET_ALL_CHANNEL_CONFIGS', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_ALL_CHANNEL_CONFIGS]).toContain('toate configurațiile');
        });

        it('should have description for RESET_ALL_SCHEDULES', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_ALL_SCHEDULES]).toContain('toate programările');
        });

        it('should have description for RESET_SYSTEM_CONFIG', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_SYSTEM_CONFIG]).toContain('sistem');
        });

        it('should have description for RESET_HISTORY', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.RESET_HISTORY]).toContain('istoric');
        });

        it('should have warning for FACTORY_RESET', () => {
            expect(RESET_DESCRIPTIONS[ResetOpcode.FACTORY_RESET]).toContain('PERICULOS');
            expect(RESET_DESCRIPTIONS[ResetOpcode.FACTORY_RESET]).toContain('fabrică');
        });

        it('should have entries for all ResetOpcode values', () => {
            const allOpcodes = [
                ResetOpcode.RESET_CHANNEL_CONFIG,
                ResetOpcode.RESET_CHANNEL_SCHEDULES,
                ResetOpcode.RESET_ALL_CHANNEL_CONFIGS,
                ResetOpcode.RESET_ALL_SCHEDULES,
                ResetOpcode.RESET_SYSTEM_CONFIG,
                ResetOpcode.RESET_HISTORY,
                ResetOpcode.FACTORY_RESET
            ];
            allOpcodes.forEach(opcode => {
                expect(RESET_DESCRIPTIONS[opcode]).toBeDefined();
                expect(typeof RESET_DESCRIPTIONS[opcode]).toBe('string');
                expect(RESET_DESCRIPTIONS[opcode].length).toBeGreaterThan(0);
            });
        });
    });

    describe('resetRequiresChannel', () => {
        describe('returns true for channel-specific resets', () => {
            it('should return true for RESET_CHANNEL_CONFIG', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_CHANNEL_CONFIG)).toBe(true);
            });

            it('should return true for RESET_CHANNEL_SCHEDULES', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_CHANNEL_SCHEDULES)).toBe(true);
            });
        });

        describe('returns false for global resets', () => {
            it('should return false for RESET_ALL_CHANNEL_CONFIGS', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_ALL_CHANNEL_CONFIGS)).toBe(false);
            });

            it('should return false for RESET_ALL_SCHEDULES', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_ALL_SCHEDULES)).toBe(false);
            });

            it('should return false for RESET_SYSTEM_CONFIG', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_SYSTEM_CONFIG)).toBe(false);
            });

            it('should return false for RESET_HISTORY', () => {
                expect(resetRequiresChannel(ResetOpcode.RESET_HISTORY)).toBe(false);
            });

            it('should return false for FACTORY_RESET', () => {
                expect(resetRequiresChannel(ResetOpcode.FACTORY_RESET)).toBe(false);
            });
        });

        describe('validates all opcodes', () => {
            it('should handle all defined reset opcodes', () => {
                // Channel-specific should require channel
                expect(resetRequiresChannel(0x01)).toBe(true); // RESET_CHANNEL_CONFIG
                expect(resetRequiresChannel(0x02)).toBe(true); // RESET_CHANNEL_SCHEDULES
                
                // Global resets should not require channel
                expect(resetRequiresChannel(0x10)).toBe(false); // RESET_ALL_CHANNEL_CONFIGS
                expect(resetRequiresChannel(0x11)).toBe(false); // RESET_ALL_SCHEDULES
                expect(resetRequiresChannel(0x12)).toBe(false); // RESET_SYSTEM_CONFIG
                expect(resetRequiresChannel(0x14)).toBe(false); // RESET_HISTORY
                expect(resetRequiresChannel(0xFF)).toBe(false); // FACTORY_RESET
            });
        });
    });
});
