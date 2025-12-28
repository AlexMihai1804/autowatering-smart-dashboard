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

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        
        return (
            <div className="bg-gray-800/95 backdrop-blur-sm border border-gray-700 rounded-lg p-3 shadow-xl">
                <div className="flex items-center gap-2 mb-2">
                    <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: payload[0].payload.fill }}
                    />
                    <span className="text-white font-medium">{data.name}</span>
                </div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Volume</span>
                        <span className="text-cyan-400 font-medium">
                            {data.volume >= 1000 
                                ? `${(data.volume / 1000).toFixed(1)}L`
                                : `${data.volume}ml`
                            }
                        </span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Sessions</span>
                        <span className="text-white">{data.sessions}</span>
                    </div>
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-400">Share</span>
                        <span className="text-white">{data.percentage?.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
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
            {`${(percent * 100).toFixed(0)}%`}
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
    if (!data || data.length === 0) {
        return (
            <div 
                className="flex items-center justify-center text-gray-500 bg-gray-800/30 rounded-lg"
                style={{ height }}
            >
                <div className="text-center">
                    <p className="text-lg">📊</p>
                    <p className="text-sm mt-2">No distribution data</p>
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
                        label={showLabels ? CustomLabel : undefined}
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
                    
                    <Tooltip content={<CustomTooltip />} />
                    
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
                                ? `${(totalVolume / 1000).toFixed(1)}L`
                                : `${totalVolume}ml`
                            }
                        </div>
                        <div className="text-xs text-gray-400">Total</div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChannelDistributionChart;
