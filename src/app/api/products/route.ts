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
            .select("*, skus(sku_code)") // Get actual SKU codes for display
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

export async function PUT(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, description, category, image_url } = body;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("products")
            .update({
                name,
                description,
                category,
                image_url,
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ product: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("products")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
