import { DocumentBrowser } from "@/components/documents/DocumentBrowser";

interface ShippingBillDocumentsTabProps {
    sb: any;
}

export function ShippingBillDocumentsTab({ sb }: ShippingBillDocumentsTabProps) {
    return (
        <DocumentBrowser
            referenceType="shipping_bill"
            referenceId={sb.id}
        />
    );
}
