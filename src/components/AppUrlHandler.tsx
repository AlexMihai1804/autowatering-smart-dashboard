import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { useHistory } from 'react-router-dom';

const env = import.meta.env as Record<string, string | undefined>;
const APP_URL_SCHEME = (env.VITE_APP_URL_SCHEME?.trim() || 'autowatering').toLowerCase();

function toRoutePath(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    const protocol = parsed.protocol.replace(':', '').toLowerCase();
    const expectedProtocol = APP_URL_SCHEME.toLowerCase();

    if (protocol === expectedProtocol) {
      const hostPath = parsed.hostname ? `/${parsed.hostname}` : '';
      const path = parsed.pathname && parsed.pathname !== '/' ? parsed.pathname : (hostPath || '/');
      return `${path}${parsed.search}${parsed.hash}`;
    }

    if ((protocol === 'https' || protocol === 'http') && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return null;
  }

  return null;
}

function isSafeAppRoute(path: string): boolean {
  const allowedPrefixes = [
    '/premium',
    '/auth',
    '/profile',
    '/dashboard',
    '/settings',
    '/ai-doctor',
    '/zones',
    '/history',
    '/welcome'
  ];
  return allowedPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
}

const AppUrlHandler: React.FC = () => {
  const history = useHistory();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let mounted = true;
    let removeListener: (() => Promise<void> | void) | null = null;

    const routeFromUrl = (url: string) => {
      const routePath = toRoutePath(url);
      if (!routePath || !isSafeAppRoute(routePath)) return;
      history.replace(routePath);
    };

    const register = async () => {
      const launch = await CapacitorApp.getLaunchUrl();
      if (launch?.url) {
        routeFromUrl(launch.url);
      }

      const handle = await CapacitorApp.addListener('appUrlOpen', (event) => {
        routeFromUrl(event.url);
      });

      if (!mounted) {
        await handle.remove();
        return;
      }
      removeListener = () => handle.remove();
    };

    void register();

    return () => {
      mounted = false;
      if (removeListener) {
        void removeListener();
      }
    };
  }, [history]);

  return null;
};

export default AppUrlHandler;
