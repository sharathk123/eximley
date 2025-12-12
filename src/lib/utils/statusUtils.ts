/**
 * Status Utilities
 * 
 * Centralized utilities for document status management across all modules
 */

export type DocumentStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'revised'
    | 'confirmed'
    | 'shipped'
    | 'completed'
    | 'cancelled'
    | 'draft'
    | 'sent'
    | 'accepted';

export type StatusColorScheme = {
    bg: string;
    text: string;
    darkBg: string;
    darkText: string;
};

/**
 * Get color scheme for a given status
 */
export function getStatusColors(status: string): StatusColorScheme {
    const colorMap: Record<string, StatusColorScheme> = {
        pending: {
            bg: 'bg-yellow-100',
            text: 'text-yellow-800',
            darkBg: 'dark:bg-yellow-900',
            darkText: 'dark:text-yellow-200',
        },
        approved: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            darkBg: 'dark:bg-green-900',
            darkText: 'dark:text-green-200',
        },
        rejected: {
            bg: 'bg-red-100',
            text: 'text-red-800',
            darkBg: 'dark:bg-red-900',
            darkText: 'dark:text-red-200',
        },
        revised: {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            darkBg: 'dark:bg-gray-900',
            darkText: 'dark:text-gray-200',
        },
        confirmed: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            darkBg: 'dark:bg-blue-900',
            darkText: 'dark:text-blue-200',
        },
        shipped: {
            bg: 'bg-purple-100',
            text: 'text-purple-800',
            darkBg: 'dark:bg-purple-900',
            darkText: 'dark:text-purple-200',
        },
        completed: {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            darkBg: 'dark:bg-gray-900',
            darkText: 'dark:text-gray-200',
        },
        cancelled: {
            bg: 'bg-gray-100',
            text: 'text-gray-800',
            darkBg: 'dark:bg-gray-900',
            darkText: 'dark:text-gray-200',
        },
        draft: {
            bg: 'bg-slate-100',
            text: 'text-slate-800',
            darkBg: 'dark:bg-slate-900',
            darkText: 'dark:text-slate-200',
        },
        sent: {
            bg: 'bg-blue-100',
            text: 'text-blue-800',
            darkBg: 'dark:bg-blue-900',
            darkText: 'dark:text-blue-200',
        },
        accepted: {
            bg: 'bg-green-100',
            text: 'text-green-800',
            darkBg: 'dark:bg-green-900',
            darkText: 'dark:text-green-200',
        },
    };

    return colorMap[status.toLowerCase()] || colorMap.draft;
}

/**
 * Get combined className string for status badge
 */
export function getStatusClassName(status: string): string {
    const colors = getStatusColors(status);
    return `${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText}`;
}

/**
 * Get badge variant for shadcn/ui Badge component
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        confirmed: 'default',
        completed: 'secondary',
        cancelled: 'destructive',
        rejected: 'destructive',
        pending: 'outline',
        draft: 'outline',
        approved: 'default',
        shipped: 'default',
    };

    return variantMap[status.toLowerCase()] || 'outline';
}

/**
 * Validate if a status transition is allowed
 */
export function canTransitionStatus(from: string, to: string): boolean {
    const allowedTransitions: Record<string, string[]> = {
        pending: ['approved', 'rejected', 'cancelled'],
        approved: ['confirmed', 'revised', 'cancelled'],
        rejected: ['revised'],
        revised: [], // Cannot transition from revised
        confirmed: ['shipped', 'cancelled'],
        shipped: ['completed'],
        completed: [], // Final state
        cancelled: [], // Final state
        draft: ['pending', 'sent'],
        sent: ['accepted', 'rejected'],
    };

    return allowedTransitions[from.toLowerCase()]?.includes(to.toLowerCase()) || false;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
    const labelMap: Record<string, string> = {
        pending: 'Pending',
        approved: 'Approved',
        rejected: 'Rejected',
        revised: 'Revised',
        confirmed: 'Confirmed',
        shipped: 'Shipped',
        completed: 'Completed',
        cancelled: 'Cancelled',
        draft: 'Draft',
        sent: 'Sent',
        accepted: 'Accepted',
    };

    return labelMap[status.toLowerCase()] || status;
}
