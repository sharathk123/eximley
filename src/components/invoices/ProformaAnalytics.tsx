/**
 * ProformaAnalytics Component
 * Analytics dashboard for proforma invoices module
 */

"use client";

import { Loader2, TrendingUp, DollarSign, FileText, Clock } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ProformaStats } from '@/lib/analytics/analytics-types';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import { AnalyticsAreaChart } from '@/components/analytics/AnalyticsAreaChart';
import { AnalyticsPieChart } from '@/components/analytics/AnalyticsPieChart';
import { CHART_COLORS, STATUS_LABELS, formatCurrency, formatPercentage } from '@/lib/analytics/analytics-config';

export function ProformaAnalytics() {
    const { stats, loading, error } = useAnalytics<ProformaStats>('/api/invoices/proforma/stats');

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
            name: STATUS_LABELS.proforma[status as keyof typeof STATUS_LABELS.proforma] || status,
            value: count,
        }));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AnalyticsSummaryCard
                    title="Total Invoices"
                    value={stats.totalInvoices}
                    description="Lifetime proforma invoices"
                    icon={FileText}
                />
                <AnalyticsSummaryCard
                    title="Total Value"
                    value={formatCurrency(stats.totalValue)}
                    description="All-time value"
                    icon={DollarSign}
                />
                <AnalyticsSummaryCard
                    title="Pending Approval"
                    value={stats.pendingApproval}
                    description="Awaiting approval"
                    icon={Clock}
                />
                <AnalyticsSummaryCard
                    title="Conversion Rate"
                    value={formatPercentage(stats.conversionRate)}
                    description="To confirmed orders"
                    icon={TrendingUp}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-7">
                <AnalyticsAreaChart
                    title="Invoice Value Trend"
                    data={stats.recentActivity}
                    dataKey="value"
                    color={CHART_COLORS.purple}
                    gradientId="colorProforma"
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
