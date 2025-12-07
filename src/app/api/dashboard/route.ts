import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

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
            .eq("status", "active"); // assuming 'active' handling or specific status

        // 3. Recent Shipments
        const { data: recentShipments } = await supabase
            .from("shipments")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false })
            .limit(5);

        return NextResponse.json({
            stats: {
                total: totalShipments || 0,
                active: activeShipments || 0,
                pending: 0 // placeholder
            },
            recent: recentShipments || []
        });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
