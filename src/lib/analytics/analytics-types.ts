/**
 * Analytics Type Definitions
 * Shared types and interfaces for analytics dashboards
 */

// Base stats interface - common fields across all analytics
export interface BaseAnalyticsStats {
    statusCounts: Record<string, number>;
    recentActivity: Array<{ date: string;[key: string]: any }>;
}

// Module-specific stats interfaces
export interface EnquiryStats extends BaseAnalyticsStats {
    totalEnquiries: number;
    activeEnquiries: number;
    conversionRate: number;
    recentActivity: Array<{ date: string; count: number }>;
}

export interface OrderStats extends BaseAnalyticsStats {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    recentActivity: Array<{ date: string; amount: number }>;
}

export interface ProformaStats extends BaseAnalyticsStats {
    totalInvoices: number;
    totalValue: number;
    pendingApproval: number;
    conversionRate: number;
    recentActivity: Array<{ date: string; value: number }>;
}

export interface ShippingBillStats extends BaseAnalyticsStats {
    totalBills: number;
    totalExportValue: number;
    clearedBills: number;
    pendingClearance: number;
    recentActivity: Array<{ date: string; value: number }>;
}

export interface PurchaseOrderStats extends BaseAnalyticsStats {
    totalPOs: number;
    totalSpend: number;
    avgPOValue: number;
    receivedPOs: number;
    recentActivity: Array<{ date: string; amount: number }>;
}

// Analytics card configuration
export interface AnalyticsCardConfig {
    title: string;
    value: string | number;
    description: string;
    icon: any; // LucideIcon type
    formatter?: (value: number) => string;
}

// Analytics chart configuration
export interface AnalyticsChartConfig {
    title: string;
    dataKey: string;
    color: string;
    gradientId: string;
    valueFormatter?: (value: number) => string;
    labelFormatter?: (label: string) => string;
}

// Pie chart data
export interface PieChartData {
    name: string;
    value: number;
}

// API response wrapper
export interface AnalyticsResponse<T> {
    stats: T;
}
