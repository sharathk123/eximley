import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

interface PageProps {
    params: { id: string };
}

export default async function EditPurchaseOrderPage({ params }: PageProps) {
    const { id } = params;
    const supabase = await createSessionClient();

    const { data: po, error } = await supabase
        .from("purchase_orders")
        .select(`
            *,
            purchase_order_items (*)
        `)
        .eq("id", id)
        .single();

    if (error || !po) {
        notFound();
    }

    return (
        <div className="container py-6">
            <PurchaseOrderForm mode="edit" initialData={po} />
        </div>
    );
}
