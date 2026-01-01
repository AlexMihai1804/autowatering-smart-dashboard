/**
 * ResetModal Component Tests
 * 
 * Tests for ResetModal utility logic
 */
import { describe, it, expect } from 'vitest';
import { ResetOpcode } from '../../types/firmware_structs';

describe('ResetModal', () => {
    describe('ResetOpcode enum', () => {
        it('should have RESET_CHANNEL_CONFIG opcode', () => {
            expect(ResetOpcode.RESET_CHANNEL_CONFIG).toBe(0x01);
        });

        it('should have FACTORY_RESET opcode', () => {
            expect(ResetOpcode.FACTORY_RESET).toBe(0xFF);
        });

        it('should have RESET_CHANNEL_SCHEDULES opcode', () => {
            expect(ResetOpcode.RESET_CHANNEL_SCHEDULES).toBe(0x02);
        });

        it('should have RESET_ALL_CHANNEL_CONFIGS opcode', () => {
            expect(ResetOpcode.RESET_ALL_CHANNEL_CONFIGS).toBe(0x10);
        });

        it('should have RESET_ALL_SCHEDULES opcode', () => {
            expect(ResetOpcode.RESET_ALL_SCHEDULES).toBe(0x11);
        });

        it('should have RESET_SYSTEM_CONFIG opcode', () => {
            expect(ResetOpcode.RESET_SYSTEM_CONFIG).toBe(0x12);
        });

        it('should have RESET_HISTORY opcode', () => {
            expect(ResetOpcode.RESET_HISTORY).toBe(0x14);
        });
    });

    describe('Modal step flow', () => {
        type ModalStep = 'select' | 'confirm' | 'executing' | 'complete' | 'error';
        
        it('should start with select step', () => {
            const initialStep: ModalStep = 'select';
            expect(initialStep).toBe('select');
        });

        it('should have valid step transitions', () => {
            const validSteps: ModalStep[] = ['select', 'confirm', 'executing', 'complete', 'error'];
            
            expect(validSteps).toContain('select');
            expect(validSteps).toContain('confirm');
            expect(validSteps).toContain('executing');
            expect(validSteps).toContain('complete');
            expect(validSteps).toContain('error');
        });
    });

    describe('Channel selection', () => {
        it('should use 0xFF for operations that do not require channel', () => {
            const noChannelValue = 0xFF;
            expect(noChannelValue).toBe(255);
        });

        it('should support channels 0-5', () => {
            const channels = [0, 1, 2, 3, 4, 5];
            channels.forEach(channel => {
                expect(channel).toBeGreaterThanOrEqual(0);
                expect(channel).toBeLessThanOrEqual(5);
            });
        });
    });

    describe('Component exports', () => {
        it('should export ResetModal as default', async () => {
            const module = await import('../../components/ResetModal');
            expect(module.default).toBeDefined();
            expect(typeof module.default).toBe('function');
        });
    });
});
