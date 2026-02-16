import { useEffect, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Toast } from '@capacitor/toast';
import { runBackInterceptors } from '../lib/backInterceptors';
import { navigationStack } from '../lib/navigationStack';

// Only show "press back again to exit" on the main dashboard
// Other paths like /welcome or / should navigate normally
const ROOT_EXIT_PATHS = new Set<string>(['/dashboard']);
const DOUBLE_BACK_TIMEOUT_MS = 2000; // Time window for double-back to exit

export default function AndroidBackButtonHandler(): null {
  const history = useHistory();
  const location = useLocation();
  const currentPathRef = useRef(`${location.pathname}${location.search || ''}${location.hash || ''}`);
  const lastBackPressRef = useRef<number>(0);

  const splitFullPath = (raw: string): { pathname: string; suffix: string } => {
    const input = (raw || '').trim();
    const qIndex = input.indexOf('?');
    const hIndex = input.indexOf('#');
    let end = input.length;
    if (qIndex >= 0) end = Math.min(end, qIndex);
    if (hIndex >= 0) end = Math.min(end, hIndex);
    return { pathname: input.slice(0, end) || '/', suffix: input.slice(end) };
  };

  const locationKey = (pathname: string, search: string, hash: string): string => `${pathname}${search || ''}${hash || ''}`;

  const navigateBackInApp = (path: string, options: { allowExit: boolean; source: 'hardware' | 'ui' }): boolean => {
    const pathnameOnly = splitFullPath(path).pathname || '/';
    // PRIORITY 0: Let the current page intercept back (e.g. go to previous tab).
    if (runBackInterceptors(pathnameOnly)) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[back] intercepted by page');
      }
      return true;
    }

    // PRIORITY 1: Double-back to exit on root paths (dashboard only).
    if (options.allowExit && ROOT_EXIT_PATHS.has(pathnameOnly)) {
      const now = Date.now();
      const timeSinceLastBack = now - lastBackPressRef.current;

      if (timeSinceLastBack < DOUBLE_BACK_TIMEOUT_MS) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] double-back confirmed, exiting app');
        }
        CapacitorApp.exitApp();
      } else {
        lastBackPressRef.current = now;
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] first back press, waiting for confirmation');
        }
        Toast.show({
          text: 'Press back again to exit',
          duration: 'short',
          position: 'bottom',
        });
      }
      return true;
    }

    // PRIORITY 2: Use explicit navigation stack.
    const previousPath = navigationStack.pop();
    const previousPathname = previousPath ? splitFullPath(previousPath).pathname : '';
    if (previousPath && previousPath !== path && !ROOT_EXIT_PATHS.has(previousPathname)) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[back] using nav stack ->', previousPath);
      }
      currentPathRef.current = previousPath;
      history.replace(previousPath);
      return true;
    }

    // PRIORITY 3: Parent mapping fallback.
    const parentPath = navigationStack.getParentPath(pathnameOnly);
    if (parentPath && parentPath !== path) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[back] using parent path ->', parentPath);
      }
      currentPathRef.current = parentPath;
      history.replace(parentPath);
      return true;
    }

    // FINAL: Keep app usable even with empty stack.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[back] final fallback -> /dashboard');
    }
    currentPathRef.current = '/dashboard';
    history.replace('/dashboard');
    return true;
  };

  // Track route changes in the navigation stack
  useEffect(() => {
    const fullPath = locationKey(location.pathname, location.search, location.hash);
    currentPathRef.current = fullPath;
    navigationStack.push(fullPath);
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[back] AndroidBackButtonHandler active');
    }

    const onIonBackButton = (ev: any) => {
      // Priority: overlays (100) and menu (99) should run first, then us, then Ionic router (0).
      ev.detail.register(10, () => {
        const path = currentPathRef.current;

        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log('[back] pressed', { path, stackSize: navigationStack.size() });
        }

        navigateBackInApp(path, { allowExit: true, source: 'hardware' });
      });
    };

    document.addEventListener('ionBackButton', onIonBackButton as any);

    return () => {
      document.removeEventListener('ionBackButton', onIonBackButton as any);
    };
  }, [history]);

  // Patch UI-triggered `history.goBack()` calls to use the same deterministic
  // in-app back logic as Android hardware back.
  useEffect(() => {
    const originalGoBack = history.goBack.bind(history);
    const historyWithMutableBack = history as typeof history & { goBack: () => void };

    historyWithMutableBack.goBack = () => {
      const path = currentPathRef.current || locationKey(history.location.pathname, history.location.search, history.location.hash || '');
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[back-ui] goBack called', { path, stackSize: navigationStack.size() });
      }
      navigateBackInApp(path, { allowExit: false, source: 'ui' });
    };

    return () => {
      historyWithMutableBack.goBack = originalGoBack;
    };
  }, [history]);

  return null;
}
