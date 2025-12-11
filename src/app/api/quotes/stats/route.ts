
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

        // Fetch fundamental quote data for statistics
        const { data: quotes, error } = await supabase
            .from("quotes")
            .select("id, status, total_amount, quote_date, created_at, currency_code")
            .eq("company_id", companyUser.company_id)
            .order("quote_date", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalQuotes: quotes.length,
            statusCounts: {
                draft: 0,
                sent: 0,
                approved: 0,
                rejected: 0,
                converted: 0,
                revised: 0
            } as Record<string, number>,
            totalValue: 0,
            pipelineValue: 0, // draft + sent + approved
            conversionRate: 0,
            recentActivity: [] as any[]
        };

        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);

        quotes.forEach(quote => {
            // Count statuses
            const status = quote.status || 'draft';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Calculate values (assuming base currency USD for simplicity if mixed, 
            // ideal would be currency conversion but for MVP summing totals)
            stats.totalValue += Number(quote.total_amount || 0);

            if (['draft', 'sent', 'approved'].includes(status)) {
                stats.pipelineValue += Number(quote.total_amount || 0);
            }
        });

        // Calculate conversion rate
        if (stats.totalQuotes > 0) {
            const convertedCount = stats.statusCounts.converted || 0;
            // Or if we consider 'approved' as won too? Let's stick to 'converted' for PI linkage
            stats.conversionRate = (convertedCount / stats.totalQuotes) * 100;
        }

        // Prepare trend data (last 30 days or general trend)
        // Group by date (or month if range is large, let's do simple daily grouping for recent)
        const dateMap = new Map<string, number>();
        quotes.forEach(quote => {
            const date = new Date(quote.quote_date).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + Number(quote.total_amount || 0));
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/quotes/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
