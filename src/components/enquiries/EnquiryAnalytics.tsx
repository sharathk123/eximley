/**
 * EnquiryAnalytics Component
 * Analytics dashboard for enquiries module
 */

"use client";

import { Loader2, TrendingUp, Users, MessageSquare, CheckCircle2 } from 'lucide-react';
import { useAnalytics } from '@/hooks/useAnalytics';
import { EnquiryStats } from '@/lib/analytics/analytics-types';
import { AnalyticsSummaryCard } from '@/components/analytics/AnalyticsSummaryCard';
import { AnalyticsAreaChart } from '@/components/analytics/AnalyticsAreaChart';
import { AnalyticsPieChart } from '@/components/analytics/AnalyticsPieChart';
import { CHART_COLORS, STATUS_LABELS, formatPercentage } from '@/lib/analytics/analytics-config';

export function EnquiryAnalytics() {
    const { stats, loading, error } = useAnalytics<EnquiryStats>('/api/enquiries/stats');

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
            name: STATUS_LABELS.enquiry[status as keyof typeof STATUS_LABELS.enquiry] || status,
            value: count,
        }));

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <AnalyticsSummaryCard
                    title="Total Enquiries"
                    value={stats.totalEnquiries}
                    description="Lifetime enquiries received"
                    icon={MessageSquare}
                />
                <AnalyticsSummaryCard
                    title="Active Enquiries"
                    value={stats.activeEnquiries}
                    description="In progress"
                    icon={Users}
                />
                <AnalyticsSummaryCard
                    title="Conversion Rate"
                    value={formatPercentage(stats.conversionRate)}
                    description="Enquiries to Quotes"
                    icon={TrendingUp}
                />
                <AnalyticsSummaryCard
                    title="Won Deals"
                    value={stats.statusCounts.won || 0}
                    description="Successfully closed"
                    icon={CheckCircle2}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-4 md:grid-cols-7">
                <AnalyticsAreaChart
                    title="Enquiry Activity Trend"
                    data={stats.recentActivity}
                    dataKey="count"
                    color={CHART_COLORS.primary}
                    gradientId="colorEnquiries"
                    valueFormatter={(value) => value.toString()}
                />
                <AnalyticsPieChart
                    title="Status Distribution"
                    data={pieData}
                />
            </div>
        </div>
    );
}
