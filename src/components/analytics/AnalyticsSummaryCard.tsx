/**
 * AnalyticsSummaryCard Component
 * Reusable metric card for analytics dashboards
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface AnalyticsSummaryCardProps {
    title: string;
    value: string | number;
    description: string;
    icon: LucideIcon;
    formatter?: (value: number) => string;
}

export function AnalyticsSummaryCard({
    title,
    value,
    description,
    icon: Icon,
    formatter,
}: AnalyticsSummaryCardProps) {
    const displayValue = typeof value === 'number' && formatter
        ? formatter(value)
        : value;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{displayValue}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    );
}
