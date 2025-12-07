import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let query = supabase
            .from("products")
            .select("*, _count:skus(count)") // Get SKU count for each product
            .order("created_at", { ascending: false });

        if (category) {
            query = query.eq("category", category);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ products: data });
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
        const { name, description, category, image_url } = body;

        const { data, error } = await supabase
            .from("products")
            .insert({
                company_id: companyUser.company_id,
                name,
                description,
                category,
                image_url,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ product: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
