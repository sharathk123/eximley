import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');

        const supabase = await createSessionClient();
        // RLS policy "master_hsn_read_all" handles auth check, but good to be explicit
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let query = supabase
            .from("master_hsn_codes")
            .select("*")
            .order("hsn_code", { ascending: true });

        if (search) {
            query = query.textSearch('description', search, {
                type: 'websearch',
                config: 'english'
            });
        }

        const { data: hsnCodes, error } = await query.limit(50); // Limit results for performance

        if (error) throw error;

        return NextResponse.json({ hsnCodes });
    } catch (error) {
        console.error("Fetch HSN Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hsn_code, description, gst_rate, chapter } = body;

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Super Admin Check
        const { data: userData, error: userError } = await supabase
            .from("company_users")
            .select("is_super_admin")
            .eq("user_id", user.id)
            .single();

        if (userError || !userData?.is_super_admin) {
            return NextResponse.json({ error: "Forbidden: Only Super Admin can add HSN codes" }, { status: 403 });
        }

        const { data: hsn, error } = await supabase
            .from("master_hsn_codes")
            .insert({
                hsn_code,
                description,
                gst_rate: gst_rate || 0,
                chapter
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
