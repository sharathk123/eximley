import { createSessionClient } from "@/lib/supabase/server";
import { ExportOrderView } from "@/components/orders/ExportOrderView";
import { redirect } from "next/navigation";

export default async function ExportOrderDetailPage({ params }: { params: { id: string } }) {
    const supabase = await createSessionClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    // Fetch order with all related data
    const { data: order, error } = await supabase
        .from('export_orders')
        .select(`
            *,
            entities:buyer_id (
                id,
                name,
                email,
                phone,
                address
            ),
            order_items (
                *,
                skus (
                    id,
                    name,
                    sku_code
                )
            ),
            proforma_invoices:pi_id (
                id,
                invoice_number
            )
        `)
        .eq('id', params.id)
        .single();

    if (error || !order) {
        redirect("/orders");
    }

    return <ExportOrderView order={order} />;
}
