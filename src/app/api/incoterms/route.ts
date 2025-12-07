import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: incoterms, error } = await supabase
            .from("incoterms")
            .select("*")
            .order("code", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ incoterms });
    } catch (error) {
        console.error("Incoterms Fetch Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
