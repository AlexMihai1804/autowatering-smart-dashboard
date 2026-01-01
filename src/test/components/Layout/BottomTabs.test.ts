/**
 * Tests for Layout components helper functions
 * Tests navigation, active route detection, styling logic
 */
import { describe, it, expect } from 'vitest';

describe('BottomTabs Navigation', () => {
    const ROUTES = ['/dashboard', '/zones', '/history', '/settings'];

    describe('Route Matching', () => {
        const isActiveRoute = (currentPath: string, tabPath: string): boolean => {
            return currentPath === tabPath;
        };

        it('should match exact route', () => {
            expect(isActiveRoute('/dashboard', '/dashboard')).toBe(true);
            expect(isActiveRoute('/zones', '/zones')).toBe(true);
        });

        it('should not match different routes', () => {
            expect(isActiveRoute('/dashboard', '/zones')).toBe(false);
            expect(isActiveRoute('/settings', '/history')).toBe(false);
        });
    });

    describe('Tab Colors', () => {
        const getTabColor = (route: string): string => {
            switch (route) {
                case '/dashboard': return 'text-cyber-cyan';
                case '/zones': return 'text-cyber-emerald';
                case '/history': return 'text-cyan-400';
                case '/settings': return 'text-cyber-amber';
                default: return 'text-gray-500';
            }
        };

        it('should return cyan for dashboard', () => {
            expect(getTabColor('/dashboard')).toBe('text-cyber-cyan');
        });

        it('should return emerald for zones', () => {
            expect(getTabColor('/zones')).toBe('text-cyber-emerald');
        });

        it('should return cyan-400 for history', () => {
            expect(getTabColor('/history')).toBe('text-cyan-400');
        });

        it('should return amber for settings', () => {
            expect(getTabColor('/settings')).toBe('text-cyber-amber');
        });

        it('should return gray for unknown routes', () => {
            expect(getTabColor('/unknown')).toBe('text-gray-500');
        });
    });

    describe('Available Routes', () => {
        it('should have 4 main routes', () => {
            expect(ROUTES).toHaveLength(4);
        });

        it('should include all main sections', () => {
            expect(ROUTES).toContain('/dashboard');
            expect(ROUTES).toContain('/zones');
            expect(ROUTES).toContain('/history');
            expect(ROUTES).toContain('/settings');
        });
    });
});

describe('Sidebar Navigation', () => {
    interface NavItem {
        path: string;
        label: string;
        icon: string;
    }

    const NAV_ITEMS: NavItem[] = [
        { path: '/dashboard', label: 'Dashboard', icon: '📊' },
        { path: '/zones', label: 'Zones', icon: '🌱' },
        { path: '/history', label: 'History', icon: '📈' },
        { path: '/settings', label: 'Settings', icon: '⚙️' },
    ];

    describe('Nav Items Configuration', () => {
        it('should have path for each item', () => {
            NAV_ITEMS.forEach(item => {
                expect(item.path).toBeDefined();
                expect(item.path.startsWith('/')).toBe(true);
            });
        });

        it('should have label for each item', () => {
            NAV_ITEMS.forEach(item => {
                expect(item.label).toBeDefined();
                expect(item.label.length).toBeGreaterThan(0);
            });
        });

        it('should have icon for each item', () => {
            NAV_ITEMS.forEach(item => {
                expect(item.icon).toBeDefined();
            });
        });
    });

    describe('Active State Styling', () => {
        const getNavItemClass = (isActive: boolean): string => {
            if (isActive) {
                return 'bg-cyber-cyan/20 text-cyber-cyan border border-cyber-cyan/30';
            }
            return 'text-gray-400 hover:bg-white/5';
        };

        it('should return active class when selected', () => {
            const cls = getNavItemClass(true);
            expect(cls).toContain('bg-cyber-cyan/20');
            expect(cls).toContain('text-cyber-cyan');
        });

        it('should return inactive class when not selected', () => {
            const cls = getNavItemClass(false);
            expect(cls).toContain('text-gray-400');
        });
    });

    describe('Find Nav Item', () => {
        const findNavItem = (path: string): NavItem | undefined => {
            return NAV_ITEMS.find(item => item.path === path);
        };

        it('should find dashboard item', () => {
            const item = findNavItem('/dashboard');
            expect(item?.label).toBe('Dashboard');
            expect(item?.icon).toBe('📊');
        });

        it('should find zones item', () => {
            const item = findNavItem('/zones');
            expect(item?.label).toBe('Zones');
            expect(item?.icon).toBe('🌱');
        });

        it('should return undefined for unknown path', () => {
            expect(findNavItem('/unknown')).toBeUndefined();
        });
    });
});

describe('Shell Layout', () => {
    describe('Connection Status Display', () => {
        const getStatusText = (isConnected: boolean): string => {
            return isConnected ? 'ONLINE' : 'OFFLINE';
        };

        const getStatusColor = (isConnected: boolean): string => {
            return isConnected ? 'text-cyber-emerald' : 'text-gray-500';
        };

        it('should return ONLINE when connected', () => {
            expect(getStatusText(true)).toBe('ONLINE');
        });

        it('should return OFFLINE when disconnected', () => {
            expect(getStatusText(false)).toBe('OFFLINE');
        });

        it('should return emerald color when online', () => {
            expect(getStatusColor(true)).toBe('text-cyber-emerald');
        });

        it('should return gray color when offline', () => {
            expect(getStatusColor(false)).toBe('text-gray-500');
        });
    });
});
