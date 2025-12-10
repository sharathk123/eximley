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
                attributes: body.attributes || {},
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
        const { id, name, description, category, image_url, hsn_code, itc_hs_code, hsn_status, hsn_confidence, attributes } = body;

        if (!id) {
            return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
        }

        // Construct payload dynamically to allow partial updates
        const updatePayload: any = {};
        if (name !== undefined) updatePayload.name = name;
        if (description !== undefined) updatePayload.description = description;
        if (category !== undefined) updatePayload.category = category;
        if (image_url !== undefined) updatePayload.image_url = image_url;
        if (attributes !== undefined) updatePayload.attributes = attributes;

        // Add HSN fields
        if (hsn_code !== undefined) updatePayload.hsn_code = hsn_code;
        if (itc_hs_code !== undefined) updatePayload.itc_hs_code = itc_hs_code;
        if (hsn_status !== undefined) updatePayload.hsn_status = hsn_status;
        if (hsn_confidence !== undefined) updatePayload.hsn_confidence = hsn_confidence;

        const { data, error } = await supabase
            .from("products")
            .update(updatePayload)
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
        const deleteAll = searchParams.get("all") === "true";

        if (deleteAll) {
            // Bulk Delete Logic
            const { data: companyUser } = await supabase
                .from("company_users")
                .select("company_id")
                .eq("user_id", user.id)
                .single();

            if (!companyUser) return NextResponse.json({ error: "Company not found" }, { status: 400 });

            // Delete ALL products for this company
            const { error, count } = await supabase
                .from("products")
                .delete({ count: 'exact' })
                .eq("company_id", companyUser.company_id);

            if (error) throw error;

            return NextResponse.json({ success: true, message: `Deleted ${count} products` });
        }

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
