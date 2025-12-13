/**
 * Analytics Configuration
 * Centralized constants, colors, and utility functions for analytics dashboards
 */

// Chart color palette - consistent across all analytics
export const CHART_COLORS = {
    primary: '#635bff',
    success: '#22c55e',
    danger: '#ef4444',
    warning: '#f59e0b',
    purple: '#a855f7',
    slate: '#94a3b8',
} as const;

export const PIE_COLORS = [
    CHART_COLORS.primary,
    CHART_COLORS.success,
    CHART_COLORS.danger,
    CHART_COLORS.warning,
    CHART_COLORS.purple,
    CHART_COLORS.slate,
];

// Status label mappings for all modules
export const STATUS_LABELS = {
    // Enquiries
    enquiry: {
        new: 'New',
        contacted: 'Contacted',
        qualified: 'Qualified',
        won: 'Won',
        lost: 'Lost',
        converted: 'Converted',
    },
    // Orders
    order: {
        draft: 'Draft',
        pending: 'Pending',
        confirmed: 'Confirmed',
        shipped: 'Shipped',
        delivered: 'Delivered',
        completed: 'Completed',
        cancelled: 'Cancelled',
    },
    // Proforma Invoices
    proforma: {
        draft: 'Draft',
        sent: 'Sent',
        approved: 'Approved',
        revised: 'Revised',
        rejected: 'Rejected',
        converted: 'Converted',
    },
    // Shipping Bills
    shippingBill: {
        drafted: 'Drafted',
        filed: 'Filed',
        cleared: 'Cleared',
        shipped: 'Shipped',
    },
    // Purchase Orders
    purchaseOrder: {
        draft: 'Draft',
        issued: 'Issued',
        received: 'Received',
        cancelled: 'Cancelled',
    },
} as const;

// Chart configuration defaults
export const CHART_CONFIG = {
    cartesianGrid: {
        strokeDasharray: '3 3',
        className: 'stroke-muted',
    },
    axis: {
        stroke: '#888888',
        fontSize: 12,
        tickLine: false,
        axisLine: false,
    },
    tooltip: {
        contentStyle: {
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--foreground))',
        },
    },
    pie: {
        innerRadius: 60,
        outerRadius: 80,
        paddingAngle: 5,
    },
} as const;

// Utility functions
export const formatCurrency = (value: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(value);
};

export const formatDate = (
    date: string | Date,
    options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
): string => {
    return new Date(date).toLocaleDateString(undefined, options);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
    return `${value.toFixed(decimals)}%`;
};

export const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('en-US').format(value);
};
