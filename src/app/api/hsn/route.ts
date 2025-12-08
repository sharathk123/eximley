import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const category = searchParams.get('category');
        const chapter = searchParams.get('chapter');

        const supabase = await createSessionClient();
        // RLS policy "master_hsn_read_all" handles auth check, but good to be explicit
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let query = supabase
            .from("master_hsn_codes")
            .select("*")
            .order("hsn_code", { ascending: true });

        // Filter by category/chapter if provided
        // TEMPORARILY DISABLED FOR DEBUGGING
        /*
        if (category) {
            // Map common categories to HSN chapters
            const categoryChapterMap: Record<string, string[]> = {
                'Agriculture': ['10', '07', '08', '09'], // Cereals, vegetables, fruits, spices
                'Textiles': ['52', '54', '55', '60'], // Cotton, man-made, knitted fabrics
                'Apparel': ['61', '62'], // Clothing
                'Electronics': ['85'], // Electrical machinery
                'Furniture': ['94'], // Furniture
                'Ayush Products': ['30', '33'], // Pharmaceutical, cosmetics
                'Certified Organics': ['07', '08', '09', '10'], // Organic produce
            };

            const chapters = categoryChapterMap[category];
            if (chapters && chapters.length > 0) {
                query = query.in('chapter', chapters);
            }
        }
        */

        // Filter by specific chapter if provided
        if (chapter) {
            query = query.eq('chapter', chapter);
        }

        if (search) {
            // Search by HSN code OR description
            query = query.or(`hsn_code.ilike.%${search}%,description.ilike.%${search}%`);
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
