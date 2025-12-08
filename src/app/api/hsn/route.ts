import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const chapter = searchParams.get('chapter');
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');

        // Calculate Supabase range
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        const supabase = await createSessionClient();
        // RLS policy handles auth check, but good to be explicit
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let query = supabase
            .from("itc_gst_hsn_mapping")
            .select("*", { count: 'exact' })
            .order("itc_hs_code", { ascending: true });

        // Filter by specific chapter if provided (prefix of itc_hs_code)
        if (chapter) {
            // itc_hs_code is text, so we can use like/ilike
            // Chapter is first 2 digits
            query = query.ilike('itc_hs_code', `${chapter}%`);
        }

        if (search) {
            // Search by ITC code, GST code, Commodity, or Description
            // Using ilike for case-insensitive search
            const searchPattern = `%${search}%`;
            query = query.or(`itc_hs_code.ilike.${searchPattern},gst_hsn_code.ilike.${searchPattern},commodity.ilike.${searchPattern},description.ilike.${searchPattern}`);
        }

        // Apply pagination
        const { data: hsnCodes, count, error } = await query.range(from, to);

        if (error) throw error;

        return NextResponse.json({
            hsnCodes,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error) {
        console.error("Fetch HSN Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            itc_hs_code,
            commodity,
            gst_hsn_code,
            description,
            gst_rate,
            govt_notification_no,
            govt_published_date
        } = body;

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
            .from("itc_gst_hsn_mapping")
            .insert({
                itc_hs_code,
                commodity,
                gst_hsn_code,
                description,
                gst_rate: gst_rate || 0,
                govt_notification_no: govt_notification_no || null,
                govt_published_date: govt_published_date || null
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
