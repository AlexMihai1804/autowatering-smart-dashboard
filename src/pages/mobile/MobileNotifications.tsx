import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useI18n } from '../../i18n';

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
  zone?: string;
}

const buildMockNotifications = (t: (key: string) => string): { section: string; items: NotificationItem[] }[] => [
  {
    section: t('mobileNotifications.sections.today'),
    items: [
      {
        id: '1',
        type: 'success',
        title: t('mobileNotifications.mock.irrigationCompleted.title'),
        message: t('mobileNotifications.mock.irrigationCompleted.message')
          .replace('{zone}', 'Front Lawn')
          .replace('{duration}', '15')
          .replace('{saved}', '2'),
        time: '7:00 AM',
      },
      {
        id: '2',
        type: 'warning',
        title: t('mobileNotifications.mock.moistureAlert.title'),
        message: t('mobileNotifications.mock.moistureAlert.message').replace('{threshold}', '15'),
        time: '6:45 AM',
      },
    ],
  },
  {
    section: t('mobileNotifications.sections.yesterday'),
    items: [
      {
        id: '3',
        type: 'info',
        title: t('mobileNotifications.mock.scheduleSkipped.title'),
        message: t('mobileNotifications.mock.scheduleSkipped.message'),
        time: '5:30 PM',
      },
      {
        id: '4',
        type: 'info',
        title: t('mobileNotifications.mock.firmwareUpdated.title'),
        message: t('mobileNotifications.mock.firmwareUpdated.message').replace('{version}', '2.4.1'),
        time: '2:00 PM',
      },
    ],
  },
  {
    section: t('mobileNotifications.sections.lastWeek'),
    items: [
      {
        id: '5',
        type: 'success',
        title: t('mobileNotifications.mock.irrigationCompleted.title'),
        message: t('mobileNotifications.mock.irrigationCompletedShort.message')
          .replace('{zone}', 'Backyard Garden')
          .replace('{duration}', '20'),
        time: t('mobileNotifications.days.mon'),
      },
      {
        id: '6',
        type: 'error',
        title: t('mobileNotifications.mock.connectionLost.title'),
        message: t('mobileNotifications.mock.connectionLost.message').replace('{minutes}', '30'),
        time: t('mobileNotifications.days.sun'),
      },
    ],
  },
];
const MobileNotifications: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');

  const mockNotifications = buildMockNotifications(t);

  const filters = [
    { key: 'all', label: t('mobileNotifications.filters.all') },
    { key: 'errors', label: t('mobileNotifications.filters.errors') },
    { key: 'warnings', label: t('mobileNotifications.filters.warnings') },
    { key: 'info', label: t('mobileNotifications.filters.info') },
  ];

  const getTypeStyles = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return { bg: 'bg-mobile-primary/10', color: 'text-mobile-primary', icon: 'water_drop' };
      case 'warning':
        return { bg: 'bg-amber-500/10', color: 'text-amber-500', icon: 'warning' };
      case 'error':
        return { bg: 'bg-red-500/10', color: 'text-red-500', icon: 'error' };
      case 'info':
      default:
        return { bg: 'bg-blue-500/10', color: 'text-blue-400', icon: 'info' };
    }
  };

  const filteredNotifications = mockNotifications.map(section => ({
    ...section,
    items: section.items.filter(item => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'errors') return item.type === 'error';
      if (activeFilter === 'warnings') return item.type === 'warning';
      if (activeFilter === 'info') return item.type === 'info' || item.type === 'success';
      return true;
    }),
  })).filter(section => section.items.length > 0);

  return (
    <div className="min-h-screen bg-mobile-bg-dark font-manrope pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-mobile-bg-dark/95 backdrop-blur-md px-4 pt-12 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => history.goBack()}
              className="text-white flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">{t('mobileNotifications.title')}</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => history.push('/alarms')}
              className="text-mobile-text-muted text-sm font-bold hover:text-mobile-primary transition-colors"
            >
              {t('mobileNotifications.alarms')}
            </button>
            <button className="text-mobile-text-muted text-sm font-bold hover:text-mobile-primary transition-colors">
              {t('mobileNotifications.clearAll')}
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map(filter => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as typeof activeFilter)}
              className={`flex h-9 shrink-0 items-center justify-center rounded-full px-5 transition-all active:scale-95 ${
                activeFilter === filter.key
                  ? 'bg-mobile-primary text-black font-bold'
                  : 'bg-mobile-surface-dark border border-white/10 text-gray-300 font-medium hover:border-mobile-primary/50'
              }`}
            >
              <span className="text-sm">{filter.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 flex flex-col gap-2">
        {filteredNotifications.map((section, sectionIdx) => (
          <React.Fragment key={section.section}>
            {/* Section Header */}
            <div className={`${sectionIdx > 0 ? 'mt-4' : 'mt-2'} mb-2`}>
              <h3 className="text-mobile-text-muted text-sm font-bold uppercase tracking-wider px-2">
                {section.section}
              </h3>
            </div>

            {/* Items */}
            {section.items.map((item, idx) => {
              const styles = getTypeStyles(item.type);
              const isOld = section.section === t('mobileNotifications.sections.lastWeek');
              
              return (
                <div
                  key={item.id}
                  className={`group relative flex items-center gap-4 bg-mobile-card-dark p-4 rounded-xl 
                            hover:bg-mobile-surface-dark transition-colors shadow-sm border border-white/5
                            ${isOld ? 'opacity-60' : ''}`}
                >
                  {/* Icon */}
                  <div className={`relative flex items-center justify-center rounded-full shrink-0 h-12 w-12 ${styles.bg} ${styles.color}`}>
                    <span className="material-symbols-outlined text-2xl">{styles.icon}</span>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="text-white text-base font-bold leading-tight line-clamp-1">
                        {item.title}
                      </p>
                      <span className="text-mobile-text-muted text-xs font-medium whitespace-nowrap ml-2">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-mobile-text-muted text-sm font-medium leading-normal line-clamp-1 mt-0.5">
                      {item.message}
                    </p>
                  </div>

                  {/* Hover indicator */}
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-mobile-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </React.Fragment>
        ))}

        {/* Empty State */}
        {filteredNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="size-20 rounded-full bg-mobile-surface-dark flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-mobile-text-muted">notifications_off</span>
            </div>
            <p className="text-white font-bold text-lg">{t('mobileNotifications.emptyTitle')}</p>
            <p className="text-mobile-text-muted text-sm mt-1">{t('mobileNotifications.emptyMessage')}</p>
          </div>
        )}

        <div className="h-8" />
      </main>
    </div>
  );
};

export default MobileNotifications;

