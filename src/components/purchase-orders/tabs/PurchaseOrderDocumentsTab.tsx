import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

interface PurchaseOrderDocumentsTabProps {
    po: any;
}

export function PurchaseOrderDocumentsTab({ po }: PurchaseOrderDocumentsTabProps) {
    return (
        <DocumentBrowser
            referenceType="purchase_order"
            referenceId={po.id}
        />
    );
}
