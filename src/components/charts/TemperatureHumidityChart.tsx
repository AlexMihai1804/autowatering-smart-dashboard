/**
 * Temperature & Humidity Chart Component
 * 
 * ComposedChart showing temperature range (area) with avg line,
 * and humidity on secondary Y-axis.
 */

import React from 'react';
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { CHART_COLORS } from './index';

interface DataPoint {
    timestamp: number;
    tempAvg: number;
    tempMin: number;
    tempMax: number;
    humidity: number;
    label?: string;
}

interface TemperatureHumidityChartProps {
    data: DataPoint[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    animate?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                <p className="text-gray-400 text-xs mb-2">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: entry.color }}
                            />
                            <span className="text-gray-300">{entry.name}:</span>
                            <span className="text-white font-medium">
                                {entry.name.includes('Temp') 
                                    ? `${entry.value.toFixed(1)}°C`
                                    : `${entry.value.toFixed(0)}%`
                                }
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const TemperatureHumidityChart: React.FC<TemperatureHumidityChartProps> = ({
    data,
    height = 300,
    showLegend = true,
    showGrid = true,
    animate = true
}) => {
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">📊</p>
                    <p className="text-sm mt-2">No environmental data</p>
                </div>
            </div>
        );
    }

    // Format data for chart
    const chartData = data.map(d => ({
        ...d,
        label: d.label || new Date(d.timestamp * 1000).toLocaleTimeString('ro-RO', {
            hour: '2-digit',
            minute: '2-digit'
        }),
        tempRange: [d.tempMin, d.tempMax]
    }));

    return (
        <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    {showGrid && (
                        <CartesianGrid 
                            strokeDasharray="3 3" 
                            stroke={CHART_COLORS.grid}
                            opacity={0.3}
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
                        yAxisId="temp"
                        stroke={CHART_COLORS.temperature}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickFormatter={(value) => `${value}°`}
                        domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    
                    <YAxis 
                        yAxisId="humidity"
                        orientation="right"
                        stroke={CHART_COLORS.humidity}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickFormatter={(value) => `${value}%`}
                        domain={[0, 100]}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    {showLegend && (
                        <Legend 
                            wrapperStyle={{ paddingTop: 10 }}
                            formatter={(value) => (
                                <span className="text-gray-400 text-xs">{value}</span>
                            )}
                        />
                    )}

                    {/* Temperature range area */}
                    <Area
                        yAxisId="temp"
                        type="monotone"
                        dataKey="tempMax"
                        stroke="transparent"
                        fill={CHART_COLORS.temperature}
                        fillOpacity={0.15}
                        name="Temp Max"
                        isAnimationActive={animate}
                        animationDuration={800}
                    />
                    
                    <Area
                        yAxisId="temp"
                        type="monotone"
                        dataKey="tempMin"
                        stroke="transparent"
                        fill="#020617"
                        fillOpacity={1}
                        name="Temp Min"
                        isAnimationActive={animate}
                        animationDuration={800}
                    />

                    {/* Temperature average line */}
                    <Line
                        yAxisId="temp"
                        type="monotone"
                        dataKey="tempAvg"
                        stroke={CHART_COLORS.temperature}
                        strokeWidth={2}
                        dot={false}
                        name="Temp Avg"
                        isAnimationActive={animate}
                        animationDuration={800}
                    />

                    {/* Humidity line */}
                    <Line
                        yAxisId="humidity"
                        type="monotone"
                        dataKey="humidity"
                        stroke={CHART_COLORS.humidity}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Humidity"
                        isAnimationActive={animate}
                        animationDuration={800}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TemperatureHumidityChart;
