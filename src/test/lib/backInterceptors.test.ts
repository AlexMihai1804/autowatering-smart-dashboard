import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to reset module state between tests
describe('backInterceptors', () => {
    // Store cleanup functions
    let cleanupFunctions: (() => void)[] = [];

    beforeEach(async () => {
        // Clean up any registered interceptors from previous tests
        cleanupFunctions.forEach(fn => fn());
        cleanupFunctions = [];

        // Reset modules to get fresh state
        vi.resetModules();
    });

    describe('registerBackInterceptor', () => {
        it('should register an interceptor and return unregister function', async () => {
            const { registerBackInterceptor } = await import('../../lib/backInterceptors');

            const interceptor = {
                id: 'test-interceptor-1',
                isActive: () => true,
                onBack: () => true,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            expect(typeof unregister).toBe('function');
        });

        it('should allow registering multiple interceptors', async () => {
            const { registerBackInterceptor } = await import('../../lib/backInterceptors');

            const interceptor1 = {
                id: 'interceptor-1',
                isActive: () => true,
                onBack: () => false,
            };
            const interceptor2 = {
                id: 'interceptor-2',
                isActive: () => true,
                onBack: () => false,
            };

            const unregister1 = registerBackInterceptor(interceptor1);
            const unregister2 = registerBackInterceptor(interceptor2);
            cleanupFunctions.push(unregister1, unregister2);

            expect(typeof unregister1).toBe('function');
            expect(typeof unregister2).toBe('function');
        });
    });

    describe('runBackInterceptors', () => {
        it('should return false when no interceptors are registered', async () => {
            const { runBackInterceptors } = await import('../../lib/backInterceptors');

            const result = runBackInterceptors('/some-path');
            expect(result).toBe(false);
        });

        it('should call onBack for active interceptors', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const onBack = vi.fn().mockReturnValue(true);
            const interceptor = {
                id: 'active-test',
                isActive: (path: string) => path === '/active',
                onBack,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            const result = runBackInterceptors('/active');
            expect(onBack).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should not call onBack for inactive interceptors', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const onBack = vi.fn().mockReturnValue(true);
            const interceptor = {
                id: 'inactive-test',
                isActive: (path: string) => path === '/active',
                onBack,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            const result = runBackInterceptors('/inactive');
            expect(onBack).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return true when an interceptor handles the back action', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const interceptor = {
                id: 'handling-test',
                isActive: () => true,
                onBack: () => true,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            const result = runBackInterceptors('/any-path');
            expect(result).toBe(true);
        });

        it('should return false when no interceptor handles the back action', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const interceptor = {
                id: 'not-handling-test',
                isActive: () => true,
                onBack: () => false,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            const result = runBackInterceptors('/any-path');
            expect(result).toBe(false);
        });

        it('should handle errors in interceptor onBack gracefully', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const brokenInterceptor = {
                id: 'broken',
                isActive: () => true,
                onBack: () => {
                    throw new Error('Test error');
                },
            };

            const unregister = registerBackInterceptor(brokenInterceptor);
            cleanupFunctions.push(unregister);

            // Should not throw
            expect(() => runBackInterceptors('/path')).not.toThrow();

            // Should return false since the broken interceptor didn't handle it properly
            const result = runBackInterceptors('/path');
            expect(result).toBe(false);
        });

        it('should pass pathname to isActive function', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const isActive = vi.fn().mockReturnValue(false);
            const interceptor = {
                id: 'pathname-test',
                isActive,
                onBack: () => true,
            };

            const unregister = registerBackInterceptor(interceptor);
            cleanupFunctions.push(unregister);

            runBackInterceptors('/zones/1/details');

            expect(isActive).toHaveBeenCalledWith('/zones/1/details');
        });
    });

    describe('unregister behavior', () => {
        it('should allow unregistering an interceptor', async () => {
            const { registerBackInterceptor, runBackInterceptors } = await import('../../lib/backInterceptors');

            const onBack = vi.fn().mockReturnValue(true);
            const interceptor = {
                id: 'unregister-test',
                isActive: (path: string) => path === '/test',
                onBack,
            };

            const unregister = registerBackInterceptor(interceptor);

            // Should be called when active
            runBackInterceptors('/test');
            expect(onBack).toHaveBeenCalled();

            // Unregister
            unregister();
            onBack.mockClear();

            // Should not be called after unregister
            runBackInterceptors('/test');
            expect(onBack).not.toHaveBeenCalled();
        });
    });
});
