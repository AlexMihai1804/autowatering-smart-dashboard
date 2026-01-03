import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useKnownDevices } from '../../hooks/useKnownDevices';
import { BleService } from '../../services/BleService';
import { useI18n } from '../../i18n';

const MobileWelcome: React.FC = () => {
  const history = useHistory();
  const { connectionState, onboardingState } = useAppStore();
  const { devices, lastDevice, isLoaded, clearLastDevice } = useKnownDevices();
  const bleService = BleService.getInstance();
  const { t, language } = useI18n();
  const [isAutoConnecting, setIsAutoConnecting] = useState(false);
  const [autoConnectFailed, setAutoConnectFailed] = useState(false);
  const locale = language === 'ro' ? 'ro-RO' : 'en-US';

  // Auto-redirect if connected.
  // IMPORTANT: BLE sets connectionState='connected' before Phase 2 reads onboarding status.
  // Wait for onboardingState so we can route to onboarding when setup is incomplete.
  useEffect(() => {
    if (connectionState !== 'connected') return;

    // If we haven't received onboarding status yet, don't redirect.
    if (!onboardingState) return;

    // If user has at least one zone configured, go straight to dashboard
    // (don't force them through onboarding wizard every time)
    const hasConfiguredZone = onboardingState.channels_completion_pct > 0;
    const nextPath = hasConfiguredZone ? '/dashboard' : '/onboarding';
    history.replace(nextPath);
  }, [connectionState, onboardingState, history]);

  // Auto-connect to last known device
  useEffect(() => {
    if (!isLoaded || !lastDevice || isAutoConnecting || autoConnectFailed) return;
    if (connectionState === 'connected' || connectionState === 'connecting') return;

    const autoConnect = async () => {
      setIsAutoConnecting(true);
      try {
        await bleService.connect(lastDevice.id);
      } catch (error) {
        console.log('Auto-connect failed, showing manual options:', error);
        const message = (error as any)?.message || String(error);
        // Web BLE cannot connect to an arbitrary cached id without a prior requestDevice.
        // If we hit this, clear lastDeviceId to prevent infinite auto-connect loops across reloads.
        if (message.includes('Device not found') || message.includes('requestDevice') || message.includes('requestLEScan') || message.includes('getDevices')) {
          clearLastDevice();
        }
        setAutoConnectFailed(true);
      } finally {
        setIsAutoConnecting(false);
      }
    };

    // Small delay to let BLE initialize
    const timer = setTimeout(autoConnect, 500);
    return () => clearTimeout(timer);
  }, [isLoaded, lastDevice, connectionState, isAutoConnecting, autoConnectFailed, bleService]);

  const handleSetupDevice = () => {
    history.push('/scan');
  };

  const handleConnectToDevice = async (deviceId: string) => {
    setIsAutoConnecting(true);
    try {
      // Use force=true to ensure we can reconnect even if state thinks we're connected
      await bleService.connect(deviceId, true);
    } catch (error) {
      console.error('Connection failed:', error);
      setAutoConnectFailed(true);
    } finally {
      setIsAutoConnecting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-mobile-bg-dark">
      {/* Background Ambient Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-mobile-primary/20 blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-20%] w-[400px] h-[400px] rounded-full bg-mobile-primary/10 blur-[100px] pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="relative flex flex-1 flex-col justify-between px-4 pb-8 pt-12 safe-area-inset">
        {/* Hero Section */}
        <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
          <div className="relative mb-10 group">
            <div className="absolute inset-0 bg-mobile-primary rounded-full blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative w-64 h-64 overflow-hidden rounded-full shadow-2xl shadow-mobile-primary/20 border-4 border-white/5 bg-mobile-bg-dark/50 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-mobile-primary/20 to-transparent"></div>
              {/* Overlay Icon */}
              <div className="relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-white/5 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <span className="material-symbols-outlined text-mobile-primary text-6xl">water_drop</span>
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="text-center space-y-4 max-w-xs mx-auto z-10">
            <h1 className="text-4xl font-bold tracking-tight text-white">
              {t('mobileWelcome.appName')}
            </h1>
            <p className="text-gray-400 text-lg font-normal leading-relaxed">
              {t('mobileWelcome.tagline')}
            </p>
          </div>
        </div>

        {/* Action Area */}
        <div className="w-full max-w-md mx-auto space-y-4 pt-8">
          {/* Auto-connecting indicator */}
          {isAutoConnecting && lastDevice && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-8 h-8 rounded-full border-2 border-mobile-primary border-t-transparent animate-spin"></div>
              <p className="text-sm text-gray-400">
                {t('mobileWelcome.connectingTo').replace('{name}', lastDevice.name)}
              </p>
            </div>
          )}

          {/* Saved devices list */}
          {!isAutoConnecting && devices.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider text-center font-semibold">{t('mobileWelcome.savedDevices')}</p>
              {devices.map((device) => (
                <button
                  key={device.id}
                  onClick={() => handleConnectToDevice(device.id)}
                  className="group relative flex w-full items-center gap-4 rounded-2xl h-16 bg-mobile-surface-dark border border-mobile-border-dark px-4 hover:border-mobile-primary/50 transition-all active:scale-[0.98]"
                >
                  <div className="w-10 h-10 rounded-full bg-mobile-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-mobile-primary">developer_board</span>
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-base font-semibold text-white">{device.name}</p>
                    <p className="text-xs text-gray-500">
                      {t('mobileWelcome.lastConnected').replace('{date}', new Date(device.lastConnected).toLocaleDateString(locale))}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-gray-400 group-hover:text-mobile-primary transition-colors">chevron_right</span>
                </button>
              ))}
            </div>
          )}

          {/* Primary Button - Add New */}
          <button 
            onClick={handleSetupDevice}
            className={`group relative flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 text-lg font-bold transition-all active:scale-[0.98] ${
              devices.length > 0 
                ? 'bg-mobile-surface-dark border border-mobile-border-dark text-white hover:border-mobile-primary/50' 
                : 'bg-mobile-primary text-mobile-bg-dark shadow-lg shadow-mobile-primary/25 hover:shadow-mobile-primary/40'
            }`}
            disabled={isAutoConnecting}
          >
            <span className="relative flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">add</span>
              {devices.length > 0 ? t('mobileWelcome.addNewDevice') : t('mobileWelcome.setupNewDevice')}
            </span>
          </button>

          {/* Terms / Legal */}
          <p className="text-center text-xs text-gray-600 mt-4 px-8">
            {t('mobileWelcome.terms')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobileWelcome;
