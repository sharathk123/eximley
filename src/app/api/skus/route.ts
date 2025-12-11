import { type NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 404 });

        const { data: skus, error } = await supabase
            .from("skus")
            .select("*, products(name, price, currency)") // Fetch name, price and currency from products
            .eq("company_id", userData.company_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        // Flatten the product name for easier usage
        const flattenedSkus = skus.map((sku: any) => ({
            ...sku,
            product_name: sku.products?.name,
            product_price: sku.products?.price,
            product_currency: sku.products?.currency,
        }));

        return NextResponse.json({ skus: flattenedSkus });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await req.json();

        const { data: userData } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 404 });

        const { data, error } = await supabase
            .from("skus")
            .insert({
                ...body,
                company_id: userData.company_id
                // product_id is in body if passed
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ sku: data });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
