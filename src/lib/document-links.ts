/**
 * Document URL generators for navigation
 */
export function getDocumentUrl(type: string, id: string): string {
    const urlMap: Record<string, string> = {
        enquiry: '/enquiries',
        quote: '/quotes',
        proforma_invoice: '/invoices/proforma',
        export_order: '/orders',
        shipping_bill: '/shipping-bills',
        brc: '/brcs',
        purchase_order: '/purchase-orders',
    };

    const basePath = urlMap[type] || '/';
    return `${basePath}/${id}`;
}

/**
 * Get badge color variant for document status
 */
export function getDocumentBadgeColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
    const statusMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
        draft: 'secondary',
        sent: 'default',
        converted: 'default',
        confirmed: 'default',
        completed: 'default',
        pending: 'secondary',
        partial: 'secondary',
        full: 'default',
        cancelled: 'destructive',
        rejected: 'destructive',
    };

    return statusMap[status.toLowerCase()] || 'outline';
}

/**
 * Format document number for display
 */
export function formatDocumentNumber(type: string, number: string): string {
    const prefixMap: Record<string, string> = {
        enquiry: 'ENQ',
        quote: 'QT',
        proforma_invoice: 'PI',
        export_order: 'EO',
        shipping_bill: 'SB',
        brc: 'BRC',
        purchase_order: 'PO',
    };

    const prefix = prefixMap[type];
    if (prefix && !number.startsWith(prefix)) {
        return `${prefix}-${number}`;
    }

    return number;
}
