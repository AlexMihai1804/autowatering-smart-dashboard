type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

function stringifyArg(arg: unknown): string {
  if (arg instanceof Error) return arg.stack || arg.message || String(arg);
  if (typeof arg === 'string') return arg;
  if (typeof arg === 'number' || typeof arg === 'boolean' || typeof arg === 'bigint') return String(arg);
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';

  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function postToDevServer(level: ConsoleLevel, args: unknown[]) {
  // Same-origin POST so it works on Android live-reload too.
  // Fire-and-forget; don't let logging slow down the app.
  try {
    const payload = JSON.stringify({
      level,
      ts: Date.now(),
      args: args.map(stringifyArg),
    });

    // sendBeacon is often more reliable on mobile WebView.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      const ok = navigator.sendBeacon('/__console', blob);
      if (ok) return;
    }

    void fetch('/__console', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // ignore
    });
  } catch {
    // ignore
  }
}

export function installConsoleForwarder(): void {
  const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug'];

  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      postToDevServer(level, args);
    };
  }
}
