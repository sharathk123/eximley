import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data, error } = await supabase
            .from("currencies")
            .select("*")
            .order("code", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ currencies: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
