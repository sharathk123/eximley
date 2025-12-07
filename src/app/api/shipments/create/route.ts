import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const { reference_no, type, buyer_name, incoterm } = await request.json();

        if (!reference_no || !type || !buyer_name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const sessionClient = await createSessionClient();
        const adminClient = createAdminClient();

        // 1. Verify User
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 2. Get Company (and role check if needed)
        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) {
            return NextResponse.json({ error: "Company context missing" }, { status: 403 });
        }

        // 3. Create Shipment (Using Admin Client for WRITE)
        const { data: shipment, error } = await adminClient
            .from("shipments")
            .insert({
                company_id: userData.company_id,
                created_by: user.id,
                reference_no,
                type,
                // Mapping buyer_name to buyer or supplier based on type
                ...(type === 'export' ? { buyer_name: buyer_name } : { supplier_name: buyer_name }),
                incoterm,
                status: 'draft'
            })
            .select()
            .single();

        if (error) {
            console.error("Create shipment error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: shipment.id });

    } catch (error) {
        console.error("Internal error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
