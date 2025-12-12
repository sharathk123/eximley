import { createSessionClient } from "@/lib/supabase/server";
import { ProformaInvoiceView } from "@/components/invoices/ProformaInvoiceView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ViewProformaPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createSessionClient();
    const { id } = await params;

    const { data: invoice, error } = await supabase
        .from("proforma_invoices")
        .select(`
            *,
            entities(
                name,
                address,
                email,
                phone
            ),
            proforma_items (
                *,
                skus (
                    sku_code,
                    name
                )
            ),
            quotes:quotes!quotes_pi_id_fkey(
                id,
                quote_number,
                status
            ),
            export_orders!export_orders_pi_id_fkey(
                id,
                order_number,
                status
            )
        `)
        .eq("id", id)
        .single();

    if (error || !invoice) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <ProformaInvoiceView invoice={invoice} />
        </div>
    );
}
