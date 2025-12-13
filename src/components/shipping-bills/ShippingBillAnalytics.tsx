/**
 * ShippingBillAnalytics Component
 * Analytics dashboard for shipping bills module
 */

"use client";

import { Loader2, Ship, DollarSign, CheckCircle2, Clock } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ShippingBillStats } from '@/lib/analytics/analytics-types';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import { AnalyticsAreaChart } from '@/components/analytics/AnalyticsAreaChart';
import { AnalyticsPieChart } from '@/components/analytics/AnalyticsPieChart';
import { CHART_COLORS, STATUS_LABELS, formatCurrency } from '@/lib/analytics/analytics-config';

export function ShippingBillAnalytics() {
    const { stats, loading, error } = useAnalytics<ShippingBillStats>('/api/shipping-bills/stats');

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !stats) {
        return <div>Failed to load analytics</div>;
    }

    const pieData = Object.entries(stats.statusCounts)
        .filter(([_, count]) => count > 0)
        .map(([status, count]) => ({
            name: STATUS_LABELS.shippingBill[status as keyof typeof STATUS_LABELS.shippingBill] || status,
            value: count,
        }));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AnalyticsSummaryCard
                    title="Total Bills"
                    value={stats.totalBills}
                    description="Lifetime shipping bills"
                    icon={Ship}
                />
                <AnalyticsSummaryCard
                    title="Export Value"
                    value={formatCurrency(stats.totalExportValue)}
                    description="Total export value"
                    icon={DollarSign}
                />
                <AnalyticsSummaryCard
                    title="Cleared"
                    value={stats.clearedBills}
                    description="Successfully cleared"
                    icon={CheckCircle2}
                />
                <AnalyticsSummaryCard
                    title="Pending"
                    value={stats.pendingClearance}
                    description="Awaiting clearance"
                    icon={Clock}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-7">
                <AnalyticsAreaChart
                    title="Export Value Trend"
                    data={stats.recentActivity}
                    dataKey="value"
                    color={CHART_COLORS.warning}
                    gradientId="colorShipping"
                    valueFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <AnalyticsPieChart
                    title="Status Distribution"
                    data={pieData}
                />
            </div>
        </div>
    );
}
