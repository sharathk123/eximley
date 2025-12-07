import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

// UPDATE (PUT)
export async function PUT(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const body = await request.json();
        const { hsn_code, description, gst_rate, duty_rate } = body;

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify company ownership validation
        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        // Use Admin Client to bypass RLS for consistent updates
        const adminClient = createAdminClient();

        // Security check: Ensure the HSN belongs to the user's company before updating
        const { data: existing } = await adminClient
            .from("company_hsn")
            .select("company_id")
            .eq("id", id)
            .single();

        if (!existing || existing.company_id !== userData.company_id) {
            return NextResponse.json({ error: "HSN not found or access denied" }, { status: 404 });
        }

        const { error } = await adminClient
            .from("company_hsn")
            .update({
                hsn_code,
                description,
                gst_rate,
                duty_rate,
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Update HSN Error:", error);
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    }
}

// DELETE
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Configuration Error" }, { status: 403 });

        const adminClient = createAdminClient();

        // 1. Check ownership
        const { data: existing } = await adminClient
            .from("company_hsn")
            .select("company_id")
            .eq("id", id)
            .single();

        if (!existing || existing.company_id !== userData.company_id) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        // 2. Perform Soft Delete (or Hard Delete if preferred, but Soft is safer)
        const { error } = await adminClient
            .from("company_hsn")
            .delete() // Changed to HARD DELETE because typically HSNs are not referenced by foreign keys strongly, 
            // BUT wait, referenced by `cost_sheets`? Let's check schema.
            // Schema has `hsn_code` text column in cost_sheets, not foreign key.
            // So HARD DELETE is safe if there are no FK constraints.
            // Wait, schema check earlier for `company_hsn` showed:
            // "company_hsn" does NOT serve as FK for other tables usually, other tables like SKUs store "hsn_code" as text?
            // Checking SKU table: `hsn_code text`. 
            // So Hard Delete is fine.
            .eq("id", id);

        if (error) {
            // If hard delete fails (maybe due to future constraints), fallback to soft?
            // For now, let's try Hard Delete. If it fails, user will know.
            throw error;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete HSN Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
