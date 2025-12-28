export type BackInterceptor = {
  id: string;
  isActive: (pathname: string) => boolean;
  onBack: () => boolean;
};

const interceptors = new Map<string, BackInterceptor>();

export function registerBackInterceptor(interceptor: BackInterceptor): () => void {
  interceptors.set(interceptor.id, interceptor);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[backInterceptors] registered:', interceptor.id, '| total:', interceptors.size);
  }
  return () => {
    interceptors.delete(interceptor.id);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[backInterceptors] unregistered:', interceptor.id, '| remaining:', interceptors.size);
    }
  };
}

export function runBackInterceptors(pathname: string): boolean {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log('[backInterceptors] run for path:', pathname, '| interceptors:', [...interceptors.keys()]);
  }
  for (const interceptor of interceptors.values()) {
    const isActive = interceptor.isActive(pathname);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log('[backInterceptors] checking:', interceptor.id, '| isActive:', isActive);
    }
    if (!isActive) continue;
    try {
      const handled = interceptor.onBack();
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.log('[backInterceptors]', interceptor.id, 'handled:', handled);
      }
      if (handled) return true;
    } catch (e) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.error('[backInterceptors] error in', interceptor.id, e);
      }
      // Ignore interceptor errors and continue with normal back handling.
    }
  }
  return false;
}

