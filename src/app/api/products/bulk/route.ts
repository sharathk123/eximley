import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
        const { products } = body; // Expecting { products: [{ name, category, description }, ...] }

        if (!products || !Array.isArray(products) || products.length === 0) {
            return NextResponse.json({ error: "No products provided" }, { status: 400 });
        }

        // Format products for insert
        const formattedProducts = products.map((item: any) => {
            // Normalize keys to lowercase for standard fields check
            const normalizedItem: any = {};
            Object.keys(item).forEach(k => normalizedItem[k.toLowerCase()] = item[k]);

            const name = normalizedItem.name || "";
            const category = normalizedItem.category || "general";
            const description = normalizedItem.description || "";
            const hsn_code = normalizedItem['hsn code'] || normalizedItem['hsn_code'] || normalizedItem.hsn || null;

            // Collect extra fields as attributes
            const standardKeys = ['name', 'category', 'description', 'hsn', 'hsn code', 'hsn_code', 'company_id'];
            const attributes: Record<string, any> = {};

            Object.keys(item).forEach(key => {
                const lowerKey = key.toLowerCase();
                // Exclude standard keys and empty values
                if (!standardKeys.includes(lowerKey) && item[key] !== null && item[key] !== "" && item[key] !== undefined) {
                    attributes[key] = String(item[key]); // Ensure value is string for consistency
                }
            });

            return {
                company_id: companyUser.company_id,
                name,
                category,
                description,
                hsn_code,
                attributes
            };
        }).filter((p: any) => p.name); // Filter out empty names

        if (formattedProducts.length === 0) {
            return NextResponse.json({ error: "No valid products to import" }, { status: 400 });
        }

        // Insert products
        const { data, error: insertError } = await supabase
            .from("products")
            .insert(formattedProducts)
            .select();

        if (insertError) {
            console.error("Bulk insert error:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            products: data
        });

    } catch (error: any) {
        console.error("Bulk Products Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
