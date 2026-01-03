import React, { useState, useEffect, useMemo } from 'react';
import { IonContent, IonPage, IonButton, IonIcon, IonProgressBar, IonToast } from '@ionic/react';
import { power, water, leaf, settings } from 'ionicons/icons';
import { useAppStore } from '../store/useAppStore';
import { BleService } from '../services/BleService';
import { SystemStatus, TaskStatus, SYSTEM_FLAG, hasSystemFlag, hasAnyConfiguredChannel } from '../types/firmware_structs';
import OnboardingWizard from '../components/OnboardingWizard';
import TaskControlCard from '../components/TaskControlCard';
import AlarmCard from '../components/AlarmCard';
import DiagnosticsCard from '../components/DiagnosticsCard';
import { useI18n } from '../i18n';

const Dashboard: React.FC = () => {
  const { connectionState, systemStatus, connectedDeviceId, currentTask, zones, onboardingState, envData, rainData } = useAppStore();
  const { t } = useI18n();
  const bleService = BleService.getInstance();
  const [showWizard, setShowWizard] = useState(false);
  const [wizardAutoLaunched, setWizardAutoLaunched] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastColor, setToastColor] = useState<string>('dark');

  const handleToast = (message: string, color: string = 'dark') => {
    setToastMessage(message);
    setToastColor(color);
  };

  // Emergency Stop Handler
  const handleEmergencyStop = async () => {
    if (connectionState !== 'connected') {
      handleToast(t('dashboard.notConnected'), 'danger');
      return;
    }
    try {
      await bleService.stopCurrentWatering();
      await bleService.clearTaskQueue();
      handleToast(t('dashboard.emergencyStopSuccess'), 'warning');
    } catch (error: any) {
      handleToast(t('dashboard.emergencyStopFailed').replace('{error}', error.message), 'danger');
    }
  };

  // Check if initial setup is complete using firmware flags
  // INITIAL_SETUP flag is auto-set by firmware when: RTC + timezone + at least 1 channel configured
  const isInitialSetupDone = useMemo(() => {
    if (!onboardingState) return false;
    
    // Primary check: INITIAL_SETUP flag from firmware (most reliable)
    const hasInitialSetup = hasSystemFlag(onboardingState.system_config_flags, SYSTEM_FLAG.INITIAL_SETUP);
    if (hasInitialSetup) return true;
    
    // Fallback: Check if at least one channel is fully configured
    const hasConfiguredChannel = hasAnyConfiguredChannel(onboardingState.channel_config_flags);
    if (hasConfiguredChannel) return true;
    
    return false;
  }, [onboardingState]);

  // Auto-launch wizard when connected with incomplete onboarding
  // Only launch if INITIAL_SETUP flag is NOT set (first-time setup not complete)
  useEffect(() => {
    if (
      connectionState === 'connected' && 
      onboardingState && 
      !isInitialSetupDone &&  // Use flag-based check instead of percentage
      !wizardAutoLaunched &&
      !showWizard
    ) {
      // Small delay to let BLE sync complete
      const timer = setTimeout(() => {
        setShowWizard(true);
        setWizardAutoLaunched(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [connectionState, onboardingState, isInitialSetupDone, wizardAutoLaunched, showWizard]);

  // Reset auto-launch flag on disconnect
  useEffect(() => {
    if (connectionState === 'disconnected') {
      setWizardAutoLaunched(false);
    }
  }, [connectionState]);

  const handleScan = () => {
    if (connectionState === 'disconnected') {
      bleService.scan();
    } else if (connectionState === 'connected') {
      bleService.disconnect();
    }
  };

  const getSystemStatusText = (status: SystemStatus) => {
    switch (status) {
      case SystemStatus.OK: return t('dashboard.systemStatus.ok');
      case SystemStatus.NO_FLOW: return t('dashboard.systemStatus.noFlow');
      case SystemStatus.UNEXPECTED_FLOW: return t('dashboard.systemStatus.unexpectedFlow');
      case SystemStatus.FAULT: return t('dashboard.systemStatus.fault');
      case SystemStatus.RTC_ERROR: return t('dashboard.systemStatus.rtcError');
      case SystemStatus.LOW_POWER: return t('dashboard.systemStatus.lowPower');
      default: return t('dashboard.systemStatus.unknown');
    }
  };

  const isWatering = currentTask?.status === TaskStatus.RUNNING;
  const activeZone = isWatering ? zones.find(z => z.channel_id === currentTask?.channel_id) : null;
  const progress = isWatering && currentTask && currentTask.target_value > 0 
    ? Math.round((currentTask.current_value / currentTask.target_value) * 100) 
    : 0;
  const connectionStateLabels = {
    connected: t('dashboard.connectionState.connected'),
    disconnected: t('dashboard.connectionState.disconnected'),
    scanning: t('dashboard.connectionState.scanning'),
    connecting: t('dashboard.connectionState.connecting'),
  } as const;
  const connectionLabel = connectionState === 'connected'
    ? t('dashboard.linked').replace('{id}', connectedDeviceId || '')
    : connectionStateLabels[connectionState];
  const activeZoneName = activeZone?.name || `${t('zones.zone')} ${currentTask?.channel_id}`;
  const rainStatusLabel = !rainData
    ? t('dashboard.rainStatusUnknown')
    : rainData.sensor_status === 1
      ? (rainData.current_rate_mm_h > 0
          ? t('dashboard.rainStatusRaining').replace('{rate}', String(rainData.current_rate_mm_h))
          : t('dashboard.rainStatusDry'))
      : t('dashboard.rainStatusInactive');

  return (
    <IonPage>
      <IonContent className="bg-cyber-dark">
        <div className="p-6 max-w-7xl mx-auto">
          
          {/* Top Header Area */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{t('dashboard.title')}</h1>
              <p className="text-cyber-medium text-sm uppercase tracking-widest mt-1">{t('dashboard.subtitle')}</p>
            </div>
            
            {/* Emergency Stop */}
            <button 
              className="bg-cyber-rose hover:bg-red-600 text-white font-bold py-3 px-6 rounded shadow-[0_0_15px_rgba(244,63,94,0.5)] border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2 disabled:opacity-50"
              onClick={handleEmergencyStop}
              disabled={connectionState !== 'connected'}
            >
              <IonIcon icon={power} />
              {t('dashboard.emergencyStop')}
            </button>
          </div>
          
          {/* Connection Status Card */}
          <div className="glass-card p-6 mb-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <IonIcon icon={water} className="text-9xl" />
            </div>
            
            <div className="flex items-center justify-between relative z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-200 mb-1">{t('dashboard.connectionUplink')}</h2>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${connectionState === 'connected' ? 'bg-cyber-emerald shadow-[0_0_10px_#10b981]' : 'bg-gray-500'}`}></div>
                  <span className="text-gray-400 font-mono">
                    {connectionLabel}
                  </span>
                </div>
              </div>
              
              <IonButton 
                fill="outline" 
                color={connectionState === 'connected' ? 'danger' : 'secondary'}
                onClick={handleScan}
                className="font-mono"
              >
                {connectionState === 'connected'
                  ? t('dashboard.disconnect')
                  : connectionState === 'scanning'
                    ? t('dashboard.scanning')
                    : connectionState === 'connecting'
                      ? t('dashboard.connecting')
                      : t('dashboard.initiateScan')}
              </IonButton>
            </div>
          </div>

          {/* Alarm Card - shows only when there's an active alarm */}
          <AlarmCard onToast={handleToast} />

          {/* Task Control Card - shows watering controls */}
          <TaskControlCard onToast={handleToast} />

          {/* Onboarding Status Card - only show if initial setup NOT done */}
          {connectionState === 'connected' && onboardingState && !isInitialSetupDone && (
            <div className="glass-card p-6 mb-6 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-indigo-500/30">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xl font-semibold text-white">{t('dashboard.systemSetup')}</h2>
                <span className="text-indigo-300 font-mono">{onboardingState.overall_completion_pct}{t('common.percent')} {t('dashboard.complete')}</span>
              </div>
              <IonProgressBar value={onboardingState.overall_completion_pct / 100} color="secondary" className="mb-4 h-2 rounded-full"></IonProgressBar>
              
              <div className="grid grid-cols-3 gap-2 mb-4 text-xs text-gray-400">
                <div>{t('dashboard.channels')}: {onboardingState.channels_completion_pct}{t('common.percent')}</div>
                <div>{t('dashboard.system')}: {onboardingState.system_completion_pct}{t('common.percent')}</div>
                <div>{t('dashboard.schedules')}: {onboardingState.schedules_completion_pct}{t('common.percent')}</div>
              </div>

              <IonButton expand="block" color="secondary" onClick={() => setShowWizard(true)}>
                <IonIcon icon={settings} slot="start" />
                {t('dashboard.continueSetup')}
              </IonButton>
            </div>
          )}

          {/* Quick Actions - Show reconfigure button when setup is complete */}
          {connectionState === 'connected' && onboardingState && isInitialSetupDone && (
            <div className="glass-card p-4 mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-white font-semibold">{t('dashboard.systemConfigured')}</h3>
                <p className="text-gray-400 text-sm">{t('dashboard.allZonesConfigured')}</p>
              </div>
              <IonButton fill="outline" color="secondary" onClick={() => setShowWizard(true)}>
                <IonIcon icon={settings} slot="start" />
                {t('dashboard.reconfigure')}
              </IonButton>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Weather Card */}
            <div className="glass-card p-6 bg-gradient-to-br from-white/5 to-cyber-cyan/10 border-cyber-cyan/20">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-white">{t('dashboard.environmentalSensors')}</h2>
                <span className={`text-xs border px-2 py-1 rounded ${envData ? 'text-cyber-cyan border-cyber-cyan/30' : 'text-gray-500 border-gray-500/30'}`}>
                    {envData ? t('dashboard.live') : t('dashboard.offline')}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-cyber-cyan">
                    {envData ? envData.temperature.toFixed(1) : '--'}{t('common.degreesC')}
                  </div>
                  <div className="text-xs text-gray-400 uppercase mt-1">{t('dashboard.temp')}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-blue-400">
                    {envData ? envData.humidity.toFixed(0) : '--'}{t('common.percent')}
                  </div>
                  <div className="text-xs text-gray-400 uppercase mt-1">{t('dashboard.humidity')}</div>
                </div>
                <div className="p-3 rounded-lg bg-white/5">
                  <div className="text-2xl font-bold text-yellow-400">
                    {envData ? envData.pressure.toFixed(0) : '--'} {t('common.hPa')}
                  </div>
                  <div className="text-xs text-gray-400 uppercase mt-1">{t('labels.pressure')}</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                <span className="text-sm text-gray-400">{t('dashboard.rainSensorLabel')}</span>
                <span className={`text-sm font-bold ${(rainData?.current_rate_mm_h || 0) > 0 ? 'text-blue-400 animate-pulse' : 'text-cyber-emerald'}`}>
                    {rainStatusLabel}
                </span>
              </div>
            </div>

            {/* Active Status / Next Run */}
            <div className="glass-card p-6 flex flex-col justify-center items-center text-center">
              {isWatering ? (
                <>
                  <div className="relative w-32 h-32 mb-4">
                    <div className="absolute inset-0 border-4 border-cyber-cyan/30 rounded-full"></div>
                    <div 
                        className="absolute inset-0 border-4 border-cyber-cyan rounded-full border-t-transparent animate-spin"
                        style={{ animationDuration: '3s' }}
                    ></div>
                    <div className="absolute inset-0 flex items-center justify-center text-cyber-cyan font-bold text-xl">
                      {progress}{t('common.percent')}
                    </div>
                  </div>
                  <h3 className="text-xl text-white font-bold">
                    {t('dashboard.zoneActive').replace('{zone}', activeZoneName)}
                  </h3>
                  <p className="text-cyber-cyan animate-pulse">{t('dashboard.wateringInProgressLabel')}</p>
                </>
              ) : (
                <>
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 border ${
                      systemStatus.state === SystemStatus.OK ? 'bg-cyber-emerald/10 border-cyber-emerald/30' : 'bg-red-500/10 border-red-500/30'
                  }`}>
                  <IonIcon icon={leaf} className={`text-4xl ${
                        systemStatus.state === SystemStatus.OK ? 'text-cyber-emerald' : 'text-red-500'
                    }`} />
                  </div>
                  <h3 className="text-xl text-white font-bold">{getSystemStatusText(systemStatus.state)}</h3>
                  <p className="text-gray-400 mt-2">{t('dashboard.nextScheduledRun')}</p>
                  <p className="text-cyber-emerald font-mono text-lg">{systemStatus.nextRun || '--:--'}</p>
                </>
              )}
            </div>
          </div>

          {/* Diagnostics Card - Full Width */}
          {connectionState === 'connected' && (
            <DiagnosticsCard onToast={handleToast} />
          )}

        </div>
      </IonContent>

      <OnboardingWizard 
        isOpen={showWizard} 
        onClose={() => setShowWizard(false)} 
      />

      <IonToast
        isOpen={!!toastMessage}
        onDidDismiss={() => setToastMessage(null)}
        message={toastMessage || ''}
        duration={2500}
        color={toastColor}
        position="bottom"
      />
    </IonPage>
  );
};

export default Dashboard;
