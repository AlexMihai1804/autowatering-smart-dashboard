import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BleService } from '../../services/BleService';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

type TimeFrame = 'day' | 'week' | 'month';
type HistoryTab = 'watering' | 'rain' | 'environment';

const MobileHistory: React.FC = () => {
  const {
    zones,
    wateringHistory,
    rainHistoryHourly,
    rainHistoryDaily,
    envData,
    envHistoryDetailed,
    envHistoryHourly,
    envHistoryDaily,
    connectionState,
  } = useAppStore();
  const bleService = BleService.getInstance();
  
  const [activeTab, setActiveTab] = useState<HistoryTab>('watering');
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Date navigation state - the "anchor" date for the selected period
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const isConnected = connectionState === 'connected';

  // Avoid overlapping BLE history requests when the user changes chart period quickly.
  const historyFetchInFlightRef = useRef(false);
  const queuedFetchKeyRef = useRef<string | null>(null);
  const latestRangeRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });
  const latestSelectionRef = useRef<{ activeTab: HistoryTab; timeFrame: TimeFrame }>({
    activeTab: 'watering',
    timeFrame: 'week',
  });

  const runHistoryFetch = async (
    fetchKey: string,
    startTs: number,
    endTs: number,
    tab: HistoryTab,
    tf: TimeFrame
  ) => {
    try {
      switch (tab) {
        case 'watering':
          await bleService.fetchWateringHistory(0, 0xFF, 0, 50, startTs, endTs);
          break;
        case 'rain':
          // Day -> hourly resolution; Week/Month -> daily resolution
          if (tf === 'day') {
            await bleService.fetchRainHistory(0x01, startTs, endTs, 48, 0);
          } else {
            await bleService.fetchRainHistory(0x02, startTs, endTs, 400, 1);
          }
          break;
        case 'environment':
          // Day -> detailed; Week -> hourly (fallback to daily); Month -> daily
          if (tf === 'day') {
            await bleService.fetchEnvHistoryPaged(0x01, startTs, endTs, 0, 100);
          } else if (tf === 'week') {
            await bleService.fetchEnvHistoryPaged(0x02, startTs, endTs, 1, 100);
            // Some firmware builds may not support hourly env aggregates.
            // If we got nothing, fallback to daily aggregates.
            if (useAppStore.getState().envHistoryHourly.length === 0) {
              await bleService.fetchEnvHistoryPaged(0x03, startTs, endTs, 2, 100);
            }
          } else {
            await bleService.fetchEnvHistoryPaged(0x03, startTs, endTs, 2, 100);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      // If the user changed the selection mid-fetch, run once more with the latest selection.
      historyFetchInFlightRef.current = false;
      setLoading(false);
      if (queuedFetchKeyRef.current && queuedFetchKeyRef.current !== fetchKey) {
        const nextKey = queuedFetchKeyRef.current;
        queuedFetchKeyRef.current = null;
        // Trigger a refetch by updating the in-flight state and calling again.
        historyFetchInFlightRef.current = true;
        setLoading(true);
        // Use the latest computed range (avoid stale closures).
        await runHistoryFetch(
          nextKey,
          latestRangeRef.current.start,
          latestRangeRef.current.end,
          latestSelectionRef.current.activeTab,
          latestSelectionRef.current.timeFrame
        );
      }
    }
  };

  // Get zone name by channel ID
  const getZoneName = (channelId: number): string => {
    const zone = zones.find(z => z.channel_id === channelId);
    return zone?.name || `Zone ${channelId + 1}`;
  };

  // Calculate date range based on timeFrame and selectedDate
  const dateRange = useMemo(() => {
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let startDate: Date;
    switch (timeFrame) {
      case 'day':
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(selectedDate);
        startDate.setDate(startDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endOfDay.setMonth(endOfDay.getMonth() + 1, 0); // Last day of month
        break;
      default:
        startDate = new Date(selectedDate);
    }
    
    return {
      start: Math.floor(startDate.getTime() / 1000),
      end: Math.floor(endOfDay.getTime() / 1000),
      startDate,
      endDate: endOfDay,
    };
  }, [selectedDate, timeFrame]);

  useEffect(() => {
    latestRangeRef.current = { start: dateRange.start, end: dateRange.end };
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    latestSelectionRef.current = { activeTab, timeFrame };
  }, [activeTab, timeFrame]);

  // Fetch new history when the user changes tab / timeframe / date.
  useEffect(() => {
    if (!isConnected) return;

    const fetchKey = `${activeTab}|${timeFrame}|${selectedDate.toDateString()}`;
    if (historyFetchInFlightRef.current) {
      queuedFetchKeyRef.current = fetchKey;
      return;
    }

    historyFetchInFlightRef.current = true;
    queuedFetchKeyRef.current = null;
    setLoading(true);

    void runHistoryFetch(fetchKey, dateRange.start, dateRange.end, activeTab, timeFrame);
  }, [isConnected, activeTab, timeFrame, selectedDate, dateRange.start, dateRange.end]);

  // Navigate to previous period
  const navigatePrev = () => {
    const newDate = new Date(selectedDate);
    switch (timeFrame) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setSelectedDate(newDate);
  };

  // Navigate to next period
  const navigateNext = () => {
    const newDate = new Date(selectedDate);
    const now = new Date();
    switch (timeFrame) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    // Don't go beyond today
    if (newDate <= now) {
      setSelectedDate(newDate);
    }
  };

  // Check if can navigate next (not beyond today)
  const canNavigateNext = useMemo(() => {
    const now = new Date();
    switch (timeFrame) {
      case 'day':
        return selectedDate.toDateString() !== now.toDateString();
      case 'week':
        const nextWeek = new Date(selectedDate);
        nextWeek.setDate(nextWeek.getDate() + 7);
        return nextWeek <= now;
      case 'month':
        return selectedDate.getMonth() !== now.getMonth() || selectedDate.getFullYear() !== now.getFullYear();
      default:
        return true;
    }
  }, [selectedDate, timeFrame]);

  // Format date range for display
  const dateRangeLabel = useMemo(() => {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const optsWithYear: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    
    switch (timeFrame) {
      case 'day':
        const isToday = selectedDate.toDateString() === new Date().toDateString();
        const isYesterday = new Date(Date.now() - 86400000).toDateString() === selectedDate.toDateString();
        if (isToday) return 'Today';
        if (isYesterday) return 'Yesterday';
        return selectedDate.toLocaleDateString('en-US', optsWithYear);
      case 'week':
        const weekStart = new Date(selectedDate);
        weekStart.setDate(weekStart.getDate() - 6);
        return `${weekStart.toLocaleDateString('en-US', opts)} - ${selectedDate.toLocaleDateString('en-US', opts)}`;
      case 'month':
        return selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      default:
        return '';
    }
  }, [selectedDate, timeFrame]);

  // Filter history by date range and zone
  const filteredHistory = useMemo(() => {
    return wateringHistory
      .filter(entry => {
        const inTimeRange = entry.timestamp >= dateRange.start && entry.timestamp <= dateRange.end;
        const matchesZone = selectedZone === null || entry.channel_id === selectedZone;
        return inTimeRange && matchesZone;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [wateringHistory, dateRange, selectedZone]);

  // Calculate totals
  const totalConsumption = useMemo(() => {
    return filteredHistory.reduce((sum, entry) => sum + (entry.actual_value_ml || 0), 0);
  }, [filteredHistory]);

  const successfulSessions = useMemo(() => {
    return filteredHistory.filter(e => e.success_status === 1).length;
  }, [filteredHistory]);

  const skippedSessions = useMemo(() => {
    return filteredHistory.filter(e => e.event_type === 2).length;
  }, [filteredHistory]);

  // Generate Recharts-compatible watering chart data
  const wateringChartData = useMemo(() => {
    const bucketCount = timeFrame === 'day' ? 24 : timeFrame === 'week' ? 7 : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const bucketMs = timeFrame === 'day' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    let baseDate: Date;
    if (timeFrame === 'month') {
      baseDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    } else if (timeFrame === 'week') {
      baseDate = new Date(selectedDate);
      baseDate.setDate(baseDate.getDate() - 6);
      baseDate.setHours(0, 0, 0, 0);
    } else {
      baseDate = new Date(selectedDate);
      baseDate.setHours(0, 0, 0, 0);
    }
    
    const data: { name: string; volume: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      let bucketStart: number, bucketEnd: number;
      
      if (timeFrame === 'day') {
        bucketStart = baseDate.getTime() + i * bucketMs;
        bucketEnd = bucketStart + bucketMs;
      } else if (timeFrame === 'week') {
        const dayStart = new Date(baseDate);
        dayStart.setDate(dayStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        bucketStart = dayStart.getTime();
        bucketEnd = bucketStart + 24 * 60 * 60 * 1000;
      } else {
        const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
        bucketStart = dayStart.getTime();
        bucketEnd = bucketStart + 24 * 60 * 60 * 1000;
      }
      
      const bucketTotal = wateringHistory
        .filter(e => {
          const entryMs = e.timestamp * 1000;
          return entryMs >= bucketStart && entryMs < bucketEnd && 
                 (selectedZone === null || e.channel_id === selectedZone);
        })
        .reduce((sum, e) => sum + (e.actual_value_ml || 0), 0);
      
      // Generate label
      let label: string;
      if (timeFrame === 'day') {
        label = `${i}:00`;
      } else if (timeFrame === 'week') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayDate = new Date(baseDate);
        dayDate.setDate(dayDate.getDate() + i);
        label = days[dayDate.getDay()];
      } else {
        label = `${i + 1}`;
      }
      
      data.push({ name: label, volume: bucketTotal / 1000 }); // Convert to liters
    }
    
    return data;
  }, [wateringHistory, timeFrame, selectedZone, selectedDate]);

  // Dedupe zones by channel_id to prevent duplicate keys
  const configuredZones = useMemo(() => {
    const filtered = zones.filter(z => z.name && z.name.trim() !== '');
    const seen = new Set<number>();
    return filtered.filter(z => {
      if (seen.has(z.channel_id)) return false;
      seen.add(z.channel_id);
      return true;
    });
  }, [zones]);

  // Combine rain history (hourly + daily) sorted by timestamp
  const combinedRainHistory = useMemo(() => {
    const hourly = rainHistoryHourly.map(e => ({ 
      timestamp: e.hour_epoch,
      rainfall_mm: e.rainfall_mm_x100 / 100,
      type: 'hourly' as const 
    }));
    const daily = rainHistoryDaily.map(e => ({ 
      timestamp: e.day_epoch,
      rainfall_mm: e.total_rainfall_mm_x100 / 100,
      type: 'daily' as const,
      active_hours: e.active_hours
    }));
    return [...hourly, ...daily].sort((a, b) => b.timestamp - a.timestamp);
  }, [rainHistoryHourly, rainHistoryDaily]);

  // Filter rain history by date range
  const filteredRainHistory = useMemo(() => {
    if (combinedRainHistory.length === 0) return [];
    return combinedRainHistory.filter(entry => entry.timestamp >= dateRange.start && entry.timestamp <= dateRange.end);
  }, [combinedRainHistory, dateRange]);

  // Filter environment history by date range
  const filteredEnvDetailed = useMemo(() => {
    if (!envHistoryDetailed || envHistoryDetailed.length === 0) return [];
    return envHistoryDetailed
      .filter(entry => entry.timestamp >= dateRange.start && entry.timestamp <= dateRange.end)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [envHistoryDetailed, dateRange]);

  const filteredEnvHourly = useMemo(() => {
    if (!envHistoryHourly || envHistoryHourly.length === 0) return [];
    return envHistoryHourly
      .filter(entry => entry.timestamp >= dateRange.start && entry.timestamp <= dateRange.end)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [envHistoryHourly, dateRange]);

  const filteredEnvDaily = useMemo(() => {
    if (!envHistoryDaily || envHistoryDaily.length === 0) return [];

    const dateCodeToEpochSeconds = (dateCode: number) => {
      const s = String(dateCode).padStart(8, '0');
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      return Math.floor(new Date(y, m - 1, d, 0, 0, 0, 0).getTime() / 1000);
    };

    return envHistoryDaily
      .map((entry: any) => ({ ...entry, timestamp: dateCodeToEpochSeconds(entry.date_code) }))
      .filter((entry: any) => entry.timestamp >= dateRange.start && entry.timestamp <= dateRange.end)
      .sort((a: any, b: any) => b.timestamp - a.timestamp);
  }, [envHistoryDaily, dateRange]);

  // Generate Recharts-compatible rain chart data
  const rainChartData = useMemo(() => {
    const bucketCount = timeFrame === 'day' ? 24 : timeFrame === 'week' ? 7 : new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const bucketMs = timeFrame === 'day' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    
    let baseDate: Date;
    if (timeFrame === 'month') {
      baseDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    } else if (timeFrame === 'week') {
      baseDate = new Date(selectedDate);
      baseDate.setDate(baseDate.getDate() - 6);
      baseDate.setHours(0, 0, 0, 0);
    } else {
      baseDate = new Date(selectedDate);
      baseDate.setHours(0, 0, 0, 0);
    }
    
    const data: { name: string; rainfall: number }[] = [];
    for (let i = 0; i < bucketCount; i++) {
      let bucketStart: number, bucketEnd: number;
      
      if (timeFrame === 'day') {
        bucketStart = baseDate.getTime() + i * bucketMs;
        bucketEnd = bucketStart + bucketMs;
      } else if (timeFrame === 'week') {
        const dayStart = new Date(baseDate);
        dayStart.setDate(dayStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        bucketStart = dayStart.getTime();
        bucketEnd = bucketStart + 24 * 60 * 60 * 1000;
      } else {
        const dayStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
        bucketStart = dayStart.getTime();
        bucketEnd = bucketStart + 24 * 60 * 60 * 1000;
      }
      
      const bucketTotal = combinedRainHistory
        .filter(e => {
          const entryMs = e.timestamp * 1000;
          return entryMs >= bucketStart && entryMs < bucketEnd;
        })
        .reduce((sum, e) => sum + e.rainfall_mm, 0);
      
      let label: string;
      if (timeFrame === 'day') {
        label = `${i}:00`;
      } else if (timeFrame === 'week') {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayDate = new Date(baseDate);
        dayDate.setDate(dayDate.getDate() + i);
        label = days[dayDate.getDay()];
      } else {
        label = `${i + 1}`;
      }
      
      data.push({ name: label, rainfall: Math.round(bucketTotal * 10) / 10 });
    }
    
    return data;
  }, [combinedRainHistory, timeFrame, selectedDate]);

  // Generate Recharts-compatible environment chart data
  const envChartData = useMemo(() => {
    const isDay = timeFrame === 'day';
    const useDaily = !isDay && (timeFrame === 'month' || filteredEnvHourly.length === 0);
    const source: any[] = isDay ? filteredEnvDetailed : (useDaily ? filteredEnvDaily : filteredEnvHourly);
    if (source.length === 0) return [];

    // Take samples, sorted oldest to newest for chart
    const samples = [...source]
      .slice(0, 100)
      .reverse()
      .map((entry: any) => {
        const d = new Date(entry.timestamp * 1000);
        const label = isDay
          ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        const temperature = isDay
          ? Math.round((entry.temperature_c_x100 / 100) * 10) / 10
          : Math.round((entry.temp_avg_x100 / 100) * 10) / 10;
        const humidity = isDay
          ? Math.round(entry.humidity_pct_x100 / 100)
          : Math.round(entry.humidity_avg_x100 / 100);

        return { name: label, temperature, humidity };
      });

    return samples;
  }, [timeFrame, filteredEnvDetailed, filteredEnvHourly, filteredEnvDaily]);

  // Total rain for period
  const totalRain = useMemo(() => {
    return filteredRainHistory.reduce((sum, e) => sum + e.rainfall_mm, 0);
  }, [filteredRainHistory]);

  // Average environment values
  const envAverages = useMemo(() => {
    const isDay = timeFrame === 'day';
    const useDaily = !isDay && (timeFrame === 'month' || filteredEnvHourly.length === 0);
    const source: any[] = isDay ? filteredEnvDetailed : (useDaily ? filteredEnvDaily : filteredEnvHourly);
    if (source.length === 0) return { temp: 0, humidity: 0, count: 0 };

    const sumTemp = source.reduce((s, e) => s + (isDay ? e.temperature_c_x100 : e.temp_avg_x100), 0);
    const sumHum = source.reduce((s, e) => s + (isDay ? e.humidity_pct_x100 : e.humidity_avg_x100), 0);
    return {
      temp: (sumTemp / source.length / 100),
      humidity: (sumHum / source.length / 100),
      count: source.length,
    };
  }, [timeFrame, filteredEnvDetailed, filteredEnvHourly, filteredEnvDaily]);

  return (
    <div className="flex flex-col h-screen bg-mobile-bg-dark text-white overflow-hidden">
      {/* Top App Bar */}
      <header className="sticky top-0 z-50 bg-mobile-bg-dark/90 backdrop-blur-md transition-colors safe-area-top shrink-0">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-extrabold tracking-tight">History</h1>
          <button 
            onClick={() => bleService.queryWateringHistory()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-mobile-surface-dark text-gray-300 hover:bg-white/10 transition-colors"
          >
            <span className={`material-symbols-outlined ${loading ? 'animate-spin' : ''}`}>
              {loading ? 'progress_activity' : 'refresh'}
            </span>
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex px-4 gap-2 pb-3">
          {([
            { id: 'watering' as HistoryTab, label: 'Watering', icon: 'water_drop' },
            { id: 'rain' as HistoryTab, label: 'Rain', icon: 'rainy' },
            { id: 'environment' as HistoryTab, label: 'Environment', icon: 'thermostat' },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-mobile-primary text-mobile-bg-dark'
                  : 'bg-mobile-surface-dark text-gray-400 hover:bg-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 overscroll-contain">
        
        {/* Shared Controls - TimeFrame & Date Navigation */}
        <section className="px-4 py-4 space-y-3">
          {/* Segmented Control for Day/Week/Month */}
          <div className="bg-mobile-surface-dark p-1 rounded-full flex relative shadow-sm">
            {(['day', 'week', 'month'] as TimeFrame[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFrame(tf)}
                className={`flex-1 py-2 px-4 rounded-full text-sm font-semibold transition-all capitalize ${
                  timeFrame === tf
                    ? 'bg-mobile-border-dark text-white shadow-md'
                    : 'text-gray-500'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center justify-between bg-mobile-surface-dark rounded-2xl p-3 border border-mobile-border-dark">
            <button
              onClick={navigatePrev}
              className="w-10 h-10 rounded-full bg-mobile-bg-dark flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            
            <div className="text-center">
              <p className="text-white font-bold text-lg">{dateRangeLabel}</p>
              <p className="text-mobile-text-muted text-xs">
                {timeFrame === 'day' ? '24 hours' : timeFrame === 'week' ? '7 days' : 'Full month'}
              </p>
            </div>
            
            <button
              onClick={navigateNext}
              disabled={!canNavigateNext}
              className={`w-10 h-10 rounded-full bg-mobile-bg-dark flex items-center justify-center transition-colors ${
                canNavigateNext 
                  ? 'text-gray-400 hover:text-white hover:bg-white/10' 
                  : 'text-gray-700 cursor-not-allowed'
              }`}
            >
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>

          {/* Zone Filter - only for watering */}
          {activeTab === 'watering' && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setSelectedZone(null)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                  selectedZone === null
                    ? 'bg-mobile-primary text-mobile-bg-dark font-bold'
                    : 'bg-mobile-surface-dark border border-mobile-border-dark text-gray-400 font-medium'
                }`}
              >
                <span>All Zones</span>
              </button>
              {configuredZones.map((zone) => (
                <button
                  key={zone.channel_id}
                  onClick={() => setSelectedZone(zone.channel_id)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors ${
                    selectedZone === zone.channel_id
                      ? 'bg-mobile-primary text-mobile-bg-dark font-bold'
                      : 'bg-mobile-surface-dark border border-mobile-border-dark text-gray-400 font-medium hover:bg-white/5'
                  }`}
                >
                  {zone.name || `Zone ${zone.channel_id + 1}`}
                </button>
              ))}
            </div>
          )}
        </section>
        
        {/* Watering Tab */}
        {activeTab === 'watering' && (
          <section className="px-4 space-y-4">
            {/* Stats Summary */}
            <div className="bg-mobile-surface-dark rounded-[2rem] p-6 border border-mobile-border-dark">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-mobile-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-mobile-primary text-2xl">water_drop</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Total Consumption</p>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                      {(totalConsumption / 1000).toFixed(1)} <span className="text-lg text-gray-500 font-semibold">L</span>
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-mobile-primary text-sm font-bold">{successfulSessions} sessions</p>
                  {skippedSessions > 0 && (
                    <p className="text-orange-400 text-xs">{skippedSessions} skipped</p>
                  )}
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-56 min-w-0">
                {wateringChartData.some(d => d.volume > 0) ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <AreaChart data={wateringChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="wateringGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#13ec37" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#13ec37" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888', fontSize: 11 }}
                        interval={timeFrame === 'month' ? 4 : 'preserveStartEnd'}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888', fontSize: 11 }}
                        tickFormatter={(v) => `${v}L`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#888' }}
                        formatter={(value: number) => [`${value.toFixed(2)} L`, 'Volume']}
                      />
                      <Area
                        type="monotone"
                        dataKey="volume"
                        stroke="#13ec37"
                        strokeWidth={2}
                        fill="url(#wateringGradient)"
                        dot={false}
                        activeDot={{ r: 6, fill: '#13ec37', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">water_drop</span>
                    <p className="text-mobile-text-muted">No watering data for this period</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Rain Tab */}
        {activeTab === 'rain' && (
          <section className="px-4 space-y-4">
            {/* Stats Summary */}
            <div className="bg-mobile-surface-dark rounded-[2rem] p-6 border border-mobile-border-dark">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-blue-400 text-2xl">rainy</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Total Rainfall</p>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white">
                      {totalRain.toFixed(1)} <span className="text-lg text-gray-500 font-semibold">mm</span>
                    </h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-blue-400 text-sm font-bold">{filteredRainHistory.length} events</p>
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-56 min-w-0">
                {rainChartData.some(d => d.rainfall > 0) ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={rainChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888', fontSize: 11 }}
                        interval={timeFrame === 'month' ? 4 : 'preserveStartEnd'}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888', fontSize: 11 }}
                        tickFormatter={(v) => `${v}mm`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#888' }}
                        formatter={(value: number) => [`${value.toFixed(1)} mm`, 'Rainfall']}
                      />
                      <Bar
                        dataKey="rainfall"
                        fill="url(#rainGradient)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">cloud_off</span>
                    <p className="text-mobile-text-muted">No rain data for this period</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Environment Tab */}
        {activeTab === 'environment' && (
          <section className="px-4 space-y-4">
            {/* Current Values */}
            {envData && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-center">
                  <span className="material-symbols-outlined text-orange-400 text-2xl mb-1 block">thermostat</span>
                  <p className="text-white text-2xl font-bold">{envData.temperature.toFixed(1)}°C</p>
                  <p className="text-mobile-text-muted text-xs">Current Temp</p>
                </div>
                <div className="bg-mobile-surface-dark rounded-2xl p-4 border border-mobile-border-dark text-center">
                  <span className="material-symbols-outlined text-blue-400 text-2xl mb-1 block">humidity_percentage</span>
                  <p className="text-white text-2xl font-bold">{envData.humidity.toFixed(0)}%</p>
                  <p className="text-mobile-text-muted text-xs">Current Humidity</p>
                </div>
              </div>
            )}

            {/* History Chart */}
            <div className="bg-mobile-surface-dark rounded-[2rem] p-6 border border-mobile-border-dark">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-orange-400 text-2xl">thermostat</span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm font-medium">Average Values</p>
                    <div className="flex items-center gap-4">
                      <span className="text-orange-400 font-bold">{envAverages.temp.toFixed(1)}°C</span>
                      <span className="text-blue-400 font-bold">{envAverages.humidity.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">{envAverages.count} readings</p>
                </div>
              </div>

              {/* Chart */}
              <div className="w-full h-56 min-w-0">
                {envChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <LineChart data={envChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#888', fontSize: 10 }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="temp"
                        orientation="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#f97316', fontSize: 11 }}
                        tickFormatter={(v) => `${v}°`}
                        domain={['dataMin - 2', 'dataMax + 2']}
                      />
                      <YAxis
                        yAxisId="humidity"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#3b82f6', fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          borderRadius: '12px',
                          color: '#fff',
                        }}
                        labelStyle={{ color: '#888' }}
                      />
                      <Legend
                        wrapperStyle={{ paddingTop: 16 }}
                        formatter={(value) => <span style={{ color: '#888', fontSize: 12 }}>{value}</span>}
                      />
                      <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="temperature"
                        name="Temperature (°C)"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                      />
                      <Line
                        yAxisId="humidity"
                        type="monotone"
                        dataKey="humidity"
                        name="Humidity (%)"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">show_chart</span>
                    <p className="text-mobile-text-muted">No environment data for this period</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Spacer */}
        <div className="h-8"></div>
      </div>
    </div>
  );
};

export default MobileHistory;
