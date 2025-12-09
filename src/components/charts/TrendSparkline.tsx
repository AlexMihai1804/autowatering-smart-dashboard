/**
 * Trend Sparkline Component
 * 
 * Mini inline chart for showing trend indicators in cards.
 */

import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { CHART_COLORS } from './index';

interface TrendSparklineProps {
    data: number[];
    color?: string;
    height?: number;
    width?: number | string;
    showDots?: boolean;
    strokeWidth?: number;
}

const TrendSparkline: React.FC<TrendSparklineProps> = ({
    data,
    color = CHART_COLORS.primary,
    height = 32,
    width = 80,
    showDots = false,
    strokeWidth = 2
}) => {
    if (!data || data.length === 0) {
        return (
            <div 
                style={{ width, height }} 
                className="flex items-center justify-center text-gray-500 text-xs"
            >
                --
            </div>
        );
    }

    const chartData = data.map((value, index) => ({ value, index }));

    return (
        <div style={{ width, height }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        dot={showDots}
                        isAnimationActive={true}
                        animationDuration={500}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default TrendSparkline;
