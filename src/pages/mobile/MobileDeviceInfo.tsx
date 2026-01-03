import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import MobileConfirmModal from '../../components/mobile/MobileConfirmModal';
import { useI18n } from '../../i18n';

const MobileDeviceInfo: React.FC = () => {
  const history = useHistory();
  const { connectionState } = useAppStore();
  const [showRebootModal, setShowRebootModal] = useState(false);
  const { t } = useI18n();

  const isConnected = connectionState === 'connected';
  
  // Mock device info - in real app would come from BLE device
  const deviceData = {
    name: 'AutoWater Pro',
    model: 'AutoWater Pro V2',
    firmware: '2.4.1',
    serial: '88:A1:C5:9E:2B',
    signalStrength: -42,
    uptime: '14d 3h 12m',
  };

  const getSignalLabel = (dbm: number) => {
    if (dbm >= -50) return { label: t('mobileDeviceInfo.signalExcellent'), color: 'text-mobile-primary' };
    if (dbm >= -60) return { label: t('mobileDeviceInfo.signalGood'), color: 'text-mobile-primary' };
    if (dbm >= -70) return { label: t('mobileDeviceInfo.signalFair'), color: 'text-amber-400' };
    return { label: t('mobileDeviceInfo.signalWeak'), color: 'text-red-400' };
  };

  const signal = getSignalLabel(deviceData.signalStrength);

  const handleReboot = () => {
    // In real app would send reboot command via BLE
    console.log('Rebooting device...');
    setShowRebootModal(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could show a toast here
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark p-4 pb-2 justify-between">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          {t('mobileDeviceInfo.title')}
        </h2>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 gap-6 pb-8 overflow-y-auto">
        {/* Device Identity Card */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="relative group">
            <div 
              className="bg-center bg-no-repeat bg-cover rounded-full h-32 w-32 shadow-lg ring-4 ring-white/5"
              style={{ 
                backgroundImage: 'linear-gradient(135deg, #1a2e1e 0%, #102213 100%)',
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-mobile-primary text-5xl">water_drop</span>
              </div>
            </div>
            <button className="absolute bottom-0 right-0 bg-mobile-surface-dark p-2 rounded-full shadow-md border border-white/10">
              <span className="material-symbols-outlined text-mobile-primary text-xl">edit</span>
            </button>
          </div>
          
          <div className="flex flex-col items-center mt-4 gap-1">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-center text-white">
              {deviceData.name}
            </h1>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${isConnected ? 'bg-mobile-primary/10 border border-mobile-primary/20' : 'bg-red-500/10 border border-red-500/20'}`}>
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-mobile-primary animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-sm font-semibold ${isConnected ? 'text-mobile-primary' : 'text-red-400'}`}>
                {isConnected ? t('deviceSelector.online') : t('deviceSelector.offline')}
              </span>
            </div>
          </div>
        </div>

        {/* Section: System Status */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('mobileDeviceInfo.systemStatus')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {/* Signal Strength */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <span className="material-symbols-outlined text-xl">wifi</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileDeviceInfo.signalStrength')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-semibold ${signal.color}`}>{signal.label}</span>
                <span className="text-mobile-text-muted text-sm">({deviceData.signalStrength} dBm)</span>
              </div>
            </div>

            {/* Uptime */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <span className="material-symbols-outlined text-xl">timer</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileDeviceInfo.uptime')}</span>
              </div>
              <span className="text-sm font-medium text-gray-300">{deviceData.uptime}</span>
            </div>

            {/* Model */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-400">
                  <span className="material-symbols-outlined text-xl">router</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileDeviceInfo.model')}</span>
              </div>
              <span className="text-sm font-medium text-gray-300">{deviceData.model}</span>
            </div>
          </div>
        </div>

        {/* Section: Software & Hardware */}
        <div className="flex flex-col gap-2">
          <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
            {t('mobileDeviceInfo.softwareHardware')}
          </h3>
          <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {/* Firmware */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-400">
                  <span className="material-symbols-outlined text-xl">memory</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileDeviceInfo.firmwareVersion')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-300">v{deviceData.firmware}</span>
                <div className="w-2 h-2 rounded-full bg-mobile-primary" />
              </div>
            </div>

            {/* Serial Number */}
            <button 
              onClick={() => copyToClipboard(deviceData.serial)}
              className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400">
                  <span className="material-symbols-outlined text-xl">fingerprint</span>
                </div>
                <span className="text-base font-medium text-white">{t('mobileDeviceInfo.serialNumber')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-mobile-text-muted">{deviceData.serial}</span>
                <span className="material-symbols-outlined text-base text-mobile-text-muted group-hover:text-mobile-primary transition-colors">
                  content_copy
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          <button 
            onClick={() => history.push('/settings/device/update')}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-full h-14 px-5 
                     bg-mobile-primary hover:bg-green-400 active:scale-[0.98] transition-all 
                     text-mobile-bg-dark text-base font-bold shadow-lg shadow-mobile-primary/20"
          >
            <span className="material-symbols-outlined mr-2">system_update</span>
            <span>{t('mobileDeviceInfo.checkUpdates')}</span>
          </button>
          
          <button 
            onClick={() => setShowRebootModal(true)}
            className="relative flex w-full items-center justify-center overflow-hidden rounded-full h-14 px-5 
                     bg-white/5 border border-transparent hover:border-red-500/30 
                     text-red-400 text-base font-semibold active:scale-[0.98] transition-all"
          >
            <span className="material-symbols-outlined mr-2">restart_alt</span>
            <span>{t('mobileDeviceInfo.rebootDevice')}</span>
          </button>
        </div>
      </main>

      {/* Reboot Confirmation Modal */}
      <MobileConfirmModal
        isOpen={showRebootModal}
        onClose={() => setShowRebootModal(false)}
        onConfirm={handleReboot}
        title={t('mobileDeviceInfo.rebootTitle')}
        message={t('mobileDeviceInfo.rebootMessage')}
        confirmText={t('mobileDeviceInfo.rebootConfirm')}
        cancelText={t('common.cancel')}
        icon="restart_alt"
        variant="warning"
      />
    </div>
  );
};

export default MobileDeviceInfo;
