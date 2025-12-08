import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/brcs/compliance - Get compliance dashboard data
export async function GET(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        // Get all BRCs for the company
        const { data: allBrcs, error } = await supabase
            .from("brcs")
            .select(`
                *,
                shipping_bills (
                    sb_number,
                    sb_date,
                    export_orders (
                        order_number,
                        entities (name)
                    )
                )
            `)
            .eq("company_id", companyId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        // Calculate stats
        const stats = {
            total_brcs: allBrcs?.length || 0,
            pending: allBrcs?.filter(b => b.realization_status === 'pending').length || 0,
            partial: allBrcs?.filter(b => b.realization_status === 'partial').length || 0,
            full: allBrcs?.filter(b => b.realization_status === 'full').length || 0,
            overdue: allBrcs?.filter(b => b.is_overdue).length || 0,
            total_pending_amount: allBrcs?.reduce((sum, b) => sum + parseFloat(b.pending_amount || 0), 0) || 0
        };

        // Get overdue BRCs
        const overdueBrcs = allBrcs?.filter(b => b.is_overdue && b.realization_status !== 'full') || [];

        // Get BRCs due in next 30 days
        const upcomingDue = allBrcs?.filter(b => {
            const dueDate = new Date(b.due_date);
            return dueDate > today && dueDate <= thirtyDaysFromNow && b.realization_status !== 'full';
        }).sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()) || [];

        // Add days_remaining to each BRC
        const addDaysRemaining = (brcs: any[]) => brcs.map(brc => ({
            ...brc,
            days_remaining: Math.ceil((new Date(brc.due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        }));

        return NextResponse.json({
            stats,
            overdue_brcs: addDaysRemaining(overdueBrcs),
            upcoming_due: addDaysRemaining(upcomingDue)
        });

    } catch (error: any) {
        console.error("Get compliance data error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
