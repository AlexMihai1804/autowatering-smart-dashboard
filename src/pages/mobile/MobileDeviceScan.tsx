import React, { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { BleService } from '../../services/BleService';
import { useAppStore } from '../../store/useAppStore';
import { useKnownDevices } from '../../hooks/useKnownDevices';
import { useI18n } from '../../i18n';

interface DiscoveredDevice {
  deviceId: string;
  name?: string;
  rssi?: number;
}

const MobileDeviceScan: React.FC = () => {
  const history = useHistory();
  const { connectionState, discoveredDevices, connectedDeviceId, onboardingState } = useAppStore();
  const bleService = BleService.getInstance();
  const { addDevice } = useKnownDevices();
  const { t } = useI18n();
  const [isScanning, setIsScanning] = useState(false);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [lastConnectedName, setLastConnectedName] = useState<string | null>(null);
  const didSaveDeviceRef = useRef(false);

  // Start scanning on mount
  useEffect(() => {
    startScan();
    return () => {
      // Stop scan on unmount if needed
    };
  }, []);

  // Save device on successful connection (once)
  useEffect(() => {
    if (connectionState === 'connected' && connectedDeviceId) {
      if (!didSaveDeviceRef.current) {
        addDevice(connectedDeviceId, lastConnectedName || t('mobileDeviceScan.defaultDeviceName'));
        didSaveDeviceRef.current = true;
      }
    }
  }, [connectionState, connectedDeviceId, addDevice, lastConnectedName]);

  // Redirect once we know onboarding completion
  useEffect(() => {
    if (connectionState !== 'connected') return;
    if (!onboardingState) return;

    // If user has at least one zone configured, go straight to dashboard
    const hasConfiguredZone = onboardingState.channels_completion_pct > 0;
    const nextPath = hasConfiguredZone ? '/dashboard' : '/onboarding';
    history.replace(nextPath);
  }, [connectionState, onboardingState, history]);

  const startScan = async () => {
    setIsScanning(true);
    try {
      await bleService.scan();
    } catch (error) {
      console.error('Scan failed:', error);
    }
    setTimeout(() => setIsScanning(false), 5000);
  };

  const handleConnect = async (device: DiscoveredDevice) => {
    setConnectingTo(device.deviceId);
    setLastConnectedName(device.name || null);
    try {
      // Use force=true to handle any stale connection state
      await bleService.connect(device.deviceId, true);
    } catch (error) {
      console.error('Connection failed:', error);
      setConnectingTo(null);
      setLastConnectedName(null);
    }
  };

  const getSignalStrength = (rssi?: number): { icon: string; label: string; color: string } => {
    if (!rssi) return { icon: 'wifi', label: t('mobileDeviceScan.signal.unknown'), color: 'text-gray-400' };
    if (rssi >= -50) return { icon: 'wifi', label: t('mobileDeviceScan.signal.excellent'), color: 'text-green-500' };
    if (rssi >= -60) return { icon: 'wifi', label: t('mobileDeviceScan.signal.strong'), color: 'text-green-400' };
    if (rssi >= -70) return { icon: 'wifi_2_bar', label: t('mobileDeviceScan.signal.fair'), color: 'text-yellow-500' };
    return { icon: 'wifi_1_bar', label: t('mobileDeviceScan.signal.weak'), color: 'text-red-400' };
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-mobile-bg-dark max-w-md mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-mobile-bg-dark z-10 sticky top-0 safe-area-top">
        <button 
          onClick={() => history.goBack()}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">{t('mobileDeviceScan.title')}</h2>
        <button 
          onClick={() => history.goBack()}
          className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[24px]">close</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 pb-24">
        {/* Scanning Visualizer */}
        <div className="flex flex-col items-center justify-center py-10 relative">
          {/* Radar Animation Background */}
          {isScanning && (
            <div className="absolute flex items-center justify-center inset-0 z-0 overflow-hidden">
              <div className="absolute w-32 h-32 rounded-full border border-mobile-primary/30 animate-ping"></div>
              <div className="absolute w-32 h-32 rounded-full border border-mobile-primary/20 animate-ping" style={{ animationDelay: '0.5s' }}></div>
            </div>
          )}
          
          {/* Center Icon */}
          <div className="relative z-10 bg-mobile-surface-dark shadow-xl rounded-full w-24 h-24 flex items-center justify-center mb-6 ring-4 ring-mobile-primary/10">
            <span className={`material-symbols-outlined text-mobile-primary text-[40px] ${isScanning ? 'animate-pulse' : ''}`}>
              {isScanning ? 'bluetooth_searching' : 'bluetooth'}
            </span>
          </div>
          
          <div className="relative z-10 text-center space-y-2">
            <h3 className="text-xl font-bold tracking-tight">
              {isScanning ? t('mobileDeviceScan.scanning') : t('mobileDeviceScan.scanComplete')}
            </h3>
            <p className="text-sm text-gray-400 max-w-[280px] mx-auto leading-relaxed">
              {t('mobileDeviceScan.scanHint')}
            </p>
          </div>
        </div>

        {/* Found Devices Section */}
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              {t('mobileDeviceScan.availableDevices').replace('{count}', discoveredDevices.length.toString())}
            </h4>
            {isScanning && (
              <div className="w-4 h-4 rounded-full border-2 border-mobile-primary border-t-transparent animate-spin"></div>
            )}
          </div>

          {discoveredDevices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <span className="material-symbols-outlined text-5xl mb-4 block opacity-50">devices</span>
              <p>{isScanning ? t('mobileDeviceScan.looking') : t('mobileDeviceScan.noneFound')}</p>
            </div>
          ) : (
            discoveredDevices.map((device) => {
              const signal = getSignalStrength(device.rssi);
              const isConnecting = connectingTo === device.deviceId;
              
              return (
                <div 
                  key={device.deviceId}
                  className="group flex items-center gap-4 bg-mobile-surface-dark p-4 rounded-xl border border-transparent hover:border-mobile-primary/50 transition-all shadow-sm"
                >
                  <div className="flex items-center justify-center rounded-full bg-mobile-primary/10 shrink-0 w-12 h-12 text-mobile-primary">
                    <span className="material-symbols-outlined text-[24px]">water_drop</span>
                  </div>
                  
                  <div className="flex flex-col flex-1 min-w-0">
                    <p className="text-base font-bold leading-tight truncate">
                      {device.name || t('mobileDeviceScan.defaultDeviceName')}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`material-symbols-outlined text-[16px] ${signal.color}`}>{signal.icon}</span>
                      <span className="text-gray-400 text-xs font-medium">
                        {t('mobileDeviceScan.signalLabel').replace('{label}', signal.label)}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleConnect(device)}
                    disabled={isConnecting || connectionState === 'connecting'}
                    className={`shrink-0 flex items-center justify-center rounded-full h-9 px-5 text-sm font-bold transition-all ${
                      isConnecting 
                        ? 'bg-mobile-primary/50 text-mobile-bg-dark cursor-wait'
                        : 'bg-mobile-primary hover:brightness-110 text-mobile-bg-dark shadow-lg shadow-mobile-primary/20 active:scale-95'
                    }`}
                  >
                    {isConnecting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-mobile-bg-dark/30 border-t-mobile-bg-dark rounded-full animate-spin mr-2"></span>
                        {t('mobileDeviceScan.connecting')}
                      </>
                    ) : (
                      t('mobileDeviceScan.connect')
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Helper Text / Troubleshooting */}
        <div className="mt-8 flex justify-center">
          <button className="text-sm font-medium text-mobile-primary hover:text-green-400 flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[18px]">help</span>
            {t('mobileDeviceScan.cantFind')}
          </button>
        </div>
      </main>

      {/* Sticky Bottom Action (Scan Again) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-mobile-bg-dark via-mobile-bg-dark to-transparent pt-12 max-w-md mx-auto safe-area-bottom">
        <button 
          onClick={startScan}
          disabled={isScanning}
          className="w-full h-12 flex items-center justify-center gap-2 rounded-full bg-mobile-surface-dark border border-mobile-border-dark hover:bg-white/5 active:scale-[0.98] transition-all shadow-lg text-white font-bold text-base disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-[20px] ${isScanning ? 'animate-spin' : ''}`}>
            refresh
          </span>
          {isScanning ? t('mobileDeviceScan.scanningShort') : t('mobileDeviceScan.restartScan')}
        </button>
      </div>
    </div>
  );
};

export default MobileDeviceScan;
