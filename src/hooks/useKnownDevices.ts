/**
 * Hook for managing known/saved BLE devices with localStorage persistence
 * Supports multiple devices and auto-connect to last used device
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'autowater_known_devices';
const LAST_DEVICE_KEY = 'autowater_last_device';

export interface KnownDevice {
  id: string;           // BLE device ID
  name: string;         // User-friendly name (can be renamed)
  originalName: string; // Original BLE advertised name
  addedAt: number;      // Timestamp when added
  lastConnected: number; // Timestamp of last successful connection
}

interface KnownDevicesState {
  devices: KnownDevice[];
  lastDeviceId: string | null;
}

function loadFromStorage(): KnownDevicesState {
  try {
    const devicesJson = localStorage.getItem(STORAGE_KEY);
    const lastDeviceId = localStorage.getItem(LAST_DEVICE_KEY);
    const devices: KnownDevice[] = devicesJson ? JSON.parse(devicesJson) : [];
    return { devices, lastDeviceId };
  } catch (e) {
    console.warn('Failed to load known devices from localStorage:', e);
    return { devices: [], lastDeviceId: null };
  }
}

function saveDevices(devices: KnownDevice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(devices));
  } catch (e) {
    console.warn('Failed to save known devices to localStorage:', e);
  }
}

function saveLastDevice(deviceId: string | null): void {
  try {
    if (deviceId) {
      localStorage.setItem(LAST_DEVICE_KEY, deviceId);
    } else {
      localStorage.removeItem(LAST_DEVICE_KEY);
    }
  } catch (e) {
    console.warn('Failed to save last device to localStorage:', e);
  }
}

/**
 * Hook for managing known BLE devices
 */
export function useKnownDevices() {
  const [devices, setDevices] = useState<KnownDevice[]>([]);
  const [lastDeviceId, setLastDeviceId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    const state = loadFromStorage();
    setDevices(state.devices);
    setLastDeviceId(state.lastDeviceId);
    setIsLoaded(true);
  }, []);

  // Add or update a device
  const addDevice = useCallback((id: string, name: string) => {
    setDevices(prev => {
      const existing = prev.find(d => d.id === id);
      const now = Date.now();
      
      let updated: KnownDevice[];
      if (existing) {
        // Update existing device
        updated = prev.map(d => 
          d.id === id 
            ? { ...d, lastConnected: now }
            : d
        );
      } else {
        // Add new device
        const newDevice: KnownDevice = {
          id,
          name: name || `Device ${prev.length + 1}`,
          originalName: name,
          addedAt: now,
          lastConnected: now,
        };
        updated = [...prev, newDevice];
      }
      
      saveDevices(updated);
      return updated;
    });

    // Also set as last used
    setLastDeviceId(id);
    saveLastDevice(id);
  }, []);

  // Remove a device
  const removeDevice = useCallback((id: string) => {
    setDevices(prev => {
      const updated = prev.filter(d => d.id !== id);
      saveDevices(updated);
      return updated;
    });

    // Clear last device if it was removed
    if (lastDeviceId === id) {
      setLastDeviceId(null);
      saveLastDevice(null);
    }
  }, [lastDeviceId]);

  // Rename a device
  const renameDevice = useCallback((id: string, newName: string) => {
    setDevices(prev => {
      const now = Date.now();
      const existing = prev.find(d => d.id === id);

      const updated = existing
        ? prev.map(d => (d.id === id ? { ...d, name: newName } : d))
        : [
            ...prev,
            {
              id,
              name: newName,
              originalName: '',
              addedAt: now,
              lastConnected: now,
            } satisfies KnownDevice,
          ];
      saveDevices(updated);
      return updated;
    });
  }, []);

  // Set a device as the last connected
  const setAsLastConnected = useCallback((id: string) => {
    setDevices(prev => {
      const now = Date.now();
      const existing = prev.find(d => d.id === id);
      const updated = existing
        ? prev.map(d => (d.id === id ? { ...d, lastConnected: now } : d))
        : [
            ...prev,
            {
              id,
              name: `Device ${prev.length + 1}`,
              originalName: '',
              addedAt: now,
              lastConnected: now,
            } satisfies KnownDevice,
          ];
      saveDevices(updated);
      return updated;
    });
    setLastDeviceId(id);
    saveLastDevice(id);
  }, []);

  // Clear last connected device (prevents auto-connect loops)
  const clearLastDevice = useCallback(() => {
    setLastDeviceId(null);
    saveLastDevice(null);
  }, []);

  // Get last device info
  const lastDevice = devices.find(d => d.id === lastDeviceId) || null;

  // Get devices sorted by last connected (most recent first)
  const sortedDevices = [...devices].sort((a, b) => b.lastConnected - a.lastConnected);

  return {
    devices: sortedDevices,
    lastDevice,
    lastDeviceId,
    isLoaded,
    addDevice,
    removeDevice,
    renameDevice,
    setAsLastConnected,
    clearLastDevice,
  };
}
