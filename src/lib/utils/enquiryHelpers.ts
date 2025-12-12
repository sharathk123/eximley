/**
 * Enquiry Helper Utilities
 * 
 * This file contains utility functions for working with enquiries.
 */

import type { EnquiryStatus, EnquiryPriority } from '@/types/enquiry';

/**
 * Get the badge variant color for an enquiry status
 */
export function getStatusColor(status: EnquiryStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (status) {
        case 'new':
            return 'default';
        case 'won':
            return 'secondary';
        case 'lost':
            return 'destructive';
        default:
            return 'outline';
    }
}

/**
 * Get the badge variant color for an enquiry priority
 */
export function getPriorityColor(priority: EnquiryPriority): 'default' | 'secondary' | 'destructive' | 'outline' {
    switch (priority) {
        case 'urgent':
            return 'destructive';
        case 'high':
            return 'default';
        case 'medium':
            return 'secondary';
        case 'low':
            return 'outline';
        default:
            return 'outline';
    }
}

/**
 * Format a date string for display
 */
export function formatEnquiryDate(dateString: string | undefined, locale: string = 'en-IN'): string {
    if (!dateString) return '—';

    try {
        return new Date(dateString).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return '—';
    }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number | undefined, currency: string = 'INR'): string {
    if (amount === undefined || amount === null) return '—';

    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Format quantity for display
 */
export function formatQuantity(quantity: number | undefined): string {
    if (quantity === undefined || quantity === null) return '—';

    return new Intl.NumberFormat('en-IN').format(quantity);
}
