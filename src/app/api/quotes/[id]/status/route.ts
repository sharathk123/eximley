import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;
        const { status } = await request.json();

        if (!status) {
            return NextResponse.json({ error: "Status required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Validate status transition
        const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'revised', 'converted'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        // Update quote status
        const { data: quote, error } = await supabase
            .from("quotes")
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq("id", id)
            .eq("company_id", companyUser.company_id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ quote });
    } catch (error: any) {
        console.error("PATCH /api/quotes/[id]/status error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
