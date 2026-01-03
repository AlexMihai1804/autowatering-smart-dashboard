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
import { useI18n } from '../../i18n';

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
    const { t } = useI18n();
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
                                {entry.dataKey.startsWith('temp') 
                                    ? `${entry.value.toFixed(1)}${t('common.degreesC')}`
                                    : `${entry.value.toFixed(0)}${t('common.percent')}`
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
    const { t, language } = useI18n();
    const locale = language === 'ro' ? 'ro-RO' : 'en-US';
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">{t('common.notAvailable')}</p>
                    <p className="text-sm mt-2">{t('charts.noEnvironmentalData')}</p>
                </div>
            </div>
        );
    }

    // Format data for chart
    const chartData = data.map(d => ({
        ...d,
        label: d.label || new Date(d.timestamp * 1000).toLocaleTimeString(locale, {
            hour: '2-digit',
            minute: '2-digit'
        }),
        tempRange: [d.tempMin, d.tempMax]
    }));

    return (
        <div className="w-full min-w-0">
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
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
                        tickFormatter={(value) => `${value}${t('common.degreesC')}`}
                        domain={['dataMin - 2', 'dataMax + 2']}
                    />
                    
                    <YAxis 
                        yAxisId="humidity"
                        orientation="right"
                        stroke={CHART_COLORS.humidity}
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: CHART_COLORS.grid }}
                        tickFormatter={(value) => `${value}${t('common.percent')}`}
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
                        name={t('charts.tempMax')}
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
                        name={t('charts.tempMin')}
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
                        name={t('charts.tempAvg')}
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
                        name={t('labels.humidity')}
                        isAnimationActive={animate}
                        animationDuration={800}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TemperatureHumidityChart;
