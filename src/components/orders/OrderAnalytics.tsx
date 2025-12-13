/**
 * OrderAnalytics Component
 * Analytics dashboard for orders module
 */

"use client";

import { Loader2, TrendingUp, DollarSign, Package, CheckCircle2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { OrderStats } from '@/lib/analytics/analytics-types';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import { AnalyticsAreaChart } from '@/components/analytics/AnalyticsAreaChart';
import { AnalyticsPieChart } from '@/components/analytics/AnalyticsPieChart';
import { CHART_COLORS, STATUS_LABELS, formatCurrency } from '@/lib/analytics/analytics-config';

export function OrderAnalytics() {
    const { stats, loading, error } = useAnalytics<OrderStats>('/api/orders/stats');

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
            name: STATUS_LABELS.order[status as keyof typeof STATUS_LABELS.order] || status,
            value: count,
        }));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AnalyticsSummaryCard
                    title="Total Orders"
                    value={stats.totalOrders}
                    description="Lifetime orders"
                    icon={Package}
                />
                <AnalyticsSummaryCard
                    title="Total Revenue"
                    value={formatCurrency(stats.totalRevenue)}
                    description="All-time revenue"
                    icon={DollarSign}
                />
                <AnalyticsSummaryCard
                    title="Avg Order Value"
                    value={formatCurrency(stats.avgOrderValue)}
                    description="Per order"
                    icon={TrendingUp}
                />
                <AnalyticsSummaryCard
                    title="Delivered"
                    value={stats.statusCounts.delivered || 0}
                    description="Successfully completed"
                    icon={CheckCircle2}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-7">
                <AnalyticsAreaChart
                    title="Revenue Trend"
                    data={stats.recentActivity}
                    dataKey="amount"
                    color={CHART_COLORS.success}
                    gradientId="colorRevenue"
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
