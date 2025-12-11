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

const TABLE_MAP: Record<DocumentType, string> = {
    'ENQUIRY': 'enquiries',
    'QUOTE': 'quotes',
    'PROFORMA': 'proforma_invoices',
    'ORDER': 'export_orders',
    'SHIPPING_BILL': 'shipping_bills',
    'PURCHASE_ORDER': 'purchase_orders'
};

const COLUMN_MAP: Record<DocumentType, string> = {
    'ENQUIRY': 'enquiry_number',
    'QUOTE': 'quote_number',
    'PROFORMA': 'invoice_number',
    'ORDER': 'order_number',
    'SHIPPING_BILL': 'sb_number',
    'PURCHASE_ORDER': 'po_number'
};

export class NumberingService {
    /**
     * Generate the next document number for a given type
     * Format: PREFIX-YYYY-SEQ (e.g. QT-2024-001)
     * Format: PREFIX-YYYY-MM-DD-SEQ (e.g. QT-2024-01-01-001)
     */
    static async generateNextNumber(companyId: string, type: DocumentType): Promise<string> {
        const supabase = await createSessionClient();
        const prefix = PREFIX_MAP[type];
        const tableName = TABLE_MAP[type];
        const columnName = COLUMN_MAP[type];

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const datePart = `${year}-${month}-${day}`; // YYYY-MM-DD

        // Find the last record for this company and date
        // Pattern: PREFIX-YYYY-MM-DD-%
        const pattern = `${prefix}-${datePart}-%`;

        const { data: latestRecord } = await supabase
            .from(tableName)
            .select(columnName)
            .eq('company_id', companyId)
            .ilike(columnName, pattern)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        let nextSeq = 1;

        if (latestRecord && (latestRecord as Record<string, any>)[columnName]) {
            const currentNumber = (latestRecord as Record<string, any>)[columnName];
            // Split by '-' and take the last part
            // Example: QT-2025-04-25-001 -> parts are [QT, 2025, 04, 25, 001]
            const parts = currentNumber.split('-');
            const lastSeqStr = parts[parts.length - 1];

            if (/^\d+$/.test(lastSeqStr)) {
                nextSeq = parseInt(lastSeqStr, 10) + 1;
            }
        }

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
