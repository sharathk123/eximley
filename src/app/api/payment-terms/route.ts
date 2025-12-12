import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();

        const { data: paymentTerms, error } = await supabase
            .from("payment_terms")
            .select("*")
            .eq('is_active', true)
            .order("label", { ascending: true });

        if (error) {
            // Fallback if table doesn't exist yet (dev environment safety)
            if (error.code === '42P01') {
                return NextResponse.json({
                    paymentTerms: [
                        { id: '1', label: '100% Advance', description: 'Buyer pays full amount before shipment.' },
                        { id: '2', label: 'Net 30 Days', description: 'Payment due 30 days after invoice.' }
                    ]
                });
            }
            throw error;
        }

        return NextResponse.json({ paymentTerms });

    } catch (error: any) {
        console.error("GET /api/payment-terms error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
