"use client";

import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

interface ProformaDocumentsTabProps {
    invoice: any;
}

export function ProformaDocumentsTab({ invoice }: ProformaDocumentsTabProps) {
    return (
        <div className="space-y-4">
            <DocumentBrowser
                referenceId={invoice.id}
                referenceType="proforma_invoices"
                category="commercial-docs"
            />
        </div>
    );
}
