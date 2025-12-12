/**
 * useExportOrderPdf Hook
 * 
 * Wrapper around generic useDocumentPdf hook for Export Orders
 */

import { useDocumentPdf } from './useDocumentPdf';

export function useExportOrderPdf(order: any, onRefresh?: () => void) {
    return useDocumentPdf({
        documentId: order.id,
        documentNumber: order.order_number,
        documentType: 'order',
        version: order.version || 1,
        status: order.status,
        onRefresh,
    });
}
