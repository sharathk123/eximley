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

        // Fetch enquiries data for statistics
        const { data: enquiries, error } = await supabase
            .from("enquiries")
            .select("id, status, created_at, updated_at")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: true });

        if (error) throw error;

        // Process data for statistics
        const stats = {
            totalEnquiries: enquiries.length,
            statusCounts: {
                new: 0,
                contacted: 0,
                qualified: 0,
                won: 0,
                lost: 0,
                converted: 0
            } as Record<string, number>,
            activeEnquiries: 0,
            conversionRate: 0,
            recentActivity: [] as any[]
        };

        enquiries.forEach(enquiry => {
            // Count statuses
            const status = enquiry.status || 'new';
            if (stats.statusCounts[status] !== undefined) {
                stats.statusCounts[status]++;
            }

            // Count active enquiries (not won/lost/converted)
            if (!['won', 'lost', 'converted'].includes(status)) {
                stats.activeEnquiries++;
            }
        });

        // Calculate conversion rate (converted to quotes)
        if (stats.totalEnquiries > 0) {
            const convertedCount = stats.statusCounts.converted || 0;
            stats.conversionRate = (convertedCount / stats.totalEnquiries) * 100;
        }

        // Prepare trend data (count by date)
        const dateMap = new Map<string, number>();
        enquiries.forEach(enquiry => {
            const date = new Date(enquiry.created_at).toISOString().split('T')[0];
            const current = dateMap.get(date) || 0;
            dateMap.set(date, current + 1);
        });

        // Convert map to array for chart
        stats.recentActivity = Array.from(dateMap.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return NextResponse.json({ stats });

    } catch (error: any) {
        console.error("GET /api/enquiries/stats error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
