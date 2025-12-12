"use client";

import { DocumentBrowser } from '@/components/documents/DocumentBrowser';

interface QuoteDocumentsTabProps {
    quoteId: string;
}

export function QuoteDocumentsTab({ quoteId }: QuoteDocumentsTabProps) {
    return (
        <DocumentBrowser
            referenceType="quote"
            referenceId={quoteId}
            description="Upload relevant files to keep them organized with this quote. Examples: Customer RFQs (PDF/Excel), Technical Drawings, Vendor Quotes, or Email Screenshots."
        />
    );
}
