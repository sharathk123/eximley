export class DocumentFormatter {
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
        if (status && ['approved', 'finalized', 'final', 'won', 'converted'].includes(status.toLowerCase())) {
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
