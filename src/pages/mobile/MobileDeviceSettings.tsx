import React from 'react';
import { useHistory } from 'react-router-dom';

const MobileDeviceSettings: React.FC = () => {
  const history = useHistory();

  const settingsGroups = [
    {
      title: 'Device Configuration',
      items: [
        {
          icon: 'info',
          iconBg: 'bg-blue-500/10',
          iconColor: 'text-blue-400',
          label: 'Device Info',
          subtitle: 'Model, firmware, serial number',
          route: '/device/info',
        },
        {
          icon: 'schedule',
          iconBg: 'bg-purple-500/10',
          iconColor: 'text-purple-400',
          label: 'Time & Location',
          subtitle: 'Timezone, coordinates, sync',
          route: '/device/time',
        },
        {
          icon: 'valve',
          iconBg: 'bg-green-500/10',
          iconColor: 'text-green-400',
          label: 'Master Valve',
          subtitle: 'Configure main water supply valve',
          route: '/device/master-valve',
        },
        {
          icon: 'water_drop',
          iconBg: 'bg-cyan-500/10',
          iconColor: 'text-cyan-400',
          label: 'Flow Sensor Calibration',
          subtitle: 'Pulses per liter, accuracy test',
          route: '/device/flow-calibration',
        },
      ],
    },
    {
      title: 'Power & Performance',
      items: [
        {
          icon: 'battery_charging_full',
          iconBg: 'bg-amber-500/10',
          iconColor: 'text-amber-400',
          label: 'Power Mode',
          subtitle: 'Normal, Energy-Saving, Ultra-Low',
          route: '/device/power-mode',
        },
      ],
    },
    {
      title: 'Maintenance',
      items: [
        {
          icon: 'restart_alt',
          iconBg: 'bg-red-500/10',
          iconColor: 'text-red-400',
          label: 'Reset Options',
          subtitle: 'Factory reset, clear schedules',
          route: '/device/reset',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 flex items-center bg-mobile-bg-dark p-4 pb-2 justify-between">
        <button
          onClick={() => history.goBack()}
          className="text-white flex size-12 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back_ios_new</span>
        </button>
        <h2 className="text-white text-lg font-bold leading-tight tracking-tight flex-1 text-center pr-12">
          Device Settings
        </h2>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col px-4 gap-6 pb-8">
        {settingsGroups.map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col gap-2">
            <h3 className="px-2 text-sm font-medium text-mobile-text-muted uppercase tracking-wider">
              {group.title}
            </h3>
            <div className="bg-white/5 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
              {group.items.map((item, itemIdx) => (
                <button
                  key={itemIdx}
                  onClick={() => history.push(item.route)}
                  className="flex items-center justify-between p-4 w-full hover:bg-white/5 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${item.iconBg} flex items-center justify-center ${item.iconColor}`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-base font-medium text-white">{item.label}</span>
                      <span className="text-xs text-mobile-text-muted">{item.subtitle}</span>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-mobile-text-muted group-hover:text-white transition-colors">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
};

export default MobileDeviceSettings;
