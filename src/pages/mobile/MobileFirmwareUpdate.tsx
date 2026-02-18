import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { useAppStore } from '../../store/useAppStore';
import { TaskStatus } from '../../types/firmware_structs';
import { OtaLatestResult, OtaRelease, otaBackendService } from '../../services/OtaBackendService';
import { OtaInstallResult, OtaProgress, otaBleService } from '../../services/OtaBleService';
import { BleService } from '../../services/BleService';

const MobileFirmwareUpdate: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const {
    connectionState,
    currentTask,
    connectedDeviceId
  } = useAppStore();
  const bleService = BleService.getInstance();

  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [latestRelease, setLatestRelease] = useState<OtaRelease | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [progress, setProgress] = useState<OtaProgress | null>(null);
  const [installResult, setInstallResult] = useState<OtaInstallResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [firmwareRevision, setFirmwareRevision] = useState<string | null>(null);
  const [firmwareRevisionLoading, setFirmwareRevisionLoading] = useState(false);

  const firmwareVersion = useMemo(() => {
    return firmwareRevision;
  }, [firmwareRevision]);

  const isConnected = connectionState === 'connected';
  const isTaskActive = currentTask?.status === TaskStatus.RUNNING || currentTask?.status === TaskStatus.PAUSED;
  const backendConfigured = otaBackendService.isConfigured();

  const channel = otaBackendService.getDefaultChannel();
  const board = otaBackendService.getDefaultBoard();

  const refreshFirmwareRevision = useCallback(async () => {
    if (!isConnected) {
      setFirmwareRevision(null);
      return;
    }
    setFirmwareRevisionLoading(true);
    try {
      const revision = await bleService.readFirmwareRevision();
      setFirmwareRevision(revision);
    } catch (error) {
      console.warn('[MobileFirmwareUpdate] Failed to read firmware revision:', error);
      setFirmwareRevision(null);
    } finally {
      setFirmwareRevisionLoading(false);
    }
  }, [bleService, isConnected]);

  React.useEffect(() => {
    void refreshFirmwareRevision();
  }, [refreshFirmwareRevision]);

  const showToast = useCallback(async (text: string) => {
    try {
      const { Toast } = await import('@capacitor/toast');
      await Toast.show({ text, duration: 'short', position: 'bottom' });
    } catch {
      // no-op
    }
  }, []);

  const formatBytes = (bytes?: number): string => {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCheckUpdates = async () => {
    setChecking(true);
    setErrorMessage(null);
    setInstallResult(null);

    try {
      const lookupCurrentVersion = firmwareVersion || undefined;
      const result: OtaLatestResult = await otaBackendService.checkLatest({
        currentVersion: lookupCurrentVersion,
        channel,
        board
      });

      setLatestRelease(result.latest);
      setUpdateAvailable(Boolean(result.updateAvailable && result.latest));

      if (result.updateAvailable && result.latest) {
        await showToast(t('mobilePacksSettings.updates.available'));
      } else {
        await showToast(t('mobilePacksSettings.updates.upToDate'));
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setErrorMessage(reason);
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!latestRelease) return;

    setInstalling(true);
    setErrorMessage(null);
    setInstallResult(null);
    setProgress({
      phase: 'preflight',
      percent: 1,
      transferredBytes: 0,
      totalBytes: 0,
      message: 'Downloading firmware package...'
    });

    try {
      const binary = await otaBackendService.fetchReleaseBinary(latestRelease, { channel, board });
      setProgress({
        phase: 'preflight',
        percent: 4,
        transferredBytes: 0,
        totalBytes: binary.length,
        message: 'Starting BLE OTA transfer...'
      });

      const result = await otaBleService.installUpdate({
        binary,
        targetVersion: latestRelease.version,
        onProgress: (nextProgress) => setProgress(nextProgress)
      });

      setInstallResult(result);
      setUpdateAvailable(false);
      await refreshFirmwareRevision();
      await showToast(
        t('notifications.events.firmwareUpdated.message').replace('{version}', latestRelease.version)
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      setErrorMessage(reason);
    } finally {
      setInstalling(false);
    }
  };

  const canCheckUpdates = backendConfigured && isConnected && !checking && !installing;
  const canInstall = backendConfigured
    && isConnected
    && !isTaskActive
    && Boolean(latestRelease)
    && updateAvailable
    && !checking
    && !installing;

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark p-4 pb-2 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          {t('mobileDeviceInfo.checkUpdates')}
        </h2>
      </div>

      <main className="flex-1 flex flex-col px-4 gap-4 pb-8">
        {!backendConfigured && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
            <p className="text-sm text-red-300 font-semibold">OTA backend is not configured.</p>
            <p className="text-xs text-red-200/80 mt-1">{otaBackendService.getMissingConfigReason()}</p>
          </div>
        )}

        {!isConnected && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-sm text-amber-200">Connect to a device before checking firmware updates.</p>
          </div>
        )}

        {isTaskActive && (
          <div className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4">
            <p className="text-sm text-amber-200">Stop active watering before starting OTA.</p>
          </div>
        )}

        <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-mobile-text-muted">{t('mobileDeviceInfo.firmwareVersion')}</span>
              <span className="text-sm font-semibold text-white">
                {firmwareRevisionLoading ? t('common.loading') : (firmwareVersion ? (firmwareVersion.startsWith('v') ? firmwareVersion : `v${firmwareVersion}`) : '--')}
              </span>
            </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-mobile-text-muted">{t('dashboard.device')}</span>
            <span className="text-sm font-mono text-mobile-text-muted">{connectedDeviceId || '--'}</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-mobile-text-muted">OTA Channel</span>
            <span className="text-sm font-semibold text-white">{channel}</span>
          </div>
          <div className="p-4 flex items-center justify-between">
            <span className="text-sm text-mobile-text-muted">Hardware Board</span>
            <span className="text-sm font-semibold text-white">{board}</span>
          </div>
        </div>

        <button
          onClick={handleCheckUpdates}
          disabled={!canCheckUpdates}
          className={`w-full py-3 rounded-2xl text-base font-bold transition-all ${
            canCheckUpdates
              ? 'bg-mobile-primary text-mobile-bg-dark shadow-lg shadow-mobile-primary/20 active:scale-[0.98]'
              : 'bg-white/5 text-mobile-text-muted'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${checking ? 'animate-spin' : ''}`}>
              {checking ? 'refresh' : 'system_update'}
            </span>
            {checking ? t('mobilePacksSettings.updates.checking') : t('mobileDeviceInfo.checkUpdates')}
          </span>
        </button>

        {latestRelease && (
          <div className="bg-white/5 rounded-2xl border border-white/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-mobile-text-muted uppercase tracking-wide">Latest Release</p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  updateAvailable
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                }`}
              >
                {updateAvailable ? t('mobilePacksSettings.updates.available') : t('mobilePacksSettings.updates.upToDate')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-mobile-text-muted">Version</span>
              <span className="text-sm font-semibold text-white">v{latestRelease.version}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-mobile-text-muted">Package size</span>
              <span className="text-sm font-semibold text-white">{formatBytes(latestRelease.artifact?.sizeBytes)}</span>
            </div>

            {latestRelease.notes && (
              <div className="rounded-xl bg-mobile-bg-dark/60 border border-mobile-border-dark p-3">
                <p className="text-xs text-mobile-text-muted uppercase tracking-wide mb-1">Release notes</p>
                <p className="text-sm text-gray-200 whitespace-pre-wrap">{latestRelease.notes}</p>
              </div>
            )}

            {latestRelease.artifact?.sha256 && (
              <p className="text-[11px] text-mobile-text-muted break-all">
                SHA256: {latestRelease.artifact.sha256}
              </p>
            )}
          </div>
        )}

        {progress && (
          <div className="bg-white/5 rounded-2xl border border-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-mobile-text-muted uppercase tracking-wide">
              <span>{progress.phase}</span>
              <span>{progress.percent}%</span>
            </div>
            <div className="h-2 bg-mobile-border-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-mobile-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-gray-200">{progress.message}</p>
            {progress.totalBytes > 0 && (
              <p className="text-xs text-mobile-text-muted">
                {formatBytes(progress.transferredBytes)} / {formatBytes(progress.totalBytes)}
              </p>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4">
            <p className="text-sm font-semibold text-red-300">{t('common.error')}</p>
            <p className="text-xs text-red-200/90 mt-1 break-words">{errorMessage}</p>
          </div>
        )}

        {installResult && (
          <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-2xl p-4 space-y-1">
            <p className="text-sm font-semibold text-emerald-300">{t('common.success')}</p>
            <p className="text-xs text-emerald-200/90">Uploaded {formatBytes(installResult.uploadedBytes)}</p>
            {installResult.targetVersion && (
              <p className="text-xs text-emerald-200/90">Target version: v{installResult.targetVersion}</p>
            )}
            {installResult.runningVersion && (
              <p className="text-xs text-emerald-200/90">Running version: v{installResult.runningVersion}</p>
            )}
          </div>
        )}

        <button
          onClick={handleInstallUpdate}
          disabled={!canInstall}
          className={`w-full py-3 rounded-2xl text-base font-bold transition-all ${
            canInstall
              ? 'bg-white text-mobile-bg-dark active:scale-[0.98]'
              : 'bg-white/5 text-mobile-text-muted'
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span className={`material-symbols-outlined text-[20px] ${installing ? 'animate-spin' : ''}`}>
              {installing ? 'progress_activity' : 'download'}
            </span>
            {installing ? t('mobilePacksSettings.updates.install') : 'Download & Install OTA'}
          </span>
        </button>
      </main>
    </div>
  );
};

export default MobileFirmwareUpdate;
