import { describe, it, expect } from 'vitest';
import {
    zoneNameRules,
    coverageRules,
    getErrorDetails,
} from '../../../components/onboarding/WizardEnhancements';

describe('WizardEnhancements', () => {
    describe('zoneNameRules validation', () => {
        it('should fail for empty name', () => {
            const emptyRule = zoneNameRules[0];
            expect(emptyRule.validate('')).toBe(false);
            expect(emptyRule.validate('  ')).toBe(false);
            expect(emptyRule.type).toBe('error');
        });

        it('should pass for non-empty name', () => {
            const emptyRule = zoneNameRules[0];
            expect(emptyRule.validate('Front Lawn')).toBe(true);
        });

        it('should fail for names shorter than 2 characters', () => {
            const minLengthRule = zoneNameRules[1];
            expect(minLengthRule.validate('A')).toBe(false);
            expect(minLengthRule.type).toBe('error');
        });

        it('should pass for names with 2+ characters', () => {
            const minLengthRule = zoneNameRules[1];
            expect(minLengthRule.validate('AB')).toBe(true);
            expect(minLengthRule.validate('Garden')).toBe(true);
        });

        it('should warn for very long names (over 30 chars)', () => {
            const maxLengthRule = zoneNameRules[2];
            expect(maxLengthRule.validate('A'.repeat(31))).toBe(false);
            expect(maxLengthRule.type).toBe('warning');
        });

        it('should pass for names under 30 characters', () => {
            const maxLengthRule = zoneNameRules[2];
            expect(maxLengthRule.validate('Front Garden')).toBe(true);
            expect(maxLengthRule.validate('A'.repeat(30))).toBe(true);
        });
    });

    describe('coverageRules validation', () => {
        it('should fail for undefined/null coverage', () => {
            const requiredRule = coverageRules[0];
            expect(requiredRule.validate(undefined)).toBe(false);
            expect(requiredRule.validate(null)).toBe(false);
            expect(requiredRule.type).toBe('error');
        });

        it('should pass for any defined number', () => {
            const requiredRule = coverageRules[0];
            expect(requiredRule.validate(0)).toBe(true);
            expect(requiredRule.validate(100)).toBe(true);
        });

        it('should pass for zero (treated as "no value")', () => {
            // The rule is `!v || v > 0` - if v is falsy (including 0), it passes
            const positiveRule = coverageRules[1];
            expect(positiveRule.validate(0)).toBe(true);
        });

        it('should fail for negative coverage', () => {
            const positiveRule = coverageRules[1];
            expect(positiveRule.validate(-5)).toBe(false);
            expect(positiveRule.type).toBe('error');
        });

        it('should pass for positive coverage', () => {
            const positiveRule = coverageRules[1];
            expect(positiveRule.validate(1)).toBe(true);
            expect(positiveRule.validate(100)).toBe(true);
        });

        it('should warn for very high coverage (over 10000)', () => {
            const maxRule = coverageRules[2];
            expect(maxRule.validate(10001)).toBe(false);
            expect(maxRule.type).toBe('warning');
        });

        it('should pass for coverage under 10000', () => {
            const maxRule = coverageRules[2];
            expect(maxRule.validate(100)).toBe(true);
            expect(maxRule.validate(10000)).toBe(true);
        });
    });

    describe('getErrorDetails', () => {
        it('should return GPS denied error details', () => {
            const details = getErrorDetails('GPS_DENIED');
            expect(details.message).toBe('GPS permission denied');
            expect(details.suggestion).toContain('location permissions');
        });

        it('should return GPS timeout error details', () => {
            const details = getErrorDetails('GPS_TIMEOUT');
            expect(details.message).toBe('GPS request timed out');
            expect(details.suggestion).toContain('GPS signal');
        });

        it('should return GPS not available error details', () => {
            const details = getErrorDetails('GPS_NOT_AVAILABLE');
            expect(details.message).toBe('GPS is not available');
            expect(details.suggestion).toContain('GPS capability');
        });

        it('should return BLE disconnected error details', () => {
            const details = getErrorDetails('BLE_DISCONNECTED');
            expect(details.message).toBe('Device disconnected');
            expect(details.suggestion).toContain('powered on');
        });

        it('should return save failed error details', () => {
            const details = getErrorDetails('SAVE_FAILED');
            expect(details.message).toBe('Failed to save configuration');
            expect(details.suggestion).toContain('connection');
        });

        it('should return soil detection failed error details', () => {
            const details = getErrorDetails('SOIL_DETECTION_FAILED');
            expect(details.message).toBe('Could not detect soil type');
            expect(details.suggestion).toContain('Select a soil type manually');
        });

        it('should return default error details for unknown codes', () => {
            const details = getErrorDetails('UNKNOWN_ERROR');
            expect(details.message).toBe('UNKNOWN_ERROR');
            expect(details.suggestion).toContain('try again');
            expect(details.suggestion).toContain('contact support');
        });

        it('should return default error details for empty code', () => {
            const details = getErrorDetails('');
            expect(details.message).toBe('');
            expect(details.suggestion).toContain('Please try again');
        });
    });

    describe('Validation integration', () => {
        // Test the validation flow that useValidation hook would use
        const runValidation = (rules: { validate: (v: any) => boolean; message: string; type: 'error' | 'warning' }[], value: any) => {
            const errors: string[] = [];
            const warnings: string[] = [];
            
            rules.forEach(rule => {
                if (!rule.validate(value)) {
                    if (rule.type === 'error') {
                        errors.push(rule.message);
                    } else {
                        warnings.push(rule.message);
                    }
                }
            });
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
            };
        };

        it('should return valid for good zone name', () => {
            const result = runValidation(zoneNameRules, 'Front Lawn');
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
            expect(result.warnings).toHaveLength(0);
        });

        it('should return errors for empty zone name', () => {
            const result = runValidation(zoneNameRules, '');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Zone name is required');
        });

        it('should return errors for short zone name', () => {
            const result = runValidation(zoneNameRules, 'A');
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Zone name should be at least 2 characters');
        });

        it('should return warning for long zone name', () => {
            const result = runValidation(zoneNameRules, 'A'.repeat(35));
            expect(result.isValid).toBe(true); // Warnings don't affect isValid
            expect(result.warnings).toContain('Zone name is quite long');
        });

        it('should return valid for good coverage', () => {
            const result = runValidation(coverageRules, 100);
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should return valid for zero coverage (treated as no value)', () => {
            // The rule is `!v || v > 0` - if v is falsy (including 0), it passes
            const result = runValidation(coverageRules, 0);
            expect(result.isValid).toBe(true);
        });

        it('should return error for negative coverage', () => {
            const result = runValidation(coverageRules, -5);
            expect(result.isValid).toBe(false);
            expect(result.errors).toContain('Coverage must be greater than 0');
        });

        it('should return warning for very high coverage', () => {
            const result = runValidation(coverageRules, 50000);
            expect(result.isValid).toBe(true);
            expect(result.warnings).toContain('Coverage value seems very high');
        });
    });
});
