/// <reference types="vitest" />
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock BleClient from Capacitor
vi.mock('@capacitor-community/bluetooth-le', () => ({
    BleClient: {
        initialize: vi.fn().mockResolvedValue(undefined),
        isEnabled: vi.fn().mockResolvedValue(true),
        requestLEScan: vi.fn().mockResolvedValue(undefined),
        requestDevice: vi.fn().mockResolvedValue({ deviceId: 'mock-device', name: 'AutoWatering_001' }),
        stopLEScan: vi.fn().mockResolvedValue(undefined),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        read: vi.fn().mockResolvedValue(new DataView(new ArrayBuffer(0))),
        write: vi.fn().mockResolvedValue(undefined),
        startNotifications: vi.fn().mockResolvedValue(undefined),
        stopNotifications: vi.fn().mockResolvedValue(undefined),
    }
}));

// Mock Ionic components that use native features
vi.mock('@ionic/react', async () => {
    const actual = await vi.importActual('@ionic/react');
    return {
        ...actual,
        isPlatform: vi.fn().mockReturnValue(false),
        setupIonicReact: vi.fn(),
    };
});

// Mock window.matchMedia
if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

// Mock ResizeObserver
if (typeof global !== 'undefined') {
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
    }));
}
