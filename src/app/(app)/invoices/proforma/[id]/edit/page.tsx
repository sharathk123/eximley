import { createSessionClient } from "@/lib/supabase/server";
import { ProformaInvoiceForm } from "@/components/invoices/ProformaInvoiceForm";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EditProformaPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createSessionClient();
    const { id } = await params;

    const { data: invoice, error } = await supabase
        .from("proforma_invoices")
        .select(`
            *,
            proforma_items (
                *,
                skus (
                    sku_code,
                    name
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !invoice) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <ProformaInvoiceForm mode="edit" initialData={invoice} />
        </div>
    );
}
