import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useI18n } from '../../i18n';
import {
  AlarmCode,
  AlarmSeverity,
  getAlarmDescription,
  getAlarmSeverity,
  getAlarmTitle,
  getAffectedChannelFromAlarmData
} from '../../types/firmware_structs';

interface NotificationItem {
  id: string;
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  message: string;
  time: string;
  timestamp: number;
}

const MobileNotifications: React.FC = () => {
  const history = useHistory();
  const { t } = useI18n();
  const { alarmHistory, alarmStatus, wateringHistory, connectionState, zones } = useAppStore();
  const [activeFilter, setActiveFilter] = useState<'all' | 'errors' | 'warnings' | 'info'>('all');
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const nowEpoch = Math.floor(Date.now() / 1000);
  const zoneName = (channelId: number) => {
    const zone = zones.find((z) => z.channel_id === channelId);
    return zone?.name || `${t('zones.zone')} ${channelId + 1}`;
  };

  const alarmNotifications = useMemo<NotificationItem[]>(() => {
    const combined = [...alarmHistory];
    if (alarmStatus && alarmStatus.alarm_code !== AlarmCode.NONE) {
      const exists = combined.some((entry) => entry.timestamp === alarmStatus.timestamp);
      if (!exists) {
        combined.unshift({
          alarm_code: alarmStatus.alarm_code,
          alarm_data: alarmStatus.alarm_data,
          timestamp: alarmStatus.timestamp
        });
      }
    }

    return combined.map((entry) => {
      const severity = getAlarmSeverity(entry.alarm_code);
      const channel = getAffectedChannelFromAlarmData(entry.alarm_code, entry.alarm_data);

      let type: NotificationItem['type'] = 'info';
      if (severity === AlarmSeverity.CRITICAL || severity === AlarmSeverity.DANGER) type = 'error';
      else if (severity === AlarmSeverity.WARNING) type = 'warning';

      return {
        id: `alarm-${entry.timestamp}-${entry.alarm_code}`,
        type,
        title: getAlarmTitle(entry.alarm_code, t),
        message: getAlarmDescription(entry.alarm_code, channel, entry.alarm_data, t),
        time: new Date(entry.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: entry.timestamp
      };
    });
  }, [alarmHistory, alarmStatus, t, zones]);

  const wateringNotifications = useMemo<NotificationItem[]>(() => {
    return wateringHistory
      .filter((entry) => nowEpoch - entry.timestamp <= 7 * 24 * 3600)
      .map((entry) => {
        const zone = zoneName(entry.channel_id);
        const durationMin = Math.max(1, Math.round(entry.target_value_ml / 60));
        const message = entry.success_status
          ? t('mobileNotifications.mock.irrigationCompleted.message')
            .replace('{zone}', zone)
            .replace('{duration}', String(durationMin))
            .replace('{saved}', '0')
          : `${zone}: error ${entry.error_code}`;

        return {
          id: `watering-${entry.timestamp}-${entry.channel_id}-${entry.event_type}`,
          type: entry.success_status ? 'success' : 'warning',
          title: entry.success_status
            ? t('mobileNotifications.mock.irrigationCompleted.title')
            : t('common.warning'),
          message,
          time: new Date(entry.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: entry.timestamp
        };
      });
  }, [wateringHistory, t, zones, nowEpoch]);

  const connectionNotification = useMemo<NotificationItem[]>(() => {
    if (connectionState === 'connected') return [];
    return [
      {
        id: 'connection-lost',
        type: 'error',
        title: t('mobileNotifications.mock.connectionLost.title'),
        message: t('mobileNotifications.mock.connectionLost.message').replace('{minutes}', '0'),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: nowEpoch
      }
    ];
  }, [connectionState, t, nowEpoch]);

  const allNotifications = useMemo(
    () =>
      [...alarmNotifications, ...wateringNotifications, ...connectionNotification]
        .filter((item) => !hiddenIds.has(item.id))
        .sort((a, b) => b.timestamp - a.timestamp),
    [alarmNotifications, wateringNotifications, connectionNotification, hiddenIds]
  );

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

  const filteredNotifications = useMemo(() => {
    const filterItems = (items: NotificationItem[]) =>
      items.filter((item) => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'errors') return item.type === 'error';
        if (activeFilter === 'warnings') return item.type === 'warning';
        if (activeFilter === 'info') return item.type === 'info' || item.type === 'success';
        return true;
      });

    const today = new Date();
    const todayKey = today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = yesterday.toDateString();

    const sections = [
      { section: t('mobileNotifications.sections.today'), items: [] as NotificationItem[] },
      { section: t('mobileNotifications.sections.yesterday'), items: [] as NotificationItem[] },
      { section: t('mobileNotifications.sections.lastWeek'), items: [] as NotificationItem[] }
    ];

    for (const item of filterItems(allNotifications)) {
      const dateKey = new Date(item.timestamp * 1000).toDateString();
      if (dateKey === todayKey) {
        sections[0].items.push(item);
      } else if (dateKey === yesterdayKey) {
        sections[1].items.push(item);
      } else {
        sections[2].items.push(item);
      }
    }

    return sections.filter((section) => section.items.length > 0);
  }, [activeFilter, allNotifications, t]);

  const handleClearAll = () => {
    setHiddenIds(new Set(allNotifications.map((notification) => notification.id)));
  };

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
            <button
              onClick={handleClearAll}
              className="text-mobile-text-muted text-sm font-bold hover:text-mobile-primary transition-colors"
            >
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

