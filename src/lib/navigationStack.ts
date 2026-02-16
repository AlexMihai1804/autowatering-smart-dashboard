/**
 * Navigation Stack - Manages explicit navigation history for Android back button.
 * 
 * The browser's history API doesn't reliably track in-app navigation order,
 * so we maintain our own stack to ensure predictable back navigation.
 */

function splitFullPath(raw: string): { pathname: string; suffix: string } {
    const input = typeof raw === 'string' ? raw.trim() : '';
    if (!input) return { pathname: '/', suffix: '' };

    const qIndex = input.indexOf('?');
    const hIndex = input.indexOf('#');
    let end = input.length;
    if (qIndex >= 0) end = Math.min(end, qIndex);
    if (hIndex >= 0) end = Math.min(end, hIndex);

    const pathname = input.slice(0, end) || '/';
    const suffix = input.slice(end);
    return { pathname, suffix };
}

function normalizePathname(pathname: string): string {
    const cleaned = pathname.trim() || '/';
    if (cleaned === '/') return '/';
    return cleaned.replace(/\/+$/, '');
}

// Define logical parent paths for fallback navigation
const PARENT_PATH_MAP: Record<string, string> = {
    '/zones': '/dashboard',
    '/device': '/settings',
    '/history': '/dashboard',
    '/settings': '/dashboard',
    '/ai-doctor': '/dashboard',
    '/app-settings': '/settings',
    '/manage-devices': '/settings',
    '/help': '/settings',
    '/profile': '/settings',
    '/premium': '/settings',
    '/alarms': '/settings',
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
const TAB_ROOT_PATHS = new Set(['/dashboard', '/zones', '/ai-doctor', '/history', '/settings']);

class NavigationStack {
    private stack: string[] = [];
    private maxSize = 50; // Prevent memory issues

    /**
     * Push a new path onto the stack.
     * Skips duplicate consecutive entries and excluded paths.
     */
    push(path: string): void {
        // Normalize path (normalize pathname; preserve ?query/#hash).
        const { pathname: rawPathname, suffix } = splitFullPath(path);
        const normalizedPathname = normalizePathname(rawPathname);
        const normalizedFullPath = `${normalizedPathname}${suffix}`;

        // Skip excluded transitional paths
        if (EXCLUDED_PATHS.has(normalizedPathname)) {
            return;
        }

        // Skip duplicate consecutive entries
        if (this.stack.length > 0 && this.stack[this.stack.length - 1] === normalizedFullPath) {
            return;
        }

        // Tab switching: collapse to the most recent tab root and replace it.
        // This prevents deep pages (e.g. /ai-doctor) from polluting tab back history.
        if (TAB_ROOT_PATHS.has(normalizedPathname) && this.stack.length > 0) {
            let lastTabIndex = -1;
            for (let i = this.stack.length - 1; i >= 0; i--) {
                const candidate = this.stack[i];
                const candidatePathname = normalizePathname(splitFullPath(candidate || '').pathname);
                if (candidate && TAB_ROOT_PATHS.has(candidatePathname)) {
                    lastTabIndex = i;
                    break;
                }
            }

            if (lastTabIndex >= 0) {
                this.stack = this.stack.slice(0, lastTabIndex + 1);
                this.stack[lastTabIndex] = normalizedFullPath;

                // Prevent duplicate consecutive tab roots like:
                // [..., '/zones', '/ai-doctor'] -> switch to '/zones' => [..., '/zones', '/zones']
                if (
                    lastTabIndex > 0
                    && normalizePathname(splitFullPath(this.stack[lastTabIndex - 1] || '').pathname) === normalizedPathname
                ) {
                    this.stack.pop();
                }

                if (import.meta.env.DEV) {
                    // eslint-disable-next-line no-console
                    console.log('[NavStack] replace(tab):', normalizedFullPath, '| stack:', [...this.stack]);
                }
                return;
            }
        }

        this.stack.push(normalizedFullPath);

        // Trim stack if too large
        if (this.stack.length > this.maxSize) {
            this.stack = this.stack.slice(-this.maxSize);
        }

        if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[NavStack] push:', normalizedFullPath, '| stack:', [...this.stack]);
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
            console.log('[NavStack] pop:', current, '->', previous, '| stack:', [...this.stack]);
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
        const normalizedPath = normalizePathname(splitFullPath(path).pathname);
        // Zone details -> zones list
        if (normalizedPath.startsWith('/zones/') && normalizedPath !== '/zones') {
            const match = normalizedPath.match(/^\/zones\/([^/]+)(?:\/(.*))?$/);
            const channelId = match?.[1];
            const rest = match?.[2];
            // /zones/1/config -> /zones/1
            if (channelId && rest) return `/zones/${channelId}`;
            // /zones/1 -> /zones
            return '/zones';
        }

        // Device sub-pages -> device
        if (normalizedPath.startsWith('/device/') && normalizedPath !== '/device') {
            return '/device';
        }

        // Health sub-pages -> health hub
        if (normalizedPath.startsWith('/health/') && normalizedPath !== '/health') {
            return '/health';
        }

        // App settings sub-pages -> app-settings
        if (normalizedPath.startsWith('/app-settings/') && normalizedPath !== '/app-settings') {
            return '/app-settings';
        }

        // Use explicit parent map
        if (normalizedPath in PARENT_PATH_MAP) {
            return PARENT_PATH_MAP[normalizedPath];
        }

        // Default to dashboard
        if (normalizedPath !== '/dashboard' && normalizedPath !== '/' && normalizedPath !== '/welcome') {
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
