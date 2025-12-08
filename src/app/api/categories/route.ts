import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch all active categories, ordered by display_order
        const { data: categories, error } = await supabase
            .from("product_categories")
            .select("id, name, description")
            .eq("is_active", true)
            .order("display_order", { ascending: true });

        if (error) {
            console.error("Error fetching categories:", error);
            return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
        }

        return NextResponse.json({ categories: categories || [] });
    } catch (error: any) {
        console.error("Categories API error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
