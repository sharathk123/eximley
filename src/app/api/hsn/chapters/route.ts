import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get all HSN codes grouped by chapter
        const { data: hsnCodes, error } = await supabase
            .from("master_hsn_codes")
            .select("chapter")
            .order("chapter", { ascending: true });

        if (error) throw error;

        // Group by chapter and count
        const chapterMap = new Map<string, number>();
        hsnCodes?.forEach((hsn) => {
            if (hsn.chapter) {
                chapterMap.set(hsn.chapter, (chapterMap.get(hsn.chapter) || 0) + 1);
            }
        });

        // Convert to array
        const chapters = Array.from(chapterMap.entries())
            .map(([chapter, count]) => ({
                chapter,
                count,
                codes: [] // Will be populated when chapter is selected
            }))
            .sort((a, b) => a.chapter.localeCompare(b.chapter));

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error("Fetch Chapters Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
