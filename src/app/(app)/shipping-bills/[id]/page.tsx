import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ShippingBillHeader } from "@/components/shipping-bills/ShippingBillHeader";
import { ShippingBillView } from "@/components/shipping-bills/ShippingBillView";

interface PageProps {
    params: { id: string };
}

export default async function ShippingBillPage({ params }: PageProps) {
    const { id } = params;
    const supabase = await createSessionClient();

    const { data: sb, error } = await supabase
        .from("shipping_bills")
        .select(`
            *,
            export_orders (order_number),
            proforma_invoices (invoice_number),
            shipping_bill_items (*)
        `)
        .eq("id", id)
        .single();

    if (error || !sb) {
        notFound();
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <ShippingBillHeader sb={sb} />
            <ShippingBillView sb={sb} />
        </div>
    );
}
