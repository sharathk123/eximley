import { NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase/server";

// COMMON: Verify Super Admin Access
const verifySuperAdmin = async () => {
    const supabase = await createSessionClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Unauthorized", status: 401 };

    const { data: userData, error } = await supabase
        .from("company_users")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .single();

    if (error || !userData?.is_super_admin) {
        return { error: "Forbidden: Super Admin access required", status: 403 };
    }

    return { supabase };
};

// UPDATE (PUT)
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            itc_hs_code,
            commodity,
            gst_hsn_code,
            description,
            gst_rate,
            govt_notification_no,
            govt_published_date
        } = body;

        const auth = await verifySuperAdmin();
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        // Use Admin Client for consistent writes (bypassing potentially complex RLS if manual check passed)
        const adminClient = createAdminClient();

        const { error } = await adminClient
            .from("itc_gst_hsn_mapping")
            .update({
                itc_hs_code,
                commodity,
                gst_hsn_code,
                description,
                gst_rate,
                govt_notification_no: govt_notification_no || null,
                govt_published_date: govt_published_date || null
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
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const auth = await verifySuperAdmin();
        if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

        // Use Admin Client for consistent writes
        const adminClient = createAdminClient();

        const { error } = await adminClient
            .from("itc_gst_hsn_mapping")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Delete HSN Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
