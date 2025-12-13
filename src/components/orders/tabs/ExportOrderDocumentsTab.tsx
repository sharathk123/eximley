/**
 * ExportOrderDocumentsTab Component
 * 
 * Displays and manages documents related to the export order
 */

"use client";

import { DocumentBrowser } from '@/components/documents/DocumentBrowser';

interface ExportOrderDocumentsTabProps {
    orderId: string;
}

export function ExportOrderDocumentsTab({ orderId }: ExportOrderDocumentsTabProps) {
    return (
        <div className="space-y-6">
            <DocumentBrowser
                referenceType="export_order"
                referenceId={orderId}
            />
        </div>
    );
}
