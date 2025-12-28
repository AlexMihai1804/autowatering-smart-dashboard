export type BackInterceptor = {
  id: string;
  isActive: (pathname: string) => boolean;
  onBack: () => boolean;
};

const interceptors = new Map<string, BackInterceptor>();

export function registerBackInterceptor(interceptor: BackInterceptor): () => void {
  interceptors.set(interceptor.id, interceptor);
  return () => {
    interceptors.delete(interceptor.id);
  };
}

export function runBackInterceptors(pathname: string): boolean {
  for (const interceptor of interceptors.values()) {
    if (!interceptor.isActive(pathname)) continue;
    try {
      const handled = interceptor.onBack();
      if (handled) return true;
    } catch {
      // Ignore interceptor errors and continue with normal back handling.
    }
  }
  return false;
}
