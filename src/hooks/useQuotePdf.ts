/**
 * useQuotePdf Hook
 * 
 * Wrapper around generic useDocumentPdf hook for Quotes
 */

import { useDocumentPdf } from './useDocumentPdf';

export function useQuotePdf(quote: any, onRefresh?: () => void) {
    return useDocumentPdf({
        documentId: quote.id,
        documentNumber: quote.quote_number,
        documentType: 'quote',
        version: quote.version || 1,
        status: quote.status,
        onRefresh,
    });
}
