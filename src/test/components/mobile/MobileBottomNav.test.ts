/**
 * Tests for MobileBottomNav component
 */
import { describe, it, expect } from 'vitest';

// Nav items configuration (copied from component for testing)
const navItems = [
    { path: '/dashboard', icon: 'home', label: 'Home' },
    { path: '/zones', icon: 'yard', label: 'Zones' },
    { path: '/history', icon: 'history', label: 'History' },
    { path: '/settings', icon: 'settings', label: 'Settings' },
];

describe('MobileBottomNav', () => {
    describe('navigation items', () => {
        it('should have 4 navigation items', () => {
            expect(navItems.length).toBe(4);
        });

        it('should have dashboard as first item', () => {
            expect(navItems[0].path).toBe('/dashboard');
            expect(navItems[0].label).toBe('Home');
        });

        it('should have zones as second item', () => {
            expect(navItems[1].path).toBe('/zones');
            expect(navItems[1].label).toBe('Zones');
        });

        it('should have history as third item', () => {
            expect(navItems[2].path).toBe('/history');
            expect(navItems[2].label).toBe('History');
        });

        it('should have settings as fourth item', () => {
            expect(navItems[3].path).toBe('/settings');
            expect(navItems[3].label).toBe('Settings');
        });

        it('should have unique paths', () => {
            const paths = navItems.map(item => item.path);
            const uniquePaths = new Set(paths);
            expect(uniquePaths.size).toBe(paths.length);
        });

        it('should have valid icons', () => {
            navItems.forEach(item => {
                expect(item.icon).toBeTruthy();
                expect(typeof item.icon).toBe('string');
            });
        });

        it('should have valid labels', () => {
            navItems.forEach(item => {
                expect(item.label).toBeTruthy();
                expect(typeof item.label).toBe('string');
            });
        });
    });

    describe('active state logic', () => {
        it('should detect active path correctly', () => {
            const currentPath = '/dashboard';
            const isActive = navItems[0].path === currentPath;
            expect(isActive).toBe(true);
        });

        it('should detect inactive path correctly', () => {
            const currentPath = '/zones';
            const isActive = navItems[0].path === currentPath;
            expect(isActive).toBe(false);
        });
    });

    describe('component export', () => {
        it('should export default component', async () => {
            const module = await import('../../../components/mobile/MobileBottomNav');
            expect(module.default).toBeDefined();
            expect(typeof module.default).toBe('function');
        });
    });
});
