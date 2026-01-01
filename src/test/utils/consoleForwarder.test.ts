import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { installConsoleForwarder } from '../../utils/consoleForwarder';

describe('consoleForwarder', () => {
    let originalConsole: {
        log: typeof console.log;
        info: typeof console.info;
        warn: typeof console.warn;
        error: typeof console.error;
        debug: typeof console.debug;
    };
    let mockFetch: ReturnType<typeof vi.fn>;
    let mockSendBeacon: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Save original console methods
        originalConsole = {
            log: console.log,
            info: console.info,
            warn: console.warn,
            error: console.error,
            debug: console.debug,
        };

        // Mock fetch
        mockFetch = vi.fn().mockResolvedValue({ ok: true });
        global.fetch = mockFetch;

        // Mock sendBeacon
        mockSendBeacon = vi.fn().mockReturnValue(true);
        Object.defineProperty(navigator, 'sendBeacon', {
            value: mockSendBeacon,
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        // Restore original console methods
        console.log = originalConsole.log;
        console.info = originalConsole.info;
        console.warn = originalConsole.warn;
        console.error = originalConsole.error;
        console.debug = originalConsole.debug;

        vi.restoreAllMocks();
    });

    describe('installConsoleForwarder', () => {
        it('should wrap all console levels', () => {
            const originalLog = console.log;
            const originalInfo = console.info;
            const originalWarn = console.warn;
            const originalError = console.error;
            const originalDebug = console.debug;

            installConsoleForwarder();

            expect(console.log).not.toBe(originalLog);
            expect(console.info).not.toBe(originalInfo);
            expect(console.warn).not.toBe(originalWarn);
            expect(console.error).not.toBe(originalError);
            expect(console.debug).not.toBe(originalDebug);
        });

        it('should call original console method', () => {
            const originalLog = vi.fn();
            console.log = originalLog;

            installConsoleForwarder();
            console.log('test message');

            expect(originalLog).toHaveBeenCalledWith('test message');
        });

        it('should use sendBeacon when available', () => {
            installConsoleForwarder();
            console.log('test message');

            expect(mockSendBeacon).toHaveBeenCalledWith(
                '/__console',
                expect.any(Blob)
            );
        });

        it('should fall back to fetch when sendBeacon returns false', () => {
            mockSendBeacon.mockReturnValue(false);

            installConsoleForwarder();
            console.log('test message');

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    keepalive: true,
                })
            );
        });

        it('should handle different log levels', () => {
            installConsoleForwarder();

            console.log('log message');
            console.info('info message');
            console.warn('warn message');
            console.error('error message');
            console.debug('debug message');

            expect(mockSendBeacon).toHaveBeenCalledTimes(5);
        });
    });

    describe('stringifyArg (via console forwarding)', () => {
        beforeEach(() => {
            // Force fetch path to inspect payload
            mockSendBeacon.mockReturnValue(false);
        });

        it('should stringify string arguments', () => {
            installConsoleForwarder();
            console.log('hello world');

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('"hello world"'),
                })
            );
        });

        it('should stringify numbers', () => {
            installConsoleForwarder();
            console.log(42);

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('"42"'),
                })
            );
        });

        it('should stringify booleans', () => {
            installConsoleForwarder();
            console.log(true);

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('"true"'),
                })
            );
        });

        it('should stringify null', () => {
            installConsoleForwarder();
            console.log(null);

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('"null"'),
                })
            );
        });

        it('should stringify undefined', () => {
            installConsoleForwarder();
            console.log(undefined);

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('"undefined"'),
                })
            );
        });

        it('should stringify objects', () => {
            installConsoleForwarder();
            console.log({ key: 'value' });

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('key'),
                })
            );
        });

        it('should stringify Error objects with stack', () => {
            const error = new Error('test error');
            installConsoleForwarder();
            console.error(error);

            expect(mockFetch).toHaveBeenCalledWith(
                '/__console',
                expect.objectContaining({
                    body: expect.stringContaining('test error'),
                })
            );
        });

        it('should handle multiple arguments', () => {
            installConsoleForwarder();
            console.log('message', 42, { foo: 'bar' });

            const call = mockFetch.mock.calls[0];
            const body = JSON.parse(call[1].body);

            expect(body.args).toHaveLength(3);
        });
    });

    describe('error handling', () => {
        it('should not throw when sendBeacon fails', () => {
            mockSendBeacon.mockImplementation(() => {
                throw new Error('sendBeacon failed');
            });

            installConsoleForwarder();

            expect(() => console.log('test')).not.toThrow();
        });

        it('should not throw when fetch fails', () => {
            mockSendBeacon.mockReturnValue(false);
            mockFetch.mockRejectedValue(new Error('fetch failed'));

            installConsoleForwarder();

            expect(() => console.log('test')).not.toThrow();
        });

        it('should handle circular references in objects', () => {
            const circular: any = { a: 1 };
            circular.self = circular;

            mockSendBeacon.mockReturnValue(false);
            installConsoleForwarder();

            // Should not throw
            expect(() => console.log(circular)).not.toThrow();
        });
    });

    describe('payload structure', () => {
        beforeEach(() => {
            mockSendBeacon.mockReturnValue(false);
        });

        it('should include level in payload', () => {
            installConsoleForwarder();
            console.warn('warning');

            const call = mockFetch.mock.calls[0];
            const body = JSON.parse(call[1].body);

            expect(body.level).toBe('warn');
        });

        it('should include timestamp in payload', () => {
            const now = Date.now();
            vi.spyOn(Date, 'now').mockReturnValue(now);

            installConsoleForwarder();
            console.log('test');

            const call = mockFetch.mock.calls[0];
            const body = JSON.parse(call[1].body);

            expect(body.ts).toBe(now);
        });

        it('should include args array in payload', () => {
            installConsoleForwarder();
            console.log('arg1', 'arg2');

            const call = mockFetch.mock.calls[0];
            const body = JSON.parse(call[1].body);

            expect(Array.isArray(body.args)).toBe(true);
            expect(body.args).toContain('arg1');
            expect(body.args).toContain('arg2');
        });
    });
});
