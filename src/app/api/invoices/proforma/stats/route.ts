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

        // Fetch proforma invoices data for statistics
        const { data: invoices, error } = await supabase
            .from("proforma_invoices")
            .select("id, status, total_amount, date, created_at, currency_code")
            .eq("company_id", companyUser.company_id)
            .order("date", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalInvoices: invoices.length,
            statusCounts: {
                draft: 0,
                sent: 0,
                approved: 0,
                rejected: 0,
                converted: 0
            } as Record<string, number>,
            totalValue: 0,
            pendingApproval: 0,
            conversionRate: 0,
            recentActivity: [] as any[]
        };

        invoices.forEach(invoice => {
            // Count statuses
            const status = invoice.status || 'draft';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Calculate total value
            stats.totalValue += Number(invoice.total_amount || 0);

            // Count pending approval
            if (status === 'sent') {
                stats.pendingApproval++;
            }
        });

        // Calculate conversion rate (converted to export orders)
        if (stats.totalInvoices > 0) {
            const convertedCount = stats.statusCounts.converted || 0;
            stats.conversionRate = (convertedCount / stats.totalInvoices) * 100;
        }

        // Prepare trend data (value by date)
        const dateMap = new Map<string, number>();
        invoices.forEach(invoice => {
            const date = new Date(invoice.date).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + Number(invoice.total_amount || 0));
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/invoices/proforma/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
