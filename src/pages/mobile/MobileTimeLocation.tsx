import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

const MobileTimeLocation: React.FC = () => {
  const history = useHistory();
  
  const [autoSync, setAutoSync] = useState(true);
  const [timezone, setTimezone] = useState('Europe/Bucharest');
  const [coordinates, setCoordinates] = useState({
    lat: 44.4268,
    lng: 26.1025,
  });

  const timezones = [
    { value: 'Europe/Bucharest', label: 'Bucharest (EET)', offset: '+2:00' },
    { value: 'Europe/London', label: 'London (GMT)', offset: '+0:00' },
    { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: '+1:00' },
    { value: 'America/New_York', label: 'New York (EST)', offset: '-5:00' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-8:00' },
  ];

  const handleSyncNow = () => {
    // Mock sync action
    console.log('Syncing time with device...');
  };

  const handleGetLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoordinates({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Failed to get location:', error);
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark/90 backdrop-blur-md p-4 justify-between">
        <button 
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight flex-1 text-center">
          Time & Location
        </h2>
        <div className="size-12" />
      </div>

      <div className="px-4 space-y-6">
        {/* Current Time Card */}
        <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark overflow-hidden">
          <div className="p-6 flex flex-col items-center">
            <div className="size-20 rounded-full bg-mobile-primary/10 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-mobile-primary text-4xl">schedule</span>
            </div>
            <p className="text-mobile-text-muted text-sm mb-1">Device Time</p>
            <p className="text-white text-4xl font-bold tracking-tight">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
            </p>
            <p className="text-mobile-text-muted text-sm mt-1">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Auto Sync Toggle */}
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-mobile-surface-dark border border-mobile-border-dark">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
              <span className="material-symbols-outlined">sync</span>
            </div>
            <div>
              <p className="text-white font-semibold">Auto Sync</p>
              <p className="text-mobile-text-muted text-sm">Sync time on connection</p>
            </div>
          </div>
          <button
            onClick={() => setAutoSync(!autoSync)}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              autoSync ? 'bg-mobile-primary' : 'bg-white/20'
            }`}
          >
            <div className={`absolute top-1 size-5 rounded-full bg-white shadow-md transition-transform ${
              autoSync ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        {/* Timezone Selection */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            Timezone
          </label>
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark divide-y divide-mobile-border-dark overflow-hidden">
            {timezones.map(tz => (
              <button
                key={tz.value}
                onClick={() => setTimezone(tz.value)}
                className={`w-full flex items-center justify-between gap-4 p-4 hover:bg-white/5 transition-colors ${
                  timezone === tz.value ? 'bg-mobile-primary/10' : ''
                }`}
              >
                <div>
                  <p className="text-white font-semibold text-left">{tz.label}</p>
                  <p className="text-mobile-text-muted text-sm">UTC {tz.offset}</p>
                </div>
                {timezone === tz.value && (
                  <span className="material-symbols-outlined text-mobile-primary">check_circle</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <label className="text-sm font-bold uppercase tracking-wider text-mobile-text-muted block px-1">
            Location Coordinates
          </label>
          <div className="rounded-2xl bg-mobile-surface-dark border border-mobile-border-dark p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-mobile-text-muted text-sm">Latitude</p>
                <p className="text-white font-semibold">{coordinates.lat.toFixed(4)}°</p>
              </div>
              <div className="text-right">
                <p className="text-mobile-text-muted text-sm">Longitude</p>
                <p className="text-white font-semibold">{coordinates.lng.toFixed(4)}°</p>
              </div>
            </div>
            <button
              onClick={handleGetLocation}
              className="w-full h-12 bg-white/5 hover:bg-white/10 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">my_location</span>
              Get Current Location
            </button>
          </div>
          <p className="text-mobile-text-muted text-sm px-1">
            Location is used for accurate sunrise/sunset times and weather data.
          </p>
        </div>

        {/* Sync Now Button */}
        <button
          onClick={handleSyncNow}
          className="w-full h-14 bg-mobile-primary text-mobile-bg-dark font-bold text-lg rounded-xl shadow-lg shadow-mobile-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">sync</span>
          Sync Now
        </button>
      </div>
    </div>
  );
};

export default MobileTimeLocation;
