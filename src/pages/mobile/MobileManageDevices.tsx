import React, { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { useKnownDevices } from '../../hooks/useKnownDevices';
import { BleService } from '../../services/BleService';

interface Device {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'standby' | 'offline';
  connectionType: 'bluetooth' | 'wifi';
  signalStrength: 'excellent' | 'good' | 'fair' | 'weak';
  lastSync: string;
  isActive: boolean;
}

const MobileManageDevices: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const bleService = BleService.getInstance();
  const { connectionState, connectedDeviceId, discoveredDevices } = useAppStore();
  const { devices: knownDevices, setAsLastConnected } = useKnownDevices();
  const [switchingDeviceId, setSwitchingDeviceId] = useState<string | null>(null);

  useEffect(() => {
    if (!connectedDeviceId) return;
    if (knownDevices.some((d) => d.id === connectedDeviceId)) return;
    setAsLastConnected(connectedDeviceId);
  }, [connectedDeviceId, knownDevices, setAsLastConnected]);

  const formatLastSync = (lastConnected: number): string => {
    if (!lastConnected) return t('mobileManageDevices.lastSync.justNow');
    const diffMinutes = Math.floor((Date.now() - lastConnected) / 60000);
    if (diffMinutes < 1) return t('mobileManageDevices.lastSync.justNow');
    if (diffMinutes < 60) {
      return t('mobileManageDevices.lastSync.minutesAgo').replace('{count}', String(diffMinutes));
    }
    return t('mobileManageDevices.lastSync.hoursAgo').replace('{count}', String(Math.floor(diffMinutes / 60)));
  };

  const toSignalStrength = (
    status: Device['status'],
    rssi?: number
  ): Device['signalStrength'] => {
    if (typeof rssi === 'number') {
      if (rssi >= -50) return 'excellent';
      if (rssi >= -60) return 'good';
      if (rssi >= -70) return 'fair';
      return 'weak';
    }
    if (status === 'online') return 'good';
    if (status === 'standby') return 'fair';
    return 'weak';
  };

  const formatLocation = (deviceId: string) =>
    `${t('mobileManageDevices.connectionTypes.bluetooth')} ${deviceId.slice(0, 4)}...${deviceId.slice(-4)}`;

  const devices = useMemo<Device[]>(() => {
    const now = Date.now();
    return knownDevices.map((device) => {
      const isActive = connectedDeviceId === device.id && connectionState === 'connected';
      const lastSeenHours = (now - device.lastConnected) / 3600000;
      const status: Device['status'] = isActive ? 'online' : lastSeenHours <= 24 ? 'standby' : 'offline';
      const discovered = discoveredDevices.find((d) => d.deviceId === device.id);

      return {
        id: device.id,
        name: device.name || device.originalName || device.id,
        location: formatLocation(device.id),
        status,
        connectionType: 'bluetooth',
        signalStrength: toSignalStrength(status, discovered?.rssi),
        lastSync: formatLastSync(device.lastConnected),
        isActive
      };
    });
  }, [knownDevices, connectedDeviceId, connectionState, discoveredDevices, t]);

  const activeDevice = devices.find((device) => device.isActive) ?? null;
  const otherDevices = devices.filter((device) => !device.isActive);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'standby': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleSelectDevice = async (deviceId: string) => {
    if (switchingDeviceId) return;
    if (deviceId === connectedDeviceId && connectionState === 'connected') return;

    setSwitchingDeviceId(deviceId);
    try {
      if (connectionState === 'connected' && connectedDeviceId && connectedDeviceId !== deviceId) {
        await bleService.disconnect();
      }
      await bleService.connect(deviceId);
      setAsLastConnected(deviceId);
    } catch (error) {
      console.error('[MobileManageDevices] Failed to switch device:', error);
      const reason = error instanceof Error ? error.message : String(error);
      alert(`${t('common.error')}: ${reason}`);
    } finally {
      setSwitchingDeviceId(null);
    }
  };

  const handleAddDevice = () => {
    history.push('/scan');
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-32">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-mobile-bg-dark/95 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
        <button 
          onClick={() => history.goBack()}
          className="flex size-10 items-center justify-center rounded-full hover:bg-white/5 active:scale-95 transition-all text-white"
        >
          <span className="material-symbols-outlined text-[24px]">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight">{t('mobileManageDevices.title')}</h2>
        <button 
          onClick={handleAddDevice}
          className="flex size-10 items-center justify-center rounded-full bg-mobile-primary/10 hover:bg-mobile-primary/20 text-mobile-primary active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 gap-6">
        {/* Section: Current Device */}
        {activeDevice && (
          <section>
            <h3 className="text-white text-lg font-bold leading-tight tracking-tight mb-4 px-1">{t('mobileManageDevices.currentDevice')}</h3>
            
            {/* Active Device Card */}
            <motion.div 
              layoutId={`device-${activeDevice.id}`}
              className="relative overflow-hidden rounded-xl bg-mobile-card-dark p-5 shadow-[0_0_15px_rgba(19,236,55,0.1)] border border-mobile-primary/30 cursor-pointer transition-transform active:scale-[0.98]"
            >
              {/* Active Badge */}
              <div className="absolute top-0 right-0 p-5">
                <div className="flex items-center gap-1.5 bg-mobile-primary/10 px-3 py-1 rounded-full border border-mobile-primary/20">
                  <span className="relative flex size-2">
                    <span className="animate-ping absolute inline-flex size-full rounded-full bg-mobile-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full size-2 bg-mobile-primary"></span>
                  </span>
                  <span className="text-mobile-primary text-xs font-bold uppercase tracking-wider">{t('mobileManageDevices.activeBadge')}</span>
                </div>
              </div>
              
              <div className="flex flex-col h-full justify-between gap-6">
                <div className="flex gap-4">
                  <div className="size-16 rounded-lg bg-mobile-surface-dark flex items-center justify-center shadow-inner">
                    <span className="material-symbols-outlined text-mobile-primary text-4xl">router</span>
                  </div>
                  <div className="flex flex-col pt-1">
                    <h4 className="text-white text-xl font-bold leading-tight">{activeDevice.name}</h4>
                    <p className="text-mobile-text-muted text-sm font-medium mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">
                        {activeDevice.connectionType === 'wifi' ? 'wifi' : 'bluetooth'}
                      </span>
                      {t('mobileManageDevices.connectedVia')
                        .replace('{type}', activeDevice.connectionType === 'wifi'
                          ? t('mobileManageDevices.connectionTypes.wifi')
                          : t('mobileManageDevices.connectionTypes.bluetooth'))}
                    </p>
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 flex flex-col">
                    <span className="text-mobile-text-muted text-xs">{t('mobileManageDevices.lastSync.label')}</span>
                    <span className="text-white font-semibold text-sm">{activeDevice.lastSync}</span>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 flex flex-col">
                    <span className="text-mobile-text-muted text-xs">{t('mobileManageDevices.signalStrength.label')}</span>
                    <span className="text-mobile-primary font-semibold text-sm">
                      {t(`mobileManageDevices.signalStrength.${activeDevice.signalStrength}`)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </section>
        )}

        {/* Section: Other Devices */}
        {otherDevices.length > 0 && (
          <section className="flex flex-col gap-3">
            <h3 className="text-white text-lg font-bold leading-tight tracking-tight mb-1 px-1">{t('mobileManageDevices.otherDevices')}</h3>
            
            <AnimatePresence>
                {otherDevices.map((device) => (
                <motion.div
                  key={device.id}
                  layoutId={`device-${device.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => void handleSelectDevice(device.id)}
                  className={`group flex items-center justify-between gap-4 rounded-xl bg-mobile-card-dark p-3 pr-4 active:bg-white/5 transition-colors cursor-pointer border border-white/5 hover:border-white/10 ${device.status === 'offline' ? 'opacity-75' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`size-14 rounded-lg bg-mobile-surface-dark flex items-center justify-center ${device.status === 'offline' ? 'grayscale' : ''}`}>
                      <span className="material-symbols-outlined text-mobile-primary text-3xl">router</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-white text-base font-semibold leading-normal line-clamp-1">{device.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`size-1.5 rounded-full ${getStatusColor(device.status)}`}></span>
                        <p className="text-mobile-text-muted text-sm font-normal leading-normal capitalize">
                          {t('mobileManageDevices.deviceLine')
                            .replace('{status}', t(`mobileManageDevices.status.${device.status}`))
                            .replace('{location}', device.location)}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    disabled={!!switchingDeviceId}
                    className="shrink-0 flex items-center justify-center size-8 rounded-full bg-white/5 text-white group-hover:bg-mobile-primary group-hover:text-black transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {switchingDeviceId === device.id ? 'sync' : 'arrow_forward_ios'}
                    </span>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </section>
        )}

        {/* Add Device Button */}
        <div className="mt-4">
          <button 
            onClick={handleAddDevice}
            className="w-full h-14 rounded-full border-2 border-mobile-primary text-mobile-primary font-bold text-base tracking-wide active:bg-mobile-primary active:text-black transition-all flex items-center justify-center gap-2 hover:bg-mobile-primary/10"
          >
            <span className="material-symbols-outlined">add_circle</span>
            {t('mobileManageDevices.addController')}
          </button>
        </div>

        {/* Empty State */}
        {devices.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center py-20">
            <div className="size-24 rounded-full bg-mobile-surface-dark flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-mobile-text-muted text-5xl">router</span>
            </div>
            <h3 className="text-white text-xl font-bold mb-2">{t('mobileManageDevices.emptyTitle')}</h3>
            <p className="text-mobile-text-muted text-sm text-center max-w-[250px]">
              {t('mobileManageDevices.emptyMessage')}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default MobileManageDevices;

