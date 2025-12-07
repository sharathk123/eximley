import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 404 });

        const { data: hsnCodes, error } = await supabase
            .from("company_hsn")
            .select("*")
            .eq("company_id", userData.company_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ hsnCodes });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hsn_code, description, gst_rate, duty_rate } = body;

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        const adminClient = createAdminClient();
        const { data: hsn, error } = await adminClient
            .from("company_hsn")
            .insert({
                company_id: userData.company_id,
                hsn_code,
                description,
                gst_rate,
                duty_rate,
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error("Create HSN Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, hsn });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
