import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Fetch purchase orders data for statistics
        const { data: pos, error } = await supabase
            .from("purchase_orders")
            .select("id, status, total_amount, po_date, created_at, currency_code")
            .eq("company_id", companyUser.company_id)
            .order("po_date", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalPOs: pos.length,
            statusCounts: {
                draft: 0,
                sent: 0,
                confirmed: 0,
                received: 0,
                cancelled: 0
            } as Record<string, number>,
            totalSpend: 0,
            avgPOValue: 0,
            recentActivity: [] as any[]
        };

        pos.forEach(po => {
            // Count statuses
            const status = po.status || 'draft';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Calculate total spend
            stats.totalSpend += Number(po.total_amount || 0);
        });

        // Calculate average PO value
        if (stats.totalPOs > 0) {
            stats.avgPOValue = stats.totalSpend / stats.totalPOs;
        }

        // Prepare trend data (spend by date)
        const dateMap = new Map<string, number>();
        pos.forEach(po => {
            const date = new Date(po.po_date || po.created_at).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + Number(po.total_amount || 0));
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/purchase-orders/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
