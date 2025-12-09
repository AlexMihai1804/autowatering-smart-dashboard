/**
 * Rainfall Chart Component
 * 
 * AreaChart with gradient fill for precipitation data.
 */

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { CHART_COLORS } from './index';

interface RainDataPoint {
    date: string;
    timestamp: number;
    totalMm: number;
    maxHourlyMm?: number;
}

interface RainfallChartProps {
    data: RainDataPoint[];
    height?: number;
    showGrid?: boolean;
    showAverage?: boolean;
    animate?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const entry = payload[0].payload;
        
        return (
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                <p className="text-gray-400 text-xs mb-2">{label}</p>
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-cyan-400" />
                            <span className="text-gray-300">Total</span>
                        </div>
                        <span className="text-white font-medium">
                            {entry.totalMm.toFixed(1)} mm
                        </span>
                    </div>
                    {entry.maxHourlyMm !== undefined && (
                        <div className="flex items-center justify-between gap-4 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400" />
                                <span className="text-gray-300">Max/hr</span>
                            </div>
                            <span className="text-white font-medium">
                                {entry.maxHourlyMm.toFixed(1)} mm
                            </span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
    return null;
};

const RainfallChart: React.FC<RainfallChartProps> = ({
    data,
    height = 250,
    showGrid = true,
    showAverage = true,
    animate = true
}) => {
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">🌧️</p>
                    <p className="text-sm mt-2">No rain data</p>
                </div>
            </div>
        );
    }

    // Calculate average
    const avgRainfall = data.reduce((sum, d) => sum + d.totalMm, 0) / data.length;

    // Format data for chart
    const chartData = data.map(d => ({
        ...d,
        label: formatDate(d.date)
    }));

    function formatDate(dateStr: string): string {
        if (dateStr.includes('T')) {
            const parts = dateStr.split('T');
            return `${parts[1]}:00`;
        }
        const date = new Date(dateStr);
        return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' });
    }

    const gradientId = 'rainGradient';

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS.rain} stopOpacity={0.6} />
                            <stop offset="50%" stopColor={CHART_COLORS.rain} stopOpacity={0.2} />
                            <stop offset="100%" stopColor={CHART_COLORS.rain} stopOpacity={0.05} />
                        </linearGradient>
                    </defs>

                    {showGrid && (
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={CHART_COLORS.grid}
                            opacity={0.3}
                            vertical={false}
                        />
                    )}
                    
                    <XAxis 
                        dataKey="label"
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                    />
                    
                    <YAxis 
                        stroke={CHART_COLORS.axis}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickFormatter={(value) => `${value}mm`}
                        domain={[0, 'auto']}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />

                    {showAverage && avgRainfall > 0 && (
                        <ReferenceLine 
                            y={avgRainfall} 
                            stroke={CHART_COLORS.warning}
                            strokeDasharray="5 5"
                            strokeWidth={1}
                        />
                    )}

                    <Area
                        type="monotone"
                        dataKey="totalMm"
                        stroke={CHART_COLORS.rain}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        isAnimationActive={animate}
                        animationDuration={800}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RainfallChart;
