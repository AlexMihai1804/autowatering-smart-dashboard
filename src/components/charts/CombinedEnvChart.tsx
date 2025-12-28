/**
 * Combined Environmental Chart Component
 * 
 * Multi-line chart showing all environmental data (temp, humidity, pressure)
 * with interactive legend for toggling data series.
 */

import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    Brush
} from 'recharts';
import { CHART_COLORS } from './index';

interface EnvDataPoint {
    timestamp: number;
    label?: string;
    temperature?: number;
    humidity?: number;
    pressure?: number;
}

interface CombinedEnvChartProps {
    data: EnvDataPoint[];
    height?: number;
    showLegend?: boolean;
    showGrid?: boolean;
    showBrush?: boolean;
    enabledSeries?: {
        temperature: boolean;
        humidity: boolean;
        pressure: boolean;
    };
    animate?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl min-w-[140px]">
                <p className="text-gray-400 text-xs mb-2 border-b border-gray-700 pb-2">{label}</p>
                <div className="space-y-1.5">
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-3 text-sm">
                            <div className="flex items-center gap-2">
                                <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ backgroundColor: entry.color }}
                                />
                                <span className="text-gray-300">{entry.name}</span>
                            </div>
                            <span className="text-white font-medium">
                                {formatValue(entry.name, entry.value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

function formatValue(name: string, value: number): string {
    if (name.toLowerCase().includes('temp')) {
        return `${value.toFixed(1)}°C`;
    }
    if (name.toLowerCase().includes('humid')) {
        return `${value.toFixed(0)}%`;
    }
    if (name.toLowerCase().includes('press')) {
        return `${value.toFixed(0)} hPa`;
    }
    return value.toFixed(1);
}

const CombinedEnvChart: React.FC<CombinedEnvChartProps> = ({
    data,
    height = 350,
    showLegend = true,
    showGrid = true,
    showBrush = false,
    enabledSeries = { temperature: true, humidity: true, pressure: false },
    animate = true
}) => {
    const [activeSeries, setActiveSeries] = useState(enabledSeries);

    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">🌡️</p>
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
        })
    }));

    const handleLegendClick = (e: any) => {
        const dataKey = e.dataKey.toLowerCase();
        if (dataKey.includes('temp')) {
            setActiveSeries(prev => ({ ...prev, temperature: !prev.temperature }));
        } else if (dataKey.includes('humid')) {
            setActiveSeries(prev => ({ ...prev, humidity: !prev.humidity }));
        } else if (dataKey.includes('press')) {
            setActiveSeries(prev => ({ ...prev, pressure: !prev.pressure }));
        }
    };

    return (
        <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 50, left: 0, bottom: showBrush ? 40 : 0 }}
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
                    
                    {/* Temperature Y-axis (left) */}
                    {activeSeries.temperature && (
                        <YAxis 
                            yAxisId="temp"
                            stroke={CHART_COLORS.temperature}
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: CHART_COLORS.grid }}
                            tickFormatter={(value) => `${value}°`}
                            domain={['dataMin - 2', 'dataMax + 2']}
                        />
                    )}
                    
                    {/* Humidity Y-axis (right) */}
                    {activeSeries.humidity && (
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
                    )}
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    {showLegend && (
                        <Legend 
                            wrapperStyle={{ paddingTop: 10 }}
                            onClick={handleLegendClick}
                            formatter={(value, entry: any) => (
                                <span 
                                    className={`text-xs cursor-pointer ${
                                        entry.inactive ? 'text-gray-600 line-through' : 'text-gray-400'
                                    }`}
                                >
                                    {value}
                                </span>
                            )}
                        />
                    )}

                    {showBrush && (
                        <Brush
                            dataKey="label"
                            height={30}
                            stroke={CHART_COLORS.primary}
                            fill="rgba(6, 182, 212, 0.1)"
                            tickFormatter={() => ''}
                        />
                    )}

                    {activeSeries.temperature && (
                        <Line
                            yAxisId="temp"
                            type="monotone"
                            dataKey="temperature"
                            stroke={CHART_COLORS.temperature}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, fill: CHART_COLORS.temperature }}
                            name="Temperature"
                            isAnimationActive={animate}
                            animationDuration={800}
                        />
                    )}

                    {activeSeries.humidity && (
                        <Line
                            yAxisId="humidity"
                            type="monotone"
                            dataKey="humidity"
                            stroke={CHART_COLORS.humidity}
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            dot={false}
                            activeDot={{ r: 4, fill: CHART_COLORS.humidity }}
                            name="Humidity"
                            isAnimationActive={animate}
                            animationDuration={800}
                        />
                    )}

                    {activeSeries.pressure && (
                        <Line
                            yAxisId="temp"
                            type="monotone"
                            dataKey="pressure"
                            stroke={CHART_COLORS.pressure}
                            strokeWidth={2}
                            strokeDasharray="3 3"
                            dot={false}
                            activeDot={{ r: 4, fill: CHART_COLORS.pressure }}
                            name="Pressure"
                            isAnimationActive={animate}
                            animationDuration={800}
                        />
                    )}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default CombinedEnvChart;
