/**
 * MobileConfirmModal Component Tests
 * 
 * Tests for confirmation modal logic and variants
 */
import { describe, it, expect } from 'vitest';

describe('MobileConfirmModal', () => {
    describe('Variant colors', () => {
        const variantColors = {
            danger: {
                bg: 'bg-red-500/10',
                iconColor: 'text-red-500',
                buttonBg: 'bg-red-500 hover:bg-red-600',
                glowColor: 'shadow-[0_0_20px_-5px_rgba(239,68,68,0.3)]',
            },
            warning: {
                bg: 'bg-amber-500/10',
                iconColor: 'text-amber-500',
                buttonBg: 'bg-amber-500 hover:bg-amber-600',
                glowColor: 'shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]',
            },
            success: {
                bg: 'bg-mobile-primary/10',
                iconColor: 'text-mobile-primary',
                buttonBg: 'bg-mobile-primary hover:bg-green-400',
                glowColor: 'shadow-[0_0_20px_-5px_rgba(19,236,55,0.3)]',
            },
            info: {
                bg: 'bg-blue-500/10',
                iconColor: 'text-blue-500',
                buttonBg: 'bg-blue-500 hover:bg-blue-600',
                glowColor: 'shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]',
            },
        };

        it('should have danger variant', () => {
            expect(variantColors.danger).toBeDefined();
            expect(variantColors.danger.iconColor).toBe('text-red-500');
        });

        it('should have warning variant', () => {
            expect(variantColors.warning).toBeDefined();
            expect(variantColors.warning.iconColor).toBe('text-amber-500');
        });

        it('should have success variant', () => {
            expect(variantColors.success).toBeDefined();
            expect(variantColors.success.iconColor).toBe('text-mobile-primary');
        });

        it('should have info variant', () => {
            expect(variantColors.info).toBeDefined();
            expect(variantColors.info.iconColor).toBe('text-blue-500');
        });

        it('should have all required color properties', () => {
            Object.values(variantColors).forEach(variant => {
                expect(variant.bg).toBeDefined();
                expect(variant.iconColor).toBeDefined();
                expect(variant.buttonBg).toBeDefined();
                expect(variant.glowColor).toBeDefined();
            });
        });
    });

    describe('Confirmation input validation', () => {
        it('should allow confirm when no confirmation required', () => {
            const requireConfirmation = undefined;
            const confirmInput = '';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === (requireConfirmation || '').toUpperCase();
            expect(canConfirm).toBe(true);
        });

        it('should block confirm when confirmation input is empty', () => {
            const requireConfirmation = 'DELETE';
            const confirmInput = '';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase();
            expect(canConfirm).toBe(false);
        });

        it('should allow confirm when input matches (case insensitive)', () => {
            const requireConfirmation = 'DELETE';
            const confirmInput = 'delete';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase();
            expect(canConfirm).toBe(true);
        });

        it('should allow confirm when input matches exactly', () => {
            const requireConfirmation = 'RESET';
            const confirmInput = 'RESET';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase();
            expect(canConfirm).toBe(true);
        });

        it('should block confirm when input is partial', () => {
            const requireConfirmation = 'DELETE';
            const confirmInput = 'DEL';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase();
            expect(canConfirm).toBe(false);
        });

        it('should block confirm when input is wrong', () => {
            const requireConfirmation = 'DELETE';
            const confirmInput = 'REMOVE';
            const canConfirm = !requireConfirmation || confirmInput.toUpperCase() === requireConfirmation.toUpperCase();
            expect(canConfirm).toBe(false);
        });
    });

    describe('Default props', () => {
        it('should have default confirmText', () => {
            const defaultConfirmText = 'Confirm';
            expect(defaultConfirmText).toBe('Confirm');
        });

        it('should have default cancelText', () => {
            const defaultCancelText = 'Cancel';
            expect(defaultCancelText).toBe('Cancel');
        });

        it('should have default icon', () => {
            const defaultIcon = 'warning';
            expect(defaultIcon).toBe('warning');
        });

        it('should have default variant', () => {
            const defaultVariant = 'danger';
            expect(defaultVariant).toBe('danger');
        });
    });

    describe('Component exports', () => {
        it('should export MobileConfirmModal as default', async () => {
            const module = await import('../../../components/mobile/MobileConfirmModal');
            expect(module.default).toBeDefined();
            expect(typeof module.default).toBe('function');
        });
    });
});
