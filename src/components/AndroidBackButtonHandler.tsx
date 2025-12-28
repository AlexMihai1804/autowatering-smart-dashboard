import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { runBackInterceptors } from '../lib/backInterceptors';

const ROOT_EXIT_PATHS = new Set<string>(['/', '/welcome', '/dashboard']);

function getFallbackBackPath(pathname: string): string | null {
  // Device sub-pages should go back to device settings list.
  if (pathname.startsWith('/device/') && pathname !== '/device') return '/device';

  // App sub-pages should go back to settings.
  if (pathname.startsWith('/app-settings/') && pathname !== '/app-settings') return '/app-settings';

  // Zones details/config pages should go back to zones list or zone detail.
  if (pathname.startsWith('/zones/')) {
    const match = pathname.match(/^\/zones\/([^/]+)(?:\/(.*))?$/);
    const channelId = match?.[1];
    const rest = match?.[2];
    if (channelId && rest) return `/zones/${channelId}`;
    return '/zones';
  }

  // Welcome flow pages should go back to welcome.
  if (pathname === '/scan' || pathname === '/permissions' || pathname === '/onboarding' || pathname === '/connection-success') {
    return '/welcome';
  }

  // Default safe landing.
  if (pathname !== '/dashboard') return '/dashboard';
  return null;
}

export default function AndroidBackButtonHandler(): null {
  const history = useHistory();
  const location = useLocation();
  const currentPathRef = useRef(location.pathname);

  useEffect(() => {
    currentPathRef.current = location.pathname;
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
      handle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
        const path = currentPathRef.current;
        
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] pressed', { canGoBack, path });
        }

        // PRIORITY 0: Let the current page intercept back (e.g. go to previous tab).
        // This must be done here (single listener) because Capacitor calls ALL listeners.
        if (runBackInterceptors(path)) {
          // Some stacks (notably Ionic/WebView integrations) may still perform a route back
          // via another back listener even if we "handle" the event here.
          // Push a no-op entry so any subsequent goBack() stays on the same route.
          history.push(path);
          return;
        }

        // PRIORITY 1: Use browser/router history if available
        const browserCanGoBack = typeof window !== 'undefined' && window.history && window.history.length > 1;

        if (canGoBack || browserCanGoBack) {
          history.goBack();
          return;
        }

        // PRIORITY 2: Use fallback path mapping
        const fallback = getFallbackBackPath(path);
        if (fallback && fallback !== path) {
          history.replace(fallback);
          return;
        }

        // PRIORITY 3: Exit app only on root paths
        if (ROOT_EXIT_PATHS.has(path)) {
          CapacitorApp.exitApp();
          return;
        }

        // Final fallback
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
