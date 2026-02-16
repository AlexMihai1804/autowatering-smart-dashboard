/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { navigationStack } from '../../lib/navigationStack';

describe('NavigationStack', () => {
    beforeEach(() => {
        navigationStack.clear();
    });

    describe('push', () => {
        it('should add path to stack', () => {
            navigationStack.push('/test');
            expect(navigationStack.size()).toBe(1);
            expect(navigationStack.current()).toBe('/test');
        });

        it('should normalize paths', () => {
            navigationStack.push('/test/');
            expect(navigationStack.current()).toBe('/test');
        });

        it('should ignore duplicate consecutive paths', () => {
            navigationStack.push('/test');
            navigationStack.push('/test');
            expect(navigationStack.size()).toBe(1);
        });

        it('should ignore excluded paths', () => {
            navigationStack.push('/scan');
            expect(navigationStack.size()).toBe(0);
        });

        it('should respect max size', () => {
            // Mock max size by accessing private prop if needed, or push 51 items
            // Assuming default 50
            for (let i = 0; i < 60; i++) {
                navigationStack.push(`/path/${i}`);
            }
            expect(navigationStack.size()).toBe(50);
            expect(navigationStack.current()).toBe('/path/59');
        });
    });

    describe('pop', () => {
        it('should return previous path', () => {
            navigationStack.push('/1');
            navigationStack.push('/2');

            const prev = navigationStack.pop();
            expect(prev).toBe('/1');
            expect(navigationStack.current()).toBe('/1');
            expect(navigationStack.size()).toBe(1);
        });

        it('should return null if stack empty/size 1', () => {
            navigationStack.push('/1');
            expect(navigationStack.pop()).toBeNull();
        });
    });

    describe('getParentPath', () => {
        it('should handle zone details paths', () => {
            expect(navigationStack.getParentPath('/zones/1')).toBe('/zones');
            expect(navigationStack.getParentPath('/zones/1/config')).toBe('/zones/1');
        });

        it('should handle explicit parent map', () => {
            expect(navigationStack.getParentPath('/history')).toBe('/dashboard');
            expect(navigationStack.getParentPath('/device')).toBe('/settings');
            expect(navigationStack.getParentPath('/app-settings')).toBe('/settings');
            expect(navigationStack.getParentPath('/manage-devices')).toBe('/settings');
            expect(navigationStack.getParentPath('/help')).toBe('/settings');
            expect(navigationStack.getParentPath('/profile')).toBe('/settings');
            expect(navigationStack.getParentPath('/premium')).toBe('/settings');
            expect(navigationStack.getParentPath('/alarms')).toBe('/settings');
            expect(navigationStack.getParentPath('/ai-doctor')).toBe('/dashboard');
            expect(navigationStack.getParentPath('/notifications')).toBe('/dashboard');
        });

        it('should prioritize nested device/app-settings fallbacks', () => {
            expect(navigationStack.getParentPath('/device/info')).toBe('/device');
            expect(navigationStack.getParentPath('/device/reset')).toBe('/device');
            expect(navigationStack.getParentPath('/app-settings/notifications')).toBe('/app-settings');
        });

        it('should default to dashboard', () => {
            expect(navigationStack.getParentPath('/unknown')).toBe('/dashboard');
        });
    });

    describe('tab switching behavior', () => {
        it('should collapse deep stack when switching to another tab', () => {
            navigationStack.push('/welcome');
            navigationStack.push('/zones');
            navigationStack.push('/zones/1');
            navigationStack.push('/ai-doctor');

            expect(navigationStack.current()).toBe('/ai-doctor');
            expect(navigationStack.size()).toBe(2);
            expect(navigationStack.pop()).toBe('/welcome');
            expect(navigationStack.pop()).toBeNull();
        });

        it('should avoid duplicate tab roots after rapid tab changes', () => {
            navigationStack.push('/welcome');
            navigationStack.push('/zones');
            navigationStack.push('/ai-doctor');
            navigationStack.push('/zones');

            expect(navigationStack.current()).toBe('/zones');
            expect(navigationStack.size()).toBe(2);
            expect(navigationStack.pop()).toBe('/welcome');
            expect(navigationStack.pop()).toBeNull();
        });
    });
});
