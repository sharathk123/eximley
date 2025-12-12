/**
 * useEnquiryPdf Hook
 * 
 * Wrapper around generic useDocumentPdf hook for Enquiries
 * Note: Enquiries use 'enquiry' as document type which maps to /api/enquiries
 */

import { useDocumentPdf } from './useDocumentPdf';
import type { Enquiry } from '@/types/enquiry';

export function useEnquiryPdf(enquiry: Enquiry, onRefresh?: () => void) {
    // Note: We'll need to add 'enquiry' to the API_PATHS in useDocumentPdf
    // For now, this will work if we add it there
    return useDocumentPdf({
        documentId: enquiry.id,
        documentNumber: enquiry.enquiry_number,
        documentType: 'enquiry' as any, // Will add to type definition
        version: enquiry.version || 1,
        status: enquiry.status,
        onRefresh,
    });
}
