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

        // Fetch orders data for statistics
        const { data: orders, error } = await supabase
            .from("export_orders")
            .select("id, status, total_amount, order_date, created_at, currency_code")
            .eq("company_id", companyUser.company_id)
            .order("order_date", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalOrders: orders.length,
            statusCounts: {
                draft: 0,
                confirmed: 0,
                shipped: 0,
                delivered: 0,
                cancelled: 0
            } as Record<string, number>,
            totalRevenue: 0,
            avgOrderValue: 0,
            recentActivity: [] as any[]
        };

        orders.forEach(order => {
            // Count statuses
            const status = order.status || 'draft';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Calculate revenue
            stats.totalRevenue += Number(order.total_amount || 0);
        });

        // Calculate average order value
        if (stats.totalOrders > 0) {
            stats.avgOrderValue = stats.totalRevenue / stats.totalOrders;
        }

        // Prepare trend data (revenue by date)
        const dateMap = new Map<string, number>();
        orders.forEach(order => {
            const date = new Date(order.order_date || order.created_at).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + Number(order.total_amount || 0));
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/orders/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
