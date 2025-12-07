
import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data, error } = await supabase
            .from("proforma_invoices")
            .select(`
    *,
    entities(name),
    currencies(symbol),
    proforma_items(
                    *,
        skus(sku_code, name)
    )
        `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ invoices: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 400 });
        }

        const body = await request.json();
        const {
            buyer_id,
            date,
            currency_code,
            conversion_rate,
            items // Array of { sku_id, quantity, unit_price }
        } = body;

        // Auto-generate invoice number (Simple logic for now)
        const invoice_number = `PI - ${Date.now().toString().slice(-6)} `;

        // Calculate total
        const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

        // Transactional insert (if supabase-js supported it easily, strict steps here)
        // 1. Insert Invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from("proforma_invoices")
            .insert({
                company_id: companyUser.company_id,
                invoice_number,
                buyer_id,
                date,
                currency_code,
                conversion_rate,
                total_amount,
                status: 'draft'
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // 2. Insert Items
        const { error: itemsError } = await supabase
            .from("proforma_items")
            .insert(
                items.map((item: any) => ({
                    invoice_id: invoice.id,
                    sku_id: item.sku_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    description: item.description // Optional
                }))
            );

        if (itemsError) {
            // Cleanup invoice if items fail (Manual rollback simulation)
            await supabase.from("proforma_invoices").delete().eq("id", invoice.id);
            throw itemsError;
        }

        return NextResponse.json({ invoice });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
