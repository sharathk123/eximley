import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Get all unique ITC codes to derive chapters
        // Ideally we would use a distinct query on substring, but Supabase JS client doesn't support that easily
        // Since the HSN list is relatively small (hundreds/thousands), we can fetch the codes and process in memory
        // For larger datasets, a Postgres function or raw SQL (RPC) would be better.
        const { data: hsnCodes, error } = await supabase
            .from("itc_gst_hsn_mapping")
            .select("itc_hs_code");

        if (error) throw error;

        // Group by chapter (first 2 digits)
        const chapterMap = new Map<string, number>();

        hsnCodes?.forEach((hsn) => {
            const code = hsn.itc_hs_code;
            if (code && code.length >= 2) {
                const chapter = code.substring(0, 2);
                chapterMap.set(chapter, (chapterMap.get(chapter) || 0) + 1);
            }
        });

        // Convert to array
        const chapters = Array.from(chapterMap.entries())
            .map(([chapter, count]) => ({
                chapter,
                count,
                codes: [] // Will be populated when chapter is selected via search API
            }))
            .sort((a, b) => a.chapter.localeCompare(b.chapter));

        return NextResponse.json({ chapters });
    } catch (error) {
        console.error("Fetch Chapters Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
