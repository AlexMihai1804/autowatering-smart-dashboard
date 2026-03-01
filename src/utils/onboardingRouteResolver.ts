import { OnboardingStatusData } from '../types/firmware_structs';

export const PERMISSIONS_STORAGE_KEY = 'autowater_permissions_state';

const REQUIRED_PERMISSION_IDS = ['bluetooth', 'location'] as const;

type ConnectionState = 'disconnected' | 'scanning' | 'connecting' | 'connected';

interface PersistedPermission {
  id: string;
  granted: boolean;
}

export interface WelcomeRouteContext {
  connectionState: ConnectionState;
  onboardingState: OnboardingStatusData | null;
  knownDevicesCount: number;
  requiredPermissionsGranted: boolean;
}

/**
 * Returns next route after a successful connection.
 * - null means "wait for onboarding status"
 */
export function resolvePostConnectionRoute(
  onboardingState: OnboardingStatusData | null
): '/dashboard' | '/onboarding' | null {
  if (!onboardingState) return null;
  return onboardingState.channels_completion_pct > 0 ? '/dashboard' : '/onboarding';
}

/**
 * Central decision tree for /welcome.
 * - null means "stay on current page"
 */
export function resolveWelcomeRoute(context: WelcomeRouteContext):
  | '/permissions'
  | '/no-devices'
  | '/dashboard'
  | '/onboarding'
  | null {
  if (context.connectionState === 'connected') {
    return resolvePostConnectionRoute(context.onboardingState);
  }

  if (context.connectionState === 'connecting' || context.connectionState === 'scanning') {
    return null;
  }

  if (!context.requiredPermissionsGranted) {
    return '/permissions';
  }

  if (context.knownDevicesCount === 0) {
    return '/no-devices';
  }

  return null;
}

/**
 * Read persisted permission state used by the onboarding flow.
 * If missing/invalid, we treat required permissions as not granted.
 */
export function areRequiredPermissionsGrantedFromStorage(): boolean {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return false;

    const parsed = JSON.parse(raw) as PersistedPermission[];
    if (!Array.isArray(parsed)) return false;

    return REQUIRED_PERMISSION_IDS.every((requiredId) =>
      parsed.some((entry) => entry.id === requiredId && entry.granted === true)
    );
  } catch {
    return false;
  }
}
