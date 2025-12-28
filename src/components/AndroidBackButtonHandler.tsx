import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { runBackInterceptors } from '../lib/backInterceptors';
import { navigationStack } from '../lib/navigationStack';

const ROOT_EXIT_PATHS = new Set<string>(['/', '/welcome', '/dashboard']);

export default function AndroidBackButtonHandler(): null {
  const history = useHistory();
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);

  // Track route changes in the navigation stack
  useEffect(() => {
    currentPathRef.current = location.pathname;
    navigationStack.push(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[back] AndroidBackButtonHandler active');
    }

    let cancelled = false;
    let handle: PluginListenerHandle | null = null;

    (async () => {
      handle = await CapacitorApp.addListener('backButton', () => {
        const path = currentPathRef.current;

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] pressed', { path, stackSize: navigationStack.size() });
        }

        // PRIORITY 0: Let the current page intercept back (e.g. go to previous tab).
        // This must be done here (single listener) because Capacitor calls ALL listeners.
        if (runBackInterceptors(path)) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[back] intercepted by page');
          }
          // CRITICAL: Push a no-op history entry to prevent other Ionic/Capacitor
          // back listeners from also performing navigation. Without this, the
          // IonRouterOutlet's internal back handling may still trigger.
          history.push(path);
          return;
        }

        // PRIORITY 1: Exit app on root paths (dashboard, welcome, etc.)
        // This must come BEFORE navigation stack to prevent going back to welcome from dashboard
        if (ROOT_EXIT_PATHS.has(path)) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[back] on root path, exiting app');
          }
          CapacitorApp.exitApp();
          return;
        }

        // PRIORITY 2: Use our explicit navigation stack
        const previousPath = navigationStack.pop();
        // Skip navigation to root/transitional paths - use parent path instead
        if (previousPath && previousPath !== path && !ROOT_EXIT_PATHS.has(previousPath)) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[back] using nav stack →', previousPath);
          }
          history.replace(previousPath);
          return;
        }

        // PRIORITY 3: Use logical parent path mapping as fallback
        const parentPath = navigationStack.getParentPath(path);
        if (parentPath && parentPath !== path) {
          if (import.meta.env.DEV) {
            // eslint-disable-next-line no-console
            console.log('[back] using parent path →', parentPath);
          }
          history.replace(parentPath);
          return;
        }

        // Final fallback
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] final fallback → /dashboard');
        }
        history.replace('/dashboard');
      });

      if (cancelled && handle) {
        await handle.remove();
      }
    })();

    return () => {
      cancelled = true;
      if (handle) {
        void handle.remove();
      }
    };
  }, [history]);

  return null;
}
