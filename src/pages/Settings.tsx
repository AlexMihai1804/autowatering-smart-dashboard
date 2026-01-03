import React, { useState, useEffect } from 'react';
import { IonContent, IonPage, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonButton, IonIcon, IonItem, IonLabel, IonInput, IonToast, IonToggle } from '@ionic/react';
import { time, water, refresh, warning, rainy, settings } from 'ionicons/icons';
import { BleService } from '../services/BleService';
import { useAppStore } from '../store/useAppStore';
import CalibrationWizard from '../components/CalibrationWizard';
import ResetModal from '../components/ResetModal';
import { initCalibrationService, initResetService } from '../services';
import { useI18n } from '../i18n';

const Settings: React.FC = () => {
  const { t } = useI18n();
  const { rtcConfig, calibrationState, systemConfig, rainConfig } = useAppStore();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // UI modals
  const [showCalibrationWizard, setShowCalibrationWizard] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Master Valve State
  const [masterEnabled, setMasterEnabled] = useState(false);
  const [masterPreDelay, setMasterPreDelay] = useState(0);
  const [masterPostDelay, setMasterPostDelay] = useState(0);

  // Rain Sensor State  
  const [rainEnabled, setRainEnabled] = useState(false);
  const [rainMmPerPulse, setRainMmPerPulse] = useState(0.2);
  const [rainSkipThreshold, setRainSkipThreshold] = useState(5.0);

  // Initialize services on mount
  useEffect(() => {
    const bleService = BleService.getInstance();
    initCalibrationService(bleService);
    initResetService(bleService);
  }, []);

  // Load current config when available
  useEffect(() => {
    if (systemConfig?.master_valve) {
      setMasterEnabled(systemConfig.master_valve.enabled);
      setMasterPreDelay(systemConfig.master_valve.pre_delay);
      setMasterPostDelay(systemConfig.master_valve.post_delay);
    }
  }, [systemConfig]);

  useEffect(() => {
    if (rainConfig) {
      setRainEnabled(rainConfig.sensor_enabled);
      setRainMmPerPulse(rainConfig.mm_per_pulse);
      setRainSkipThreshold(rainConfig.skip_threshold_mm);
    }
  }, [rainConfig]);

  const handleSaveMasterValve = async () => {
    try {
      await BleService.getInstance().writeSystemConfigObject({
        ...systemConfig,
        master_valve: {
          enabled: masterEnabled,
          pre_delay: masterPreDelay,
          post_delay: masterPostDelay,
          overlap_grace: systemConfig?.master_valve?.overlap_grace || 5,
          auto_management: true,
          current_state: false
        }
      });
      setToastMessage(t('settings.masterValveSaved'));
    } catch (e) {
      console.error(e);
      setToastMessage(t('settings.masterValveFailed'));
    }
  };

  const handleSaveRainConfig = async () => {
    try {
      await BleService.getInstance().writeRainConfig({
        mm_per_pulse: rainMmPerPulse,
        debounce_ms: rainConfig?.debounce_ms || 100,
        sensor_enabled: rainEnabled,
        integration_enabled: rainEnabled,
        rain_sensitivity_pct: rainConfig?.rain_sensitivity_pct || 100,
        skip_threshold_mm: rainSkipThreshold
      });
      setToastMessage(t('settings.rainSensorSaved'));
    } catch (e) {
      console.error(e);
      setToastMessage(t('settings.rainSensorFailed'));
    }
  };



  return (
    <IonPage>
      <IonContent className="bg-cyber-dark">
        <div className="p-6 max-w-3xl mx-auto pb-24">
          <h1 className="text-3xl font-bold text-white mb-8">{t('settings.systemSettings')}</h1>

          {/* Time Status (Auto-synced on connect) */}
          <IonCard className="bg-gray-900/80 border border-gray-800 mb-6">
            <IonCardHeader>
              <IonCardTitle className="text-white flex items-center gap-2">
                <IonIcon icon={time} className="text-cyber-cyan" />
                {t('settings.deviceTime')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="text-gray-400">
                {rtcConfig ?
                  `${String(rtcConfig.hour).padStart(2, '0')}:${String(rtcConfig.minute).padStart(2, '0')}:${String(rtcConfig.second).padStart(2, '0')} - ${rtcConfig.day}/${rtcConfig.month}/20${rtcConfig.year}` :
                  t('settings.notConnected')}
              </p>
              <p className="text-xs text-cyber-emerald mt-2">{t('settings.autoSynced')}</p>
            </IonCardContent>
          </IonCard>

          {/* Master Valve */}
          <IonCard className="bg-gray-900/80 border border-gray-800 mb-6">
            <IonCardHeader>
              <IonCardTitle className="text-white flex items-center gap-2">
                <IonIcon icon={settings} className="text-purple-400" />
                {t('settings.masterValve')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="space-y-4">
                <IonItem className="bg-transparent" lines="none">
                  <IonLabel className="text-white">{t('settings.enableMasterValve')}</IonLabel>
                  <IonToggle
                    checked={masterEnabled}
                    onIonChange={e => setMasterEnabled(e.detail.checked)}
                    color="secondary"
                  />
                </IonItem>

                {masterEnabled && (
                  <>
                    <IonItem className="bg-transparent border-gray-700 rounded-lg" lines="none">
                      <IonLabel position="stacked" className="text-gray-400">{t('settings.preDelay')}</IonLabel>
                      <IonInput
                        type="number"
                        value={masterPreDelay}
                        onIonChange={(e: any) => setMasterPreDelay(parseInt(e.detail.value!) || 0)}
                        className="text-white"
                      />
                    </IonItem>
                    <IonItem className="bg-transparent border-gray-700 rounded-lg" lines="none">
                      <IonLabel position="stacked" className="text-gray-400">{t('settings.postDelay')}</IonLabel>
                      <IonInput
                        type="number"
                        value={masterPostDelay}
                        onIonChange={(e: any) => setMasterPostDelay(parseInt(e.detail.value!) || 0)}
                        className="text-white"
                      />
                    </IonItem>
                  </>
                )}

                <IonButton expand="block" color="secondary" onClick={handleSaveMasterValve}>
                  {t('settings.saveMasterValveConfig')}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Rain Sensor */}
          <IonCard className="bg-gray-900/80 border border-gray-800 mb-6">
            <IonCardHeader>
              <IonCardTitle className="text-white flex items-center gap-2">
                <IonIcon icon={rainy} className="text-blue-400" />
                {t('settings.rainSensor')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="space-y-4">
                <IonItem className="bg-transparent" lines="none">
                  <IonLabel className="text-white">{t('settings.enableRainSensor')}</IonLabel>
                  <IonToggle
                    checked={rainEnabled}
                    onIonChange={e => setRainEnabled(e.detail.checked)}
                    color="secondary"
                  />
                </IonItem>

                {rainEnabled && (
                  <>
                    <IonItem className="bg-transparent border-gray-700 rounded-lg" lines="none">
                      <IonLabel position="stacked" className="text-gray-400">{t('settings.mmPerPulse')}</IonLabel>
                      <IonInput
                        type="number"
                        step="0.01"
                        value={rainMmPerPulse}
                        onIonChange={(e: any) => setRainMmPerPulse(parseFloat(e.detail.value!) || 0.2)}
                        className="text-white"
                      />
                    </IonItem>
                    <IonItem className="bg-transparent border-gray-700 rounded-lg" lines="none">
                      <IonLabel position="stacked" className="text-gray-400">{t('settings.skipThreshold')}</IonLabel>
                      <IonInput
                        type="number"
                        step="0.5"
                        value={rainSkipThreshold}
                        onIonChange={(e: any) => setRainSkipThreshold(parseFloat(e.detail.value!) || 5.0)}
                        className="text-white"
                      />
                    </IonItem>
                    <p className="text-xs text-gray-500 px-4">{t('settings.skipThresholdHint')}</p>
                  </>
                )}

                <IonButton expand="block" color="secondary" onClick={handleSaveRainConfig}>
                  {t('settings.saveRainSensorConfig')}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Flow Calibration */}
          <IonCard className="bg-gray-900/80 border border-gray-800 mb-6">
            <IonCardHeader>
              <IonCardTitle className="text-white flex items-center gap-2">
                <IonIcon icon={water} className="text-blue-400" />
                {t('settings.flowCalibration')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <div className="space-y-4">
                <div className="text-sm text-gray-400">
                  {calibrationState && (
                    <div className="grid grid-cols-3 gap-2 mb-4 bg-gray-800/50 rounded-lg p-3">
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{calibrationState.pulses}</div>
                        <div className="text-xs">{t('settings.pulses')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-white">{calibrationState.volume_ml}</div>
                        <div className="text-xs">{t('common.mlShort')}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-cyan-400">{calibrationState.pulses_per_liter}</div>
                        <div className="text-xs">{t('settings.pulsesPerLiter')}</div>
                      </div>
                    </div>
                  )}
                </div>

                <IonButton expand="block" color="primary" onClick={() => setShowCalibrationWizard(true)}>
                  <IonIcon icon={water} slot="start" />
                  {t('settings.startCalibration')}
                </IonButton>
              </div>
            </IonCardContent>
          </IonCard>

          {/* Danger Zone */}
          <IonCard className="bg-red-900/20 border border-red-900/50 mb-6">
            <IonCardHeader>
              <IonCardTitle className="text-red-500 flex items-center gap-2">
                <IonIcon icon={warning} />
                {t('settings.dangerZone')}
              </IonCardTitle>
            </IonCardHeader>
            <IonCardContent>
              <p className="text-red-400/80 mb-4">{t('settings.dangerWarning')}</p>

              {/* New Reset Modal Button */}
              <IonButton expand="block" color="danger" onClick={() => setShowResetModal(true)}>
                <IonIcon icon={refresh} slot="start" />
                {t('settings.resetOptions')}
              </IonButton>
            </IonCardContent>
          </IonCard>

        </div>

        {/* Calibration Wizard Modal */}
        <CalibrationWizard
          isOpen={showCalibrationWizard}
          onClose={() => setShowCalibrationWizard(false)}
        />

        {/* Reset Modal */}
        <ResetModal
          isOpen={showResetModal}
          onClose={() => setShowResetModal(false)}
        />

        <IonToast
          isOpen={!!toastMessage}
          onDidDismiss={() => setToastMessage(null)}
          message={toastMessage || ''}
          duration={2000}
          color="dark"
        />
      </IonContent>
    </IonPage>
  );
};

export default Settings;