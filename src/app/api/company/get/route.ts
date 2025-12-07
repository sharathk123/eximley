import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    // /api/company/get
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await supabase.from("company_users").select("company_id").eq("user_id", user.id).single();
        if (!userData) return NextResponse.json({ error: "No Company" }, { status: 404 });

        const { data: company } = await supabase.from("companies").select("*").eq("id", userData.company_id).single();
        return NextResponse.json({ company });
    } catch (error) {
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
