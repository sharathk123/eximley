/**
 * AnalyticsPieChart Component
 * Reusable pie chart for analytics status distribution
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { CHART_CONFIG, PIE_COLORS } from '@/lib/analytics/analytics-config';
import { PieChartData } from '@/lib/analytics/analytics-types';

interface AnalyticsPieChartProps {
    title: string;
    data: PieChartData[];
    colors?: string[];
}

export function AnalyticsPieChart({
    title,
    data,
    colors = PIE_COLORS,
}: AnalyticsPieChartProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                {...CHART_CONFIG.pie}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                                ))}
                            </Pie>
                            <Tooltip {...CHART_CONFIG.tooltip} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
