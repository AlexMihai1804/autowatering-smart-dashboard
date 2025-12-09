/**
 * Charts Components Index
 * 
 * Reusable Recharts-based chart components with cyber theme styling.
 */

export { default as TemperatureHumidityChart } from './TemperatureHumidityChart';
export { default as WateringVolumeChart } from './WateringVolumeChart';
export { default as RainfallChart } from './RainfallChart';
export { default as ChannelDistributionChart } from './ChannelDistributionChart';
export { default as TrendSparkline } from './TrendSparkline';
export { default as CombinedEnvChart } from './CombinedEnvChart';

// Chart theme colors
export const CHART_COLORS = {
    primary: '#06b6d4',      // cyber-cyan - water/primary
    secondary: '#10b981',    // cyber-emerald - healthy/success
    warning: '#f59e0b',      // cyber-amber - warning
    danger: '#f43f5e',       // cyber-rose - critical/error
    temperature: '#f97316',  // orange
    humidity: '#3b82f6',     // blue
    pressure: '#8b5cf6',     // purple
    rain: '#06b6d4',         // cyan
    volume: '#10b981',       // green
    channels: [
        '#3b82f6',  // blue
        '#10b981',  // green
        '#8b5cf6',  // purple
        '#f97316',  // orange
        '#ec4899',  // pink
        '#06b6d4',  // cyan
        '#eab308',  // yellow
        '#ef4444',  // red
    ],
    grid: '#374151',         // gray-700
    axis: '#9ca3af',         // gray-400
    tooltip: {
        bg: '#1f2937',       // gray-800
        border: '#374151',   // gray-700
        text: '#f9fafb'      // gray-50
    }
};
