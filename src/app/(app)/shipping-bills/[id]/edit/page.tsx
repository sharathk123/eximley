import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShippingBillForm } from "@/components/shipping-bills/ShippingBillForm";

interface PageProps {
    params: { id: string };
}

export default async function EditShippingBillPage({ params }: PageProps) {
    const { id } = params;
    const supabase = await createSessionClient();

    const { data: sb, error } = await supabase
        .from("shipping_bills")
        .select(`
            *,
            shipping_bill_items (*)
        `)
        .eq("id", id)
        .single();

    if (error || !sb) {
        notFound();
    }

    return (
        <div className="container py-6">
            <ShippingBillForm mode="edit" initialData={sb} />
        </div>
    );
}
