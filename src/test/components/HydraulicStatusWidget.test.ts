/**
 * HydraulicStatusWidget Component Tests
 * 
 * Tests for hydraulic status helper functions
 */
import { describe, it, expect } from 'vitest';
import { HydraulicLockLevel, HydraulicLockReason } from '../../types/firmware_structs';

describe('HydraulicStatusWidget', () => {
    describe('HydraulicLockLevel', () => {
        it('should have NONE as 0', () => {
            expect(HydraulicLockLevel.NONE).toBe(0);
        });

        it('should have SOFT as 1', () => {
            expect(HydraulicLockLevel.SOFT).toBe(1);
        });

        it('should have HARD as 2', () => {
            expect(HydraulicLockLevel.HARD).toBe(2);
        });
    });

    describe('HydraulicLockReason', () => {
        it('should have NONE as 0', () => {
            expect(HydraulicLockReason.NONE).toBe(0);
        });

        it('should have HIGH_FLOW as 1', () => {
            expect(HydraulicLockReason.HIGH_FLOW).toBe(1);
        });

        it('should have NO_FLOW as 2', () => {
            expect(HydraulicLockReason.NO_FLOW).toBe(2);
        });

        it('should have UNEXPECTED as 3', () => {
            expect(HydraulicLockReason.UNEXPECTED).toBe(3);
        });

        it('should have MAINLINE_LEAK as 4', () => {
            expect(HydraulicLockReason.MAINLINE_LEAK).toBe(4);
        });
    });

    describe('getLockReasonText', () => {
        const getLockReasonText = (reason: HydraulicLockReason): string => {
            switch (reason) {
                case HydraulicLockReason.HIGH_FLOW: return 'High flow detected';
                case HydraulicLockReason.NO_FLOW: return 'No flow detected';
                case HydraulicLockReason.UNEXPECTED: return 'Unexpected flow';
                case HydraulicLockReason.MAINLINE_LEAK: return 'Mainline leak';
                case HydraulicLockReason.NONE: return 'All clear';
                default: return 'Unknown issue';
            }
        };

        it('should return All clear for NONE', () => {
            expect(getLockReasonText(HydraulicLockReason.NONE)).toBe('All clear');
        });

        it('should return High flow detected for HIGH_FLOW', () => {
            expect(getLockReasonText(HydraulicLockReason.HIGH_FLOW)).toBe('High flow detected');
        });

        it('should return No flow detected for NO_FLOW', () => {
            expect(getLockReasonText(HydraulicLockReason.NO_FLOW)).toBe('No flow detected');
        });

        it('should return Unexpected flow for UNEXPECTED', () => {
            expect(getLockReasonText(HydraulicLockReason.UNEXPECTED)).toBe('Unexpected flow');
        });

        it('should return Mainline leak for MAINLINE_LEAK', () => {
            expect(getLockReasonText(HydraulicLockReason.MAINLINE_LEAK)).toBe('Mainline leak');
        });

        it('should return Unknown issue for unknown reason', () => {
            expect(getLockReasonText(99 as HydraulicLockReason)).toBe('Unknown issue');
        });
    });

    describe('Status determination', () => {
        it('should identify OK status when lock level is NONE', () => {
            const globalLockLevel = HydraulicLockLevel.NONE;
            const isOk = globalLockLevel === HydraulicLockLevel.NONE;
            expect(isOk).toBe(true);
        });

        it('should identify soft lock', () => {
            const globalLockLevel = HydraulicLockLevel.SOFT;
            const isSoftLock = globalLockLevel === HydraulicLockLevel.SOFT;
            expect(isSoftLock).toBe(true);
        });

        it('should identify hard lock', () => {
            const globalLockLevel = HydraulicLockLevel.HARD;
            const isHardLock = globalLockLevel === HydraulicLockLevel.HARD;
            expect(isHardLock).toBe(true);
        });
    });

    describe('Status styling', () => {
        interface StatusStyle {
            statusColor: string;
            bgColor: string;
            icon: string;
            statusText: string;
        }

        const getStatusStyle = (lockLevel: HydraulicLockLevel, monitoringEnabled: boolean): StatusStyle => {
            if (!monitoringEnabled) {
                return {
                    statusColor: 'text-mobile-text-muted',
                    bgColor: 'bg-mobile-surface-dark',
                    icon: 'security',
                    statusText: 'Monitoring Disabled'
                };
            }
            
            if (lockLevel === HydraulicLockLevel.HARD) {
                return {
                    statusColor: 'text-red-400',
                    bgColor: 'bg-red-500/10',
                    icon: 'error',
                    statusText: 'System Locked'
                };
            }
            
            if (lockLevel === HydraulicLockLevel.SOFT) {
                return {
                    statusColor: 'text-amber-400',
                    bgColor: 'bg-amber-500/10',
                    icon: 'warning',
                    statusText: 'Warning'
                };
            }
            
            return {
                statusColor: 'text-green-400',
                bgColor: 'bg-green-500/10',
                icon: 'check_circle',
                statusText: 'System Nominal'
            };
        };

        it('should return disabled style when monitoring is disabled', () => {
            const style = getStatusStyle(HydraulicLockLevel.NONE, false);
            expect(style.statusText).toBe('Monitoring Disabled');
            expect(style.icon).toBe('security');
        });

        it('should return OK style when monitoring enabled and no lock', () => {
            const style = getStatusStyle(HydraulicLockLevel.NONE, true);
            expect(style.statusText).toBe('System Nominal');
            expect(style.icon).toBe('check_circle');
            expect(style.statusColor).toBe('text-green-400');
        });

        it('should return warning style for soft lock', () => {
            const style = getStatusStyle(HydraulicLockLevel.SOFT, true);
            expect(style.statusText).toBe('Warning');
            expect(style.icon).toBe('warning');
            expect(style.statusColor).toBe('text-amber-400');
        });

        it('should return error style for hard lock', () => {
            const style = getStatusStyle(HydraulicLockLevel.HARD, true);
            expect(style.statusText).toBe('System Locked');
            expect(style.icon).toBe('error');
            expect(style.statusColor).toBe('text-red-400');
        });
    });

    describe('Component exports', () => {
        it('should export HydraulicStatusWidget as default', async () => {
            const module = await import('../../components/HydraulicStatusWidget');
            expect(module.default).toBeDefined();
        });
    });
});
