import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';

interface Permission {
  id: string;
  name: string;
  description: string;
  icon: string;
  required: boolean;
  granted: boolean;
}

const MobilePermissions: React.FC = () => {
  const history = useHistory();

  const [permissions, setPermissions] = useState<Permission[]>([
    {
      id: 'bluetooth',
      name: 'Bluetooth',
      description: 'Required to connect to your irrigation device',
      icon: 'bluetooth',
      required: true,
      granted: false,
    },
    {
      id: 'location',
      name: 'Location',
      description: 'Needed for weather data and Bluetooth scanning',
      icon: 'location_on',
      required: true,
      granted: false,
    },
    {
      id: 'notifications',
      name: 'Notifications',
      description: 'Get alerts about watering schedules and issues',
      icon: 'notifications',
      required: false,
      granted: false,
    },
  ]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const currentPermission = permissions[currentIndex];
  const allRequiredGranted = permissions.filter(p => p.required).every(p => p.granted);

  const handleGrant = () => {
    // In a real app, this would trigger the native permission request
    setPermissions(prev => prev.map((p, i) => 
      i === currentIndex ? { ...p, granted: true } : p
    ));

    if (currentIndex < permissions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < permissions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleContinue = () => {
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
            Skip All
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
                  Required
                </span>
              )}
            </div>
          </div>

          {/* Text */}
          <div className="text-center mb-8">
            <h2 className="text-white text-2xl font-bold mb-3">
              {currentPermission.granted ? `${currentPermission.name} Enabled` : `Enable ${currentPermission.name}`}
            </h2>
            <p className="text-mobile-text-muted leading-relaxed">
              {currentPermission.description}
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
                <span>{p.name}</span>
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
                Allow {currentPermission.name}
              </button>

              {!currentPermission.required && (
                <button
                  onClick={handleSkip}
                  className="w-full h-12 bg-white/5 text-white font-semibold rounded-xl active:scale-[0.98] transition-transform"
                >
                  Skip for Now
                </button>
              )}
            </div>
          ) : currentIndex < permissions.length - 1 ? (
            <button
              onClick={() => setCurrentIndex(prev => prev + 1)}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              Continue
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={handleContinue}
              className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">rocket_launch</span>
              Get Started
            </button>
          )}
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="p-6">
        <div className="rounded-xl bg-white/5 p-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-mobile-text-muted shrink-0">lock</span>
          <p className="text-mobile-text-muted text-sm leading-relaxed">
            Your privacy is important to us. We only use these permissions for the app to function properly. Your data stays on your device.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MobilePermissions;
