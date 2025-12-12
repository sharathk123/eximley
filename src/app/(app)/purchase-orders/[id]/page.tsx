import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PurchaseOrderHeader } from "@/components/purchase-orders/PurchaseOrderHeader";
import { PurchaseOrderView } from "@/components/purchase-orders/PurchaseOrderView";

interface PageProps {
    params: { id: string };
}

export default async function PurchaseOrderPage({ params }: PageProps) {
    const { id } = params;
    const supabase = await createSessionClient();

    // Fetch PO with all related data
    const { data: po, error } = await supabase
        .from("purchase_orders")
        .select(`
            *,
            entities:vendor_id (name, email, phone, address),
            export_orders (order_number),
            purchase_order_items (
                *,
                skus (name, sku_code)
            )
        `)
        .eq("id", id)
        .single();

    if (error || !po) {
        notFound();
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <PurchaseOrderHeader po={po} />
            <PurchaseOrderView po={po} />
        </div>
    );
}
