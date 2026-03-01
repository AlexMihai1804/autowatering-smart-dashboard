/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PERMISSIONS_STORAGE_KEY,
  areRequiredPermissionsGrantedFromStorage,
  resolvePostConnectionRoute,
  resolveWelcomeRoute,
} from '../../utils/onboardingRouteResolver';

describe('onboardingRouteResolver', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('resolvePostConnectionRoute', () => {
    it('returns null while onboarding state is unavailable', () => {
      expect(resolvePostConnectionRoute(null)).toBeNull();
    });

    it('routes to onboarding when no channel is configured', () => {
      expect(
        resolvePostConnectionRoute({
          channels_completion_pct: 0,
        } as any)
      ).toBe('/onboarding');
    });

    it('routes to dashboard when at least one channel is configured', () => {
      expect(
        resolvePostConnectionRoute({
          channels_completion_pct: 10,
        } as any)
      ).toBe('/dashboard');
    });
  });

  describe('resolveWelcomeRoute', () => {
    it('prioritizes post-connection routing when already connected', () => {
      expect(
        resolveWelcomeRoute({
          connectionState: 'connected',
          onboardingState: { channels_completion_pct: 5 } as any,
          knownDevicesCount: 1,
          requiredPermissionsGranted: true,
        })
      ).toBe('/dashboard');
    });

    it('keeps current screen while scanning/connecting', () => {
      expect(
        resolveWelcomeRoute({
          connectionState: 'connecting',
          onboardingState: null,
          knownDevicesCount: 0,
          requiredPermissionsGranted: false,
        })
      ).toBeNull();
    });

    it('routes to permissions when required permissions are missing', () => {
      expect(
        resolveWelcomeRoute({
          connectionState: 'disconnected',
          onboardingState: null,
          knownDevicesCount: 0,
          requiredPermissionsGranted: false,
        })
      ).toBe('/permissions');
    });

    it('routes to no-devices after permissions are granted but there are no known devices', () => {
      expect(
        resolveWelcomeRoute({
          connectionState: 'disconnected',
          onboardingState: null,
          knownDevicesCount: 0,
          requiredPermissionsGranted: true,
        })
      ).toBe('/no-devices');
    });

    it('stays on welcome when prerequisites are met and known devices exist', () => {
      expect(
        resolveWelcomeRoute({
          connectionState: 'disconnected',
          onboardingState: null,
          knownDevicesCount: 2,
          requiredPermissionsGranted: true,
        })
      ).toBeNull();
    });
  });

  describe('areRequiredPermissionsGrantedFromStorage', () => {
    it('returns false when nothing is stored', () => {
      expect(areRequiredPermissionsGrantedFromStorage()).toBe(false);
    });

    it('returns true only when bluetooth and location are granted', () => {
      localStorage.setItem(
        PERMISSIONS_STORAGE_KEY,
        JSON.stringify([
          { id: 'bluetooth', granted: true },
          { id: 'location', granted: true },
          { id: 'notifications', granted: false },
        ])
      );
      expect(areRequiredPermissionsGrantedFromStorage()).toBe(true);
    });

    it('returns false when one required permission is missing or denied', () => {
      localStorage.setItem(
        PERMISSIONS_STORAGE_KEY,
        JSON.stringify([
          { id: 'bluetooth', granted: true },
          { id: 'location', granted: false },
        ])
      );
      expect(areRequiredPermissionsGrantedFromStorage()).toBe(false);
    });
  });
});
