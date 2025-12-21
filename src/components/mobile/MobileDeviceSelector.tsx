import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Device {
  id: string;
  name: string;
  isConnected: boolean;
  batteryLevel?: number;
  signalStrength?: number;
  lastSeen?: Date;
}

interface MobileDeviceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deviceId: string) => void;
  devices: Device[];
  currentDeviceId?: string;
}

const MobileDeviceSelector: React.FC<MobileDeviceSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  devices,
  currentDeviceId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDevices = devices.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (deviceId: string) => {
    onSelect(deviceId);
    onClose();
  };

  const getSignalIcon = (strength?: number) => {
    if (!strength) return 'signal_cellular_0_bar';
    if (strength >= 80) return 'signal_cellular_alt';
    if (strength >= 50) return 'signal_cellular_alt_2_bar';
    if (strength >= 20) return 'signal_cellular_alt_1_bar';
    return 'signal_cellular_0_bar';
  };

  const getBatteryIcon = (level?: number) => {
    if (!level) return 'battery_unknown';
    if (level >= 90) return 'battery_full';
    if (level >= 60) return 'battery_5_bar';
    if (level >= 40) return 'battery_3_bar';
    if (level >= 20) return 'battery_2_bar';
    return 'battery_1_bar';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-h-[80vh] flex flex-col bg-mobile-surface-dark rounded-3xl border border-mobile-border-dark overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: '-45%' }}
            transition={{ type: 'spring', duration: 0.3 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-mobile-border-dark">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-xl font-bold">Select Device</h3>
                <button
                  onClick={onClose}
                  className="size-10 rounded-full bg-white/5 flex items-center justify-center text-mobile-text-muted hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-mobile-text-muted">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search devices..."
                  className="w-full h-12 bg-mobile-bg-dark border border-mobile-border-dark rounded-xl pl-12 pr-4 text-white placeholder:text-mobile-text-muted focus:outline-none focus:border-mobile-primary"
                />
              </div>
            </div>

            {/* Device List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="size-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-mobile-text-muted text-3xl">devices</span>
                  </div>
                  <p className="text-mobile-text-muted">No devices found</p>
                </div>
              ) : (
                filteredDevices.map(device => (
                  <button
                    key={device.id}
                    onClick={() => handleSelect(device.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      device.id === currentDeviceId
                        ? 'bg-mobile-primary/10 border-mobile-primary'
                        : 'bg-mobile-bg-dark border-mobile-border-dark hover:border-mobile-primary/50'
                    }`}
                  >
                    {/* Device Icon */}
                    <div className={`relative size-14 rounded-full flex items-center justify-center shrink-0 ${
                      device.isConnected ? 'bg-mobile-primary/20' : 'bg-white/5'
                    }`}>
                      <span className={`material-symbols-outlined text-2xl ${
                        device.isConnected ? 'text-mobile-primary' : 'text-mobile-text-muted'
                      }`}>
                        smart_toy
                      </span>
                      {device.isConnected && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-mobile-primary">
                          <span className="material-symbols-outlined text-mobile-bg-dark text-xs">check</span>
                        </span>
                      )}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-white font-bold">{device.name}</h4>
                        {device.id === currentDeviceId && (
                          <span className="text-xs bg-mobile-primary/10 text-mobile-primary px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-mobile-text-muted text-sm">
                        {device.isConnected ? (
                          <>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">{getSignalIcon(device.signalStrength)}</span>
                              {device.signalStrength}%
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">{getBatteryIcon(device.batteryLevel)}</span>
                              {device.batteryLevel}%
                            </span>
                          </>
                        ) : (
                          <span className="text-mobile-text-muted">
                            Last seen: {device.lastSeen?.toLocaleTimeString() || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      device.isConnected
                        ? 'bg-mobile-primary/10 text-mobile-primary'
                        : 'bg-white/5 text-mobile-text-muted'
                    }`}>
                      {device.isConnected ? 'Online' : 'Offline'}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-mobile-border-dark">
              <button
                className="w-full flex items-center justify-center gap-2 h-12 rounded-xl border border-dashed border-mobile-border-dark text-mobile-text-muted hover:border-mobile-primary/50 hover:text-mobile-primary transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                Add New Device
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileDeviceSelector;
