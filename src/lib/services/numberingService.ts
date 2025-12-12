import { createSessionClient } from "@/lib/supabase/server";

export type DocumentType = 'ENQUIRY' | 'QUOTE' | 'PROFORMA' | 'ORDER' | 'SHIPPING_BILL' | 'PURCHASE_ORDER';

const PREFIX_MAP: Record<DocumentType, string> = {
    'ENQUIRY': 'ENQ',
    'QUOTE': 'QT',
    'PROFORMA': 'PI',
    'ORDER': 'EO', // Export Order
    'SHIPPING_BILL': 'SB',
    'PURCHASE_ORDER': 'PO'
};

export class NumberingService {
    /**
     * Generate the next document number atomically using database sequences
     * This prevents race conditions and ensures unique document numbers
     * Format: PREFIX-YYYY-SEQ (e.g. PI-2024-001) for yearly
     * Format: PREFIX-YYYY-MM-DD-SEQ (e.g. QT-2024-12-12-001) for daily
     */
    static async generateNextNumber(companyId: string, type: DocumentType): Promise<string> {
        const supabase = await createSessionClient();
        const prefix = PREFIX_MAP[type];

        const now = new Date();
        const year = now.getFullYear();

        // Determine period key and date part based on document type
        let periodKey: string;
        let datePart: string;

        if (type === 'PROFORMA') {
            // Yearly sequence: PI-2024-001
            periodKey = `${year}`;
            datePart = `${year}`;
        } else {
            // Daily sequence: ENQ-2024-12-12-001
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            periodKey = `${year}-${month}-${day}`;
            datePart = periodKey;
        }

        // Call PostgreSQL function to get next sequence atomically
        // This prevents race conditions even with concurrent requests
        const { data, error } = await supabase.rpc('get_next_document_number', {
            p_company_id: companyId,
            p_doc_type: type,
            p_period_key: periodKey
        });

        if (error) {
            console.error('Error generating document number:', error);
            throw new Error(`Failed to generate ${type} number: ${error.message}`);
        }

        if (!data) {
            throw new Error(`No sequence number returned for ${type}`);
        }

        const nextSeq = data as number;
        const seqStr = String(nextSeq).padStart(3, '0');

        return `${prefix}-${datePart}-${seqStr}`;
    }

    /**
     * Format the document number for display/files based on version and status
     * Original (v1): QT-2024-001-V1
     * Revision (v2): QT-2024-001-V2
     * Final: QT-2024-001-FN
     */
    static formatDocumentNumber(
        docNumber: string,
        version: number = 1,
        status?: string
    ): string {
        // If status is final/approved, use FN suffix
        if (status && ['approved', 'finalized', 'final'].includes(status.toLowerCase())) {
            return `${docNumber}-FN`;
        }

        // Otherwise use Version suffix
        return `${docNumber}-V${version}`;
    }

    /**
     * Format a filename with the versioned document number
     * e.g. QT-2024-001-V1.pdf or QT-2024-001-FN.pdf
     */
    static formatDocumentName(
        docNumber: string,
        version: number = 1,
        status?: string,
        extension: string = 'pdf'
    ): string {
        const formattedNumber = this.formatDocumentNumber(docNumber, version, status);
        return `${formattedNumber}.${extension}`;
    }
}
