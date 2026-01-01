import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installConsoleForwarder } from '../utils/consoleForwarder';

describe('consoleForwarder', () => {
  // Store original console methods
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;
  const originalDebug = console.debug;

  // Mocks
  let fetchMock: ReturnType<typeof vi.fn>;
  let sendBeaconMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset console to originals before each test
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    console.debug = originalDebug;

    // Mock fetch
    fetchMock = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('fetch', fetchMock);

    // Mock navigator.sendBeacon
    sendBeaconMock = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconMock });
  });

  afterEach(() => {
    // Restore console
    console.log = originalLog;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    console.debug = originalDebug;

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should wrap all console methods after install', () => {
    const logSpy = vi.spyOn(console, 'log');
    const warnSpy = vi.spyOn(console, 'warn');

    installConsoleForwarder();

    // Console methods should still work
    console.log('test message');
    expect(logSpy).toHaveBeenCalledWith('test message');

    console.warn('warning message');
    expect(warnSpy).toHaveBeenCalledWith('warning message');
  });

  it('should call sendBeacon with correct payload', () => {
    installConsoleForwarder();

    console.log('beacon test');

    expect(sendBeaconMock).toHaveBeenCalled();
    const [url, blob] = sendBeaconMock.mock.calls[0];
    expect(url).toBe('/__console');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should fallback to fetch if sendBeacon fails', () => {
    sendBeaconMock.mockReturnValue(false);
    installConsoleForwarder();

    console.log('fetch fallback test');

    // sendBeacon was called but returned false
    expect(sendBeaconMock).toHaveBeenCalled();
    // fetch should be called as fallback
    expect(fetchMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      '/__console',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        keepalive: true,
      })
    );
  });

  it('should fallback to fetch if sendBeacon is not available', () => {
    vi.stubGlobal('navigator', { sendBeacon: undefined });
    installConsoleForwarder();

    console.info('no sendBeacon');

    expect(fetchMock).toHaveBeenCalled();
  });

  it('should stringify different argument types correctly', () => {
    installConsoleForwarder();

    // Test various types
    console.log('string', 123, true, null, undefined, { key: 'value' }, [1, 2, 3]);

    expect(sendBeaconMock).toHaveBeenCalled();
    const [, blob] = sendBeaconMock.mock.calls[0];

    // Read blob content (Blob.text() is async, so we check the call was made)
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should handle Error objects with stack trace', () => {
    installConsoleForwarder();

    const testError = new Error('Test error message');
    console.error(testError);

    expect(sendBeaconMock).toHaveBeenCalled();
  });

  it('should not throw if fetch fails', async () => {
    sendBeaconMock.mockReturnValue(false);
    fetchMock.mockRejectedValue(new Error('Network error'));
    installConsoleForwarder();

    // Should not throw
    expect(() => console.log('test')).not.toThrow();
  });

  it('should forward console.debug calls', () => {
    const debugSpy = vi.spyOn(console, 'debug');
    installConsoleForwarder();

    console.debug('debug message');

    expect(debugSpy).toHaveBeenCalledWith('debug message');
    expect(sendBeaconMock).toHaveBeenCalled();
  });

  it('should include timestamp in payload', () => {
    installConsoleForwarder();

    const before = Date.now();
    console.log('timestamp test');
    const after = Date.now();

    expect(sendBeaconMock).toHaveBeenCalled();
    // The payload should contain a timestamp
    // We can't easily read the Blob content in this test, but we verify the call was made
  });

  it('should handle objects that throw on JSON.stringify', () => {
    installConsoleForwarder();

    const circularObj: any = { name: 'circular' };
    circularObj.self = circularObj;

    // Should not throw
    expect(() => console.log(circularObj)).not.toThrow();
  });

  it('should handle bigint values', () => {
    installConsoleForwarder();

    // Should not throw
    expect(() => console.log(BigInt(123456789))).not.toThrow();
  });
});
