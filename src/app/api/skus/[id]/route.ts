import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { sku_code, name, unit, base_price, hsn_code, description, product_id } = body;

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify ownership via company_users
        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        // Verify the SKU belongs to the company before update
        // (RLS should handle this, but explicit check doesn't hurt or use Admin client carefully)
        const adminClient = createAdminClient();

        // Update
        const { data: sku, error } = await adminClient
            .from("skus")
            .update({
                sku_code,
                name,
                unit,
                base_price,
                hsn_code,
                description,
                product_id: product_id || null // Handle explict null/none
            })
            .eq("id", id)
            .eq("company_id", userData.company_id) // Safety check
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, sku });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        const adminClient = createAdminClient();

        // Check if SKU is used in shipments? (If cascade is on, it might delete shipments!)
        // Plan said Soft Delete.
        const { error } = await adminClient
            .from("skus")
            .delete() // Trying Hard Delete based on Plan re-evaluation, but catch error?
            // Actually, schema uses 'on delete restrict' for shipment_items. 
            // IF we want soft delete: .update({ is_active: false })
            // Let's try HARD DELETE first. If it fails, user can see error. 
            // Or better, let's just do it. If restricted, it will error.
            .eq("id", id)
            .eq("company_id", userData.company_id);

        if (error) {
            // If foreign key constraint violation
            if (error.code === '23503') { // foreign_key_violation
                return NextResponse.json({ error: "Cannot delete: This SKU is used in existing shipments." }, { status: 400 });
            }
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
