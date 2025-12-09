
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { productId } = body;

        if (!productId) {
            return NextResponse.json({ error: "Missing productId" }, { status: 400 });
        }

        // 2. Fetch Product
        const { data: product, error: fetchError } = await supabase
            .from('products')
            .select('id, name, description, category, company_id')
            .eq('id', productId)
            .single();

        if (fetchError || !product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Validate user belongs to company (RLS does this, but double check usually good if bypassing RLS, but here we use session client so RLS is active)

        // 3. Build Query Text
        // Align with target format: "Commodity: ..., Description: ..."
        const clean = (s: string | null) => s ? s.trim() : "";

        // We construct a "Hypothetical HSN Entry" from the product data
        const queryText = `
Commodity: ${clean(product.name)}
Category: ${clean(product.category)}
Description: ${clean(product.description)}
`.trim().slice(0, 1000);

        if (!queryText) {
            return NextResponse.json({ error: "Insufficient product data to generate embedding" }, { status: 400 });
        }



        // 4. Generate Embedding (Local Model)
        // Use exact same model as ingestion: Xenova/all-MiniLM-L6-v2
        const { pipeline } = await import('@xenova/transformers');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        const output = await extractor(queryText, { pooling: 'mean', normalize: true });
        const embedding = Array.from(output.data);

        // 5. Hybrid Search (Vector + Keyword)
        // We try the hybrid RPC first to catch direct keyword matches.
        // If it fails (e.g. RPC not created yet), we fallback to semantic-only.

        const hybridParams = {
            query_embedding: embedding,
            match_threshold: 0.15,
            match_count: 5,
            query_text: product.name || "" // Use Name for direct "Attar", "Jewellery" matching
        };

        let matches: any[] = [];

        const { data: hybridData, error: hybridError } = await supabase.rpc('match_hsn_hybrid', hybridParams);

        if (!hybridError && hybridData) {
            matches = hybridData;
            console.log(`Hybrid search success: ${matches.length} matches`);
        } else {
            if (hybridError) console.warn("Hybrid search failed (falling back to cosmetic):", hybridError.message);

            // Fallback to Semantic Only
            const { data: candidates, error: searchError } = await supabase
                .rpc('match_itc_hsn_cosine', {
                    query_embedding: embedding,
                    match_threshold: 0.15,
                    match_count: 5
                });

            if (searchError) {
                console.error(searchError);
                throw new Error("Search failed");
            }
            matches = candidates || [];
        }

        const topMatch = matches.length > 0 ? matches[0] : null;

        // 6. Record Suggestions & Update Product
        if (topMatch) {
            const bestConfidence = topMatch.similarity; // already normalized 0-1 (cosine similarity)

            // Insert audit log
            // Inserts 'one or more'. For simplicity, we record the TOP suggestion as the primary suggestion record.
            // Or we could insert all? The schema links product_id to suggestion.
            // Let's insert the best one for now or loop. The schema implies 'suggested_hsn_code'.

            // We'll insert the best match as the suggestion
            const { error: logError } = await supabase
                .from('ai_hsn_suggestions')
                .insert({
                    product_id: productId,
                    mapping_id: topMatch.mapping_id,
                    suggested_hsn_code: topMatch.gst_hsn_code,
                    suggested_itc_hs_code: topMatch.itc_hs_code,
                    confidence: bestConfidence,
                    status: 'suggested',
                    model: 'Xenova/all-MiniLM-L6-v2',
                    created_by: user.id
                });

            if (logError) console.error("Log error:", logError);

            // Update Product if confidence is good (e.g. > 50%) or just 'update with best'
            // User requirement: "updates products ... with the best suggestion (or leaves none)"

            // Heuristic: If similarity > 0.5, we consider it a decent suggestion.
            // Note: Cosine similarity on sentence-transformers often clusters 0.4-0.8.

            const updatePayload: any = {
                last_hsn_checked_at: new Date().toISOString()
            };

            if (bestConfidence > 0.25) {
                updatePayload.itc_hs_code = topMatch.itc_hs_code; // Pre-fill 8 digit
                updatePayload.hsn_code = topMatch.gst_hsn_code; // Pre-fill 4/6 digit GST HSN
                updatePayload.hsn_confidence = bestConfidence;
                updatePayload.hsn_status = 'suggested';
            }

            const { error: updateError } = await supabase
                .from('products')
                .update(updatePayload)
                .eq('id', productId);

            if (updateError) console.error("Product update error:", updateError);
        }

        return NextResponse.json({
            success: true,
            candidates: matches,
            count: matches.length
        });

    } catch (e: any) {
        console.error("HSN Suggest Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
