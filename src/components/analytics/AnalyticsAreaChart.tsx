/**
 * AnalyticsAreaChart Component
 * Reusable area chart for analytics trend visualization
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import { CHART_CONFIG, formatDate } from '@/lib/analytics/analytics-config';

interface AnalyticsAreaChartProps {
    title: string;
    data: Array<{ date: string;[key: string]: any }>;
    dataKey: string;
    color: string;
    gradientId: string;
    valueFormatter?: (value: number) => string;
    labelFormatter?: (label: string) => string;
}

export function AnalyticsAreaChart({
    title,
    data,
    dataKey,
    color,
    gradientId,
    valueFormatter = (value) => value.toString(),
    labelFormatter = (label) => formatDate(label),
}: AnalyticsAreaChartProps) {
    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid {...CHART_CONFIG.cartesianGrid} />
                            <XAxis
                                dataKey="date"
                                {...CHART_CONFIG.axis}
                                tickFormatter={(value) => formatDate(value, { month: 'short', day: 'numeric' })}
                            />
                            <YAxis
                                {...CHART_CONFIG.axis}
                                tickFormatter={valueFormatter}
                            />
                            <Tooltip
                                {...CHART_CONFIG.tooltip}
                                formatter={(value: number) => [valueFormatter(value), title]}
                                labelFormatter={labelFormatter}
                            />
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                fillOpacity={1}
                                fill={`url(#${gradientId})`}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
