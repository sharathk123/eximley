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

        // Fetch shipping bills data for statistics
        const { data: bills, error } = await supabase
            .from("shipping_bills")
            .select("id, status, fob_value, sb_date, created_at, currency")
            .eq("company_id", companyUser.company_id)
            .order("sb_date", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalBills: bills.length,
            statusCounts: {
                drafted: 0,
                filed: 0,
                cleared: 0,
                shipped: 0,
                cancelled: 0
            } as Record<string, number>,
            totalExportValue: 0,
            clearedBills: 0,
            recentActivity: [] as any[]
        };

        bills.forEach(bill => {
            // Count statuses
            const status = bill.status || 'drafted';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Calculate total export value
            stats.totalExportValue += Number(bill.fob_value || 0);

            // Count cleared bills
            if (status === 'cleared' || status === 'shipped') {
                stats.clearedBills++;
            }
        });

        // Prepare trend data (export value by date)
        const dateMap = new Map<string, number>();
        bills.forEach(bill => {
            const date = new Date(bill.sb_date || bill.created_at).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + Number(bill.fob_value || 0));
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/shipping-bills/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
