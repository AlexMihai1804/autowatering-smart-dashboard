/**
 * Channel Distribution Chart Component
 * 
 * PieChart showing water volume distribution across channels/zones.
 */

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';
import { CHART_COLORS } from './index';
import { useI18n } from '../../i18n';

interface ChannelData {
    channelId: number;
    name: string;
    volume: number;
    sessions: number;
    percentage?: number;
}

interface ChannelDistributionChartProps {
    data: ChannelData[];
    height?: number;
    showLegend?: boolean;
    showLabels?: boolean;
    innerRadius?: number;
    animate?: boolean;
}

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, percentUnit }: any) => {
    if (percent < 0.05) return null; // Don't show label for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text
            x={x}
            y={y}
            fill="white"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={11}
            fontWeight={500}
        >
            {`${(percent * 100).toFixed(0)}${percentUnit}`}
        </text>
    );
};

const ChannelDistributionChart: React.FC<ChannelDistributionChartProps> = ({
    data,
    height = 280,
    showLegend = true,
    showLabels = true,
    innerRadius = 50,
    animate = true
}) => {
    const { t } = useI18n();
    const percentUnit = t('common.percent');
    const litersShort = t('common.litersShort');
    const mlShort = t('common.mlShort');
    const renderLabel = (props: any) => <CustomLabel {...props} percentUnit={percentUnit} />;
    const renderTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const chartPayload = payload[0].payload;

            return (
                <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: payload[0].payload.fill }}
                        />
                        <span className="text-white font-medium">{chartPayload.name}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">{t('labels.volume')}</span>
                            <span className="text-cyan-400 font-medium">
                                {chartPayload.volume >= 1000
                                    ? `${(chartPayload.volume / 1000).toFixed(1)}${litersShort}`
                                    : `${chartPayload.volume}${mlShort}`
                                }
                            </span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">{t('labels.sessions')}</span>
                            <span className="text-white">{chartPayload.sessions}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                            <span className="text-gray-400">{t('charts.share')}</span>
                            <span className="text-white">{chartPayload.percentage?.toFixed(1)}{percentUnit}</span>
                        </div>
                    </div>
                </div>
            );
        }
        return null;
    };
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">{t('common.notAvailable')}</p>
                    <p className="text-sm mt-2">{t('charts.noDistributionData')}</p>
                </div>
            </div>
        );
    }

    // Calculate percentages
    const totalVolume = data.reduce((sum, d) => sum + d.volume, 0);
    const chartData = data.map((d, index) => ({
        ...d,
        percentage: totalVolume > 0 ? (d.volume / totalVolume) * 100 : 0,
        fill: CHART_COLORS.channels[index % CHART_COLORS.channels.length]
    }));

    return (
        <div className="w-full min-w-0 relative" style={{ height }}>
            <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={0}>
                <PieChart>
                    <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={showLabels ? renderLabel : undefined}
                        outerRadius={height / 3}
                        innerRadius={innerRadius}
                        dataKey="volume"
                        isAnimationActive={animate}
                        animationDuration={800}
                        animationBegin={0}
                    >
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.fill}
                                stroke="rgba(0,0,0,0.2)"
                                strokeWidth={1}
                            />
                        ))}
                    </Pie>
                    
                    <Tooltip content={renderTooltip} />
                    
                    {showLegend && (
                        <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            formatter={(value, entry: any) => (
                                <span className="text-gray-300 text-xs">{entry.payload.name}</span>
                            )}
                            iconType="circle"
                            iconSize={8}
                        />
                    )}
                </PieChart>
            </ResponsiveContainer>
            
            {/* Center text for donut chart */}
            {innerRadius > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">
                            {totalVolume >= 1000 
                                ? `${(totalVolume / 1000).toFixed(1)}${litersShort}`
                                : `${totalVolume}${mlShort}`
                            }
                        </div>
                        <div className="text-xs text-gray-400">{t('labels.total')}</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelDistributionChart;
