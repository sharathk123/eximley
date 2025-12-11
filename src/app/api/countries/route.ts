import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data, error } = await supabase
            .from("countries")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;

        return NextResponse.json({ countries: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
