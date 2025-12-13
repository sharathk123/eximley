/**
 * PurchaseOrderAnalytics Component
 * Analytics dashboard for purchase orders module
 */

"use client";

import { Loader2, ShoppingCart, DollarSign, TrendingUp, CheckCircle2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { PurchaseOrderStats } from '@/lib/analytics/analytics-types';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import { AnalyticsAreaChart } from '@/components/analytics/AnalyticsAreaChart';
import { AnalyticsPieChart } from '@/components/analytics/AnalyticsPieChart';
import { CHART_COLORS, STATUS_LABELS, formatCurrency } from '@/lib/analytics/analytics-config';

export function PurchaseOrderAnalytics() {
    const { stats, loading, error } = useAnalytics<PurchaseOrderStats>('/api/purchase-orders/stats');

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
            name: STATUS_LABELS.purchaseOrder[status as keyof typeof STATUS_LABELS.purchaseOrder] || status,
            value: count,
        }));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AnalyticsSummaryCard
                    title="Total POs"
                    value={stats.totalPOs}
                    description="Lifetime purchase orders"
                    icon={ShoppingCart}
                />
                <AnalyticsSummaryCard
                    title="Total Spend"
                    value={formatCurrency(stats.totalSpend)}
                    description="All-time spend"
                    icon={DollarSign}
                />
                <AnalyticsSummaryCard
                    title="Avg PO Value"
                    value={formatCurrency(stats.avgPOValue)}
                    description="Per purchase order"
                    icon={TrendingUp}
                />
                <AnalyticsSummaryCard
                    title="Received"
                    value={stats.receivedPOs}
                    description="Successfully received"
                    icon={CheckCircle2}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-7">
                <AnalyticsAreaChart
                    title="Spend Trend"
                    data={stats.recentActivity}
                    dataKey="amount"
                    color={CHART_COLORS.danger}
                    gradientId="colorPurchase"
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
