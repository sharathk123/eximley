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
            .from("cost_sheets")
            .select(`
                *,
                products (name),
                skus (sku_code, name),
                currencies (symbol)
            `)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ cost_sheets: data });
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

        // Get company_id
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
            name,
            product_id,
            sku_id,
            currency_code,
            exchange_rate,
            total_cost,
            markup_percentage,
            final_price
        } = body;

        const { data, error } = await supabase
            .from("cost_sheets")
            .insert({
                company_id: companyUser.company_id,
                name,
                product_id: product_id === "none" ? null : product_id, // Handle "none" from Select
                sku_id: sku_id === "none" ? null : sku_id,
                currency_code,
                exchange_rate,
                total_cost,
                markup_percentage,
                final_price
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ cost_sheet: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
