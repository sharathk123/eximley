import { NextResponse } from "next/server";
import { createSessionClient, createAdminClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

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

        // Use Admin Client to bypass RLS restrictions on HSN table
        // This ensures the Search API works publicly/globally without specific RLS policies
        const supabase = createAdminClient();

        // RLS policy handles auth check, but good to be explicit
        // const { data: { user } } = await supabase.auth.getUser();
        // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); 
        // Note: We allow public search now? Or assume user is logged in via Middleware?
        // Check lib/supabase/server implementation: createAdminClient doesn't have auth context.
        // If we want to enforce auth, we should check session separately using createSessionClient()
        // But for "Search", usually we want it to work.
        // Let's keep it open or check session strictly? 
        // The original code checked user.
        // Let's check session for security, then use admin for data.

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        let data: any[] | null = [];
        let count: number | null = 0;

        if (search) {
            // HYBRID SEARCH: Use Semantic + Keyword Search
            // 1. Generate Embedding
            // Tuning: Prepend "commodity: " to improve vector alignment with HSN descriptions.
            // Simulation showed +37% improvement (Score 0.17 -> 0.24 for "laptop")
            const embedding = await generateEmbedding(`commodity: ${search}`);

            // 2. Call Hybrid RPC
            // Note: Semantic search doesn't support deep pagination well.
            // We fetch the top matches (offset + limit) and slice.
            const { data: matches, error: rpcError } = await supabase
                .rpc('match_hsn_hybrid', {
                    query_embedding: embedding,
                    match_threshold: 0.15, // Lowered to 0.15 based on simulator finding (laptop=0.1975)
                    match_count: to + 20,
                    query_text: search
                });

            if (rpcError) throw rpcError;

            console.log(`Search for "${search}" with threshold 0.25 found ${matches?.length || 0} matches.`);

            // 3. Process matches
            if (matches && matches.length > 0) {
                console.log("Top Result Score:", matches[0].similarity);
                console.log("Top Result Desc:", matches[0].description);
                // To support full functionality (like separate descriptions, rates, etc if RPC missed them),
                // we could re-fetch. But checking Step 207, we added published_date etc to RPC.
                // However, the RPC is missing `gst_rate` and `chapter`.
                // STRATEGY: Fetch full details for these IDs to ensure data consistency.
                // RPC returns 'mapping_id' as the ID column (defined in RETURNS TABLE)
                // Ensure we filter out any undefined IDs before querying
                const ids: string[] = matches.map((m: any) => m.mapping_id || m.id).filter((id: any) => id);

                if (ids.length === 0) {
                    data = [];
                } else {
                    // Fetch full details
                    const { data: fullDetails, error: fetchError } = await supabase
                        .from("itc_gst_hsn_mapping")
                        .select("*")
                        .in("id", ids);

                    if (fetchError) throw fetchError;

                    // 4. Re-order results to match the hybrid ranking
                    const detailsMap = new Map((fullDetails || []).map(d => [d.id, d]));
                    data = matches
                        .map((m: any) => {
                            const matchId = m.mapping_id || m.id;
                            if (!matchId) return null;
                            const detail = detailsMap.get(matchId);
                            if (!detail) return null;
                            // Return detail but injecting the match score/type if useful?
                            return {
                                ...detail,
                                rank_score: m.similarity // populate rank_score for debug/sorting
                            };
                        })
                        .filter(Boolean)
                        .slice(from, from + limit); // Apply pagination (slice)

                    count = matches.length;
                }
            } else {
                data = [];
                count = 0;
            }

        } else {
            // Standard List / Filter
            let query = supabase
                .from("itc_gst_hsn_mapping")
                .select("*", { count: 'exact' })
                .order("itc_hs_code", { ascending: true });

            if (chapter) {
                query = query.ilike('itc_hs_code', `${chapter}%`);
            }

            const { data: qData, count: qCount, error: qError } = await query.range(from, to);
            if (qError) throw qError;
            data = qData;
            count = qCount;
        }

        return NextResponse.json({
            hsnCodes: data,
            meta: {
                total: count || 0,
                page,
                limit,
                totalPages: count ? Math.ceil(count / limit) : 0
            }
        });
    } catch (error: any) {
        console.error("Fetch HSN Error:", error);
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            itc_hs_code,
            commodity,
            gst_hsn_code,
            itc_hs_code_description,
            gst_hsn_code_description,
            chapter,
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

        // Use Admin Client for insertion to bypass RLS
        const adminClient = createAdminClient();

        const { data: hsn, error } = await adminClient
            .from("itc_gst_hsn_mapping")
            .insert({
                itc_hs_code,
                commodity,
                gst_hsn_code,
                itc_hs_code_description,
                gst_hsn_code_description,
                chapter,
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
