import { ProformaInvoiceForm } from "@/components/invoices/ProformaInvoiceForm";

export default function CreateProformaPage() {
    return (
        <div className="container mx-auto py-10">
            <ProformaInvoiceForm mode="create" />
        </div>
    );
}
