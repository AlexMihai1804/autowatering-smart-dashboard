/**
 * Navigation Stack - Manages explicit navigation history for Android back button.
 * 
 * The browser's history API doesn't reliably track in-app navigation order,
 * so we maintain our own stack to ensure predictable back navigation.
 */

// Define logical parent paths for fallback navigation
const PARENT_PATH_MAP: Record<string, string> = {
    '/zones': '/dashboard',
    '/device': '/dashboard',
    '/history': '/dashboard',
    '/settings': '/dashboard',
    '/app-settings': '/settings',
    '/notifications': '/dashboard',
};

// Paths that should never be added to the stack (transitional pages / wizards)
// We keep onboarding flows out of the explicit back stack so Android Back returns to
// logical parents (or exits from /dashboard) instead of replaying wizard steps.
const EXCLUDED_PATHS = new Set([
    '/scan',
    '/permissions',
    '/connection-success',
    '/onboarding',
    '/zones/add'
]);

// Root paths where back should exit the app
const ROOT_PATHS = new Set(['/', '/welcome', '/dashboard']);

// Main tab/root routes. Switching between these should not create a long
// back-history of alternating tabs.
const TAB_ROOT_PATHS = new Set(['/dashboard', '/zones', '/history', '/settings']);

class NavigationStack {
    private stack: string[] = [];
    private maxSize = 50; // Prevent memory issues

    /**
     * Push a new path onto the stack.
     * Skips duplicate consecutive entries and excluded paths.
     */
    push(path: string): void {
        // Normalize path (remove trailing slash except for root)
        const normalizedPath = path === '/' ? '/' : path.replace(/\/$/, '');

        // Skip excluded transitional paths
        if (EXCLUDED_PATHS.has(normalizedPath)) {
            return;
        }

        // Skip duplicate consecutive entries
        if (this.stack.length > 0 && this.stack[this.stack.length - 1] === normalizedPath) {
            return;
        }

        // Tab switching: replace the current tab root instead of pushing.
        if (TAB_ROOT_PATHS.has(normalizedPath) && this.stack.length > 0) {
            const last = this.stack[this.stack.length - 1];
            if (last && TAB_ROOT_PATHS.has(last)) {
                this.stack[this.stack.length - 1] = normalizedPath;
                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.log('[NavStack] replace(tab):', normalizedPath, '| stack:', [...this.stack]);
                }
                return;
            }
        }

        this.stack.push(normalizedPath);

        // Trim stack if too large
        if (this.stack.length > this.maxSize) {
            this.stack = this.stack.slice(-this.maxSize);
        }

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[NavStack] push:', normalizedPath, '| stack:', [...this.stack]);
        }
    }

    /**
     * Pop the current path and return the previous path.
     * Returns null if there's no previous path.
     */
    pop(): string | null {
        if (this.stack.length <= 1) {
            return null;
        }

        const current = this.stack.pop();
        const previous = this.stack[this.stack.length - 1] ?? null;

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[NavStack] pop:', current, '→', previous, '| stack:', [...this.stack]);
        }

        return previous;
    }

    /**
     * Peek at the previous path without modifying the stack.
     */
    peekPrevious(): string | null {
        if (this.stack.length <= 1) {
            return null;
        }
        return this.stack[this.stack.length - 2] ?? null;
    }

    /**
     * Get the current path (top of stack).
     */
    current(): string | null {
        return this.stack[this.stack.length - 1] ?? null;
    }

    /**
     * Check if we're on a root path (app should exit on back).
     */
    isOnRootPath(): boolean {
        const current = this.current();
        return current !== null && ROOT_PATHS.has(current);
    }

    /**
     * Get the logical parent path for a given path.
     * Used as fallback when stack is empty.
     */
    getParentPath(path: string): string | null {
        // Zone details → zones list
        if (path.startsWith('/zones/') && path !== '/zones') {
            const match = path.match(/^\/zones\/([^/]+)(?:\/(.*))?$/);
            const channelId = match?.[1];
            const rest = match?.[2];
            // /zones/1/config → /zones/1
            if (channelId && rest) return `/zones/${channelId}`;
            // /zones/1 → /zones
            return '/zones';
        }

        // Device sub-pages → device
        if (path.startsWith('/device/') && path !== '/device') {
            return '/device';
        }

        // App settings sub-pages → app-settings
        if (path.startsWith('/app-settings/') && path !== '/app-settings') {
            return '/app-settings';
        }

        // Use explicit parent map
        if (path in PARENT_PATH_MAP) {
            return PARENT_PATH_MAP[path];
        }

        // Default to dashboard
        if (path !== '/dashboard' && path !== '/' && path !== '/welcome') {
            return '/dashboard';
        }

        return null;
    }

    /**
     * Clear the stack (e.g., on logout).
     */
    clear(): void {
        this.stack = [];
        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[NavStack] cleared');
        }
    }

    /**
     * Get stack size for debugging.
     */
    size(): number {
        return this.stack.length;
    }
}

// Singleton instance
export const navigationStack = new NavigationStack();
