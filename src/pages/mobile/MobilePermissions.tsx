import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Geolocation } from '@capacitor/geolocation';
import { useI18n } from '../../i18n';

interface Permission {
  id: string;
  icon: string;
  required: boolean;
  granted: boolean;
}

const PERMISSIONS_STORAGE_KEY = 'autowater_permissions_state';

const defaultPermissions: Permission[] = [
  {
    id: 'bluetooth',
    icon: 'bluetooth',
    required: true,
    granted: false,
  },
  {
    id: 'location',
    icon: 'location_on',
    required: true,
    granted: false,
  },
  {
    id: 'notifications',
    icon: 'notifications',
    required: false,
    granted: false,
  },
];

const loadPersistedPermissions = (): Permission[] => {
  try {
    const saved = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!saved) return defaultPermissions;
    const parsed = JSON.parse(saved) as Array<{ id: string; granted: boolean }>;
    return defaultPermissions.map((permission) => ({
      ...permission,
      granted: parsed.find((entry) => entry.id === permission.id)?.granted ?? false
    }));
  } catch {
    return defaultPermissions;
  }
};

const MobilePermissions: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();

  const [permissions, setPermissions] = useState<Permission[]>(loadPersistedPermissions);

  const permissionText: Record<string, { name: string; description: string }> = {
    bluetooth: {
      name: t('mobilePermissions.permissions.bluetooth.name'),
      description: t('mobilePermissions.permissions.bluetooth.description'),
    },
    location: {
      name: t('mobilePermissions.permissions.location.name'),
      description: t('mobilePermissions.permissions.location.description'),
    },
    notifications: {
      name: t('mobilePermissions.permissions.notifications.name'),
      description: t('mobilePermissions.permissions.notifications.description'),
    },
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPermission = permissions[currentIndex];
  const allRequiredGranted = permissions.filter(p => p.required).every(p => p.granted);

  const persistPermissions = (next: Permission[]) => {
    try {
      localStorage.setItem(
        PERMISSIONS_STORAGE_KEY,
        JSON.stringify(next.map((permission) => ({ id: permission.id, granted: permission.granted })))
      );
    } catch (err) {
      console.warn('[MobilePermissions] Failed to persist permission state:', err);
    }
  };

  const checkPermissionStatus = async (permissionId: string): Promise<boolean> => {
    try {
      switch (permissionId) {
        case 'bluetooth': {
          const isEnabled = await BleClient.isEnabled();
          return isEnabled;
        }
        case 'location': {
          const platform = Capacitor.getPlatform();
          if (platform === 'web') {
            if (navigator.permissions?.query) {
              const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
              return status.state === 'granted';
            }
            return false;
          }
          const status = await Geolocation.checkPermissions();
          return status.location === 'granted';
        }
        case 'notifications':
          return typeof Notification !== 'undefined' && Notification.permission === 'granted';
        default:
          return false;
      }
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const refreshStatuses = async () => {
      const statuses = await Promise.all(
        defaultPermissions.map(async (permission) => ({
          id: permission.id,
          granted: await checkPermissionStatus(permission.id)
        }))
      );

      if (!mounted) return;
      setPermissions((prev) => {
        const next = prev.map((permission) => ({
          ...permission,
          granted: statuses.find((status) => status.id === permission.id)?.granted ?? permission.granted
        }));
        persistPermissions(next);
        return next;
      });
    };

    void refreshStatuses();
    return () => {
      mounted = false;
    };
  }, []);

  const handleGrant = () => {
    const requestPermission = async () => {
      let granted = false;

      try {
        switch (currentPermission.id) {
          case 'bluetooth': {
            await BleClient.initialize();
            const platform = Capacitor.getPlatform();
            let enabled = await BleClient.isEnabled();
            if (!enabled && platform === 'android') {
              await BleClient.requestEnable();
              enabled = await BleClient.isEnabled();
            }
            granted = enabled || platform === 'web' || platform === 'ios';
            break;
          }
          case 'location': {
            const status = await Geolocation.checkPermissions();
            if (status.location !== 'granted') {
              const requested = await Geolocation.requestPermissions();
              granted = requested.location === 'granted';
            } else {
              granted = true;
            }
            break;
          }
          case 'notifications': {
            if (typeof Notification !== 'undefined') {
              const result = await Notification.requestPermission();
              granted = result === 'granted';
            }
            break;
          }
          default:
            granted = false;
        }
      } catch (err) {
        console.error('[MobilePermissions] Failed to request permission:', currentPermission.id, err);
        granted = false;
      }

      setPermissions((prev) => {
        const next = prev.map((permission, index) =>
          index === currentIndex ? { ...permission, granted } : permission
        );
        persistPermissions(next);
        return next;
      });

      if (currentIndex < permissions.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    };

    void requestPermission();
  };

  const handleSkip = () => {
    if (currentIndex < permissions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleContinue = () => {
    if (!allRequiredGranted) {
      const firstMissingRequired = permissions.findIndex((permission) => permission.required && !permission.granted);
      if (firstMissingRequired >= 0) {
        setCurrentIndex(firstMissingRequired);
      }
      return;
    }
    history.push('/scan');
  };

  const getIconColor = (permission: Permission) => {
    if (permission.granted) return 'text-mobile-primary';
    if (permission.id === 'bluetooth') return 'text-blue-400';
    if (permission.id === 'location') return 'text-orange-400';
    return 'text-purple-400';
  };

  const getIconBg = (permission: Permission) => {
    if (permission.granted) return 'bg-mobile-primary/20';
    if (permission.id === 'bluetooth') return 'bg-blue-500/20';
    if (permission.id === 'location') return 'bg-orange-500/20';
    return 'bg-purple-500/20';
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope flex flex-col">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => history.goBack()}
            className="text-white flex size-10 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined">arrow_back_ios_new</span>
          </button>
          <button 
            onClick={handleContinue}
            className="text-mobile-text-muted text-sm font-medium hover:text-white transition-colors"
          >
            {t('mobilePermissions.skipAll')}
          </button>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {permissions.map((p, i) => (
            <div
              key={p.id}
              className={`flex-1 h-1 rounded-full transition-colors ${
                p.granted ? 'bg-mobile-primary' : i === currentIndex ? 'bg-white/50' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          key={currentPermission.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="w-full max-w-sm"
        >
          {/* Icon */}
          <div className="flex justify-center mb-8">
            <div className={`size-32 rounded-full ${getIconBg(currentPermission)} flex items-center justify-center relative`}>
              <span className={`material-symbols-outlined text-6xl ${getIconColor(currentPermission)}`}>
                {currentPermission.granted ? 'check_circle' : currentPermission.icon}
              </span>
              {currentPermission.required && !currentPermission.granted && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {t('mobilePermissions.required')}
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-bold mb-3">
              {currentPermission.granted
                ? t('mobilePermissions.enabledTitle').replace('{name}', permissionText[currentPermission.id].name)
                : t('mobilePermissions.enableTitle').replace('{name}', permissionText[currentPermission.id].name)}
            </h2>
            <p className="text-mobile-text-muted leading-relaxed">
              {permissionText[currentPermission.id].description}
            </p>
          </div>

          {/* Status Pills */}
          <div className="flex justify-center gap-3 mb-8">
            {permissions.map(p => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                  p.granted
                    ? 'bg-mobile-primary/10 text-mobile-primary'
                    : 'bg-white/5 text-mobile-text-muted'
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {p.granted ? 'check' : p.icon}
                </span>
                <span>{permissionText[p.id].name}</span>
              </div>
            ))}
          </div>

          {/* Buttons */}
          {!currentPermission.granted ? (
            <div className="space-y-3">
              <button
                onClick={handleGrant}
                className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">check</span>
                {t('mobilePermissions.allow').replace('{name}', permissionText[currentPermission.id].name)}
              </button>

              {!currentPermission.required && (
                <button
                  onClick={handleSkip}
                  className="w-full h-12 bg-white/5 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
                >
                  {t('mobilePermissions.skipForNow')}
                </button>
              )}
            </div>
          ) : currentIndex < permissions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              {t('common.continue')}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleContinue}
              disabled={!allRequiredGranted}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              {t('mobilePermissions.getStarted')}
            </button>
          )}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="p-6">
        <div className="rounded-xl bg-white/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-mobile-text-muted shrink-0">lock</span>
          <p className="text-mobile-text-muted text-sm leading-relaxed">
            {t('mobilePermissions.footerNote')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobilePermissions;
