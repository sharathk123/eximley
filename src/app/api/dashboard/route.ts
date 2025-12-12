import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const supabase = await createSessionClient();

        // Check Auth
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get Company ID for user
        const { data: userData, error: userError } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (userError || !userData) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        const companyId = userData.company_id;

        // Fetch Stats
        // 1. Total Shipments
        const { count: totalShipments } = await supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId);

        // 2. Active Shipments
        const { count: activeShipments } = await supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("status", ["packed", "shipped", "in_transit"]);

        // 3. Recent Shipments
        const { data: recentShipments } = await supabase
            .from("shipments")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(5);

        // 4. Quotes Stats
        const { count: activeQuotes } = await supabase
            .from("quotes")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("status", ["draft", "sent", "revised"]);

        // 5. Orders Stats
        const { count: pendingOrders } = await supabase
            .from("export_orders")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .in("status", ["confirmed", "in_production", "pending"]);

        // 6. Recent Orders
        const { data: recentOrders } = await supabase
            .from("export_orders")
            .select(`
                *,
                entities (name)
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(5);

        // 7. Enquiry Stats
        // Total Enquiries
        const { count: totalEnquiries } = await supabase
            .from("enquiries")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId);

        // New Enquiries
        const { count: newEnquiries } = await supabase
            .from("enquiries")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "new");

        // Won Enquiries
        const { count: wonEnquiries } = await supabase
            .from("enquiries")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "won");

        return NextResponse.json({
            stats: {
                total_shipments: totalShipments || 0,
                active_shipments: activeShipments || 0,
                active_quotes: activeQuotes || 0,
                pending_orders: pendingOrders || 0,
                total_enquiries: totalEnquiries || 0,
                new_enquiries: newEnquiries || 0,
                won_enquiries: wonEnquiries || 0
            },
            recent_shipments: recentShipments || [],
            recent_orders: recentOrders || []
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
