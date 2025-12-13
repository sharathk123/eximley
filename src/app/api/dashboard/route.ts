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

        // 8. Financial Metrics - Total Export Value (This Month)
        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: monthlyOrders } = await supabase
            .from("export_orders")
            .select("total_amount, currency_code")
            .eq("company_id", companyId)
            .gte("created_at", firstDayOfMonth);

        const monthlyRevenue = monthlyOrders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;

        // 9. Compliance Metrics
        // Pending BRCs
        const { count: pendingBRCs } = await supabase
            .from("brcs")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "pending");

        // Commercial Invoices (new metric!)
        const { count: commercialInvoices } = await supabase
            .from("proforma_invoices")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("invoice_type", "commercial");

        // Proformas Pending Approval
        const { count: pendingApprovals } = await supabase
            .from("proforma_invoices")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("status", "pending");

        // 10. Shipping Insights
        // Shipments by transport mode
        const { data: seaShipments } = await supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("transport_mode", "sea");

        const { data: airShipments } = await supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .eq("transport_mode", "air");

        // Insured Shipments
        const { count: insuredShipments } = await supabase
            .from("shipments")
            .select("*", { count: "exact", head: true })
            .eq("company_id", companyId)
            .not("insurance_company", "is", null);

        return NextResponse.json({
            stats: {
                total_shipments: totalShipments || 0,
                active_shipments: activeShipments || 0,
                active_quotes: activeQuotes || 0,
                pending_orders: pendingOrders || 0,
                total_enquiries: totalEnquiries || 0,
                new_enquiries: newEnquiries || 0,
                won_enquiries: wonEnquiries || 0,
                // Financial
                monthly_revenue: monthlyRevenue,
                // Compliance
                pending_brcs: pendingBRCs || 0,
                commercial_invoices: commercialInvoices || 0,
                pending_approvals: pendingApprovals || 0,
                // Shipping
                sea_shipments: seaShipments?.length || 0,
                air_shipments: airShipments?.length || 0,
                insured_shipments: insuredShipments || 0
            },
            recent_shipments: recentShipments || [],
            recent_orders: recentOrders || []
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
