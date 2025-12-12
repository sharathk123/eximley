import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderForm } from "@/components/orders/OrderForm";

interface PageProps {
    params: { id: string };
}

export default async function EditOrderPage({ params }: PageProps) {
    const { id } = params;
    const supabase = await createSessionClient();

    const { data: order, error } = await supabase
        .from("export_orders")
        .select(`
            *,
            order_items (*)
        `)
        .eq("id", id)
        .single();

    if (error || !order) {
        notFound();
    }

    return (
        <div className="container py-6">
            <OrderForm mode="edit" initialData={order} />
        </div>
    );
}
