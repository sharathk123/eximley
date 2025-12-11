
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;
        const { action, reason } = await request.json(); // action: 'submit' | 'approve' | 'reject'

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current user's role
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id, role")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Fetch quote to verify ownership and current status
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .select("*")
            .eq("id", id)
            .eq("company_id", companyUser.company_id)
            .single();

        if (quoteError || !quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // State Machine Logic
        const updates: any = {};
        const now = new Date().toISOString();

        if (action === 'submit') {
            if (quote.status !== 'draft' && quote.status !== 'rejected') {
                return NextResponse.json({ error: "Only draft or rejected quotes can be submitted" }, { status: 400 });
            }
            updates.status = 'pending_approval';
            updates.approval_requested_at = now;
            updates.approval_requested_by = user.id;
            // Clear previous rejection/approval info
            updates.rejection_reason = null;
            updates.approved_at = null;
            updates.approved_by = null;

        } else if (action === 'approve') {
            // Role Check: Owner or Admin
            if (!['owner', 'admin'].includes(companyUser.role)) {
                return NextResponse.json({ error: "Insufficient permissions to approve" }, { status: 403 });
            }
            if (quote.status !== 'pending_approval') {
                return NextResponse.json({ error: "Quote is not pending approval" }, { status: 400 });
            }
            updates.status = 'approved';
            updates.approved_at = now;
            updates.approved_by = user.id;
            updates.rejection_reason = null;

        } else if (action === 'reject') {
            // Role Check: Owner or Admin
            if (!['owner', 'admin'].includes(companyUser.role)) {
                return NextResponse.json({ error: "Insufficient permissions to reject" }, { status: 403 });
            }
            if (quote.status !== 'pending_approval') {
                return NextResponse.json({ error: "Quote is not pending approval" }, { status: 400 });
            }
            updates.status = 'rejected';
            updates.rejection_reason = reason;
            updates.approved_at = null;
            updates.approved_by = null;

        } else {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // Apply Update
        const { data: updatedQuote, error: updateError } = await supabase
            .from("quotes")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (updateError) throw updateError;

        return NextResponse.json({ quote: updatedQuote });

    } catch (error: any) {
        console.error("Approval API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
