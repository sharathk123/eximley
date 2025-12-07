import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    // /api/profile/get
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
        return NextResponse.json({ profile });
    } catch (error) {
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
