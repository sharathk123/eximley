import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { skus } = body; // Expecting { skus: [ { sku_code, name, ... }, ... ] }

        if (!skus || !Array.isArray(skus) || skus.length === 0) {
            return NextResponse.json({ error: "Invalid data: 'skus' array required" }, { status: 400 });
        }

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        const formattedSkus = skus.map((sku: any) => ({
            company_id: userData.company_id,
            sku_code: String(sku.sku_code || "").trim(),
            name: String(sku.name || "").trim(),
            unit: sku.unit || "pcs",
            base_price: Number(sku.base_price) || 0,
            hs_code: sku.hsn_code || sku.hs_code || null,
        })).filter(s => s.sku_code && s.name); // Basic validation

        if (formattedSkus.length === 0) {
            return NextResponse.json({ error: "No valid SKUs found to insert" }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const { data, error } = await adminClient
            .from("skus")
            .insert(formattedSkus)
            .select();

        if (error) {
            console.error("Bulk Create SKU Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, count: data?.length });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
