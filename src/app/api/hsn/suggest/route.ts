
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
            .select('id, name, description, category, company_id, attributes')
            .eq('id', productId)
            .single();

        if (fetchError || !product) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        // Validate user belongs to company (RLS does this, but double check usually good if bypassing RLS, but here we use session client so RLS is active)

        // 3. Build Query Text
        // Align with target format: "Chapter: Context > Commodity > Description"
        const clean = (s: string | null) => s ? s.trim() : "";

        // Format Attributes: "Material: Cotton, GSM: 200, ..."
        let attributesText = "";
        let materialContext = "";
        let useContext = "";

        if (product.attributes && typeof product.attributes === 'object') {
            const attrs = product.attributes;

            // Prioritize specific context keys
            if (attrs.material_primary) materialContext = `Material: ${attrs.material_primary} > `;
            if (attrs.intended_use) useContext = `Use: ${attrs.intended_use} > `;

            // Generic attributes string
            const entries = Object.entries(attrs).filter(([k]) => k !== 'material_primary' && k !== 'intended_use');
            if (entries.length > 0) {
                attributesText = " > Specs: " + entries.map(([k, v]) => `${k}: ${v}`).join(", ");
            }
        }

        // We construct a hierarchical query string.
        // Format: Category > Material > Use > Name > Description > Specs
        const queryText = `Category: ${clean(product.category)} > ${materialContext}${useContext}${clean(product.name)} > ${clean(product.description)}${attributesText}`.trim().slice(0, 2000);

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
            const bestConfidence = topMatch.similarity;

            // Log the suggestion for audit
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

            // AUTO-TAGGING REMOVED. 
            // We now rely on the frontend to let the user pick from the candidates.
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
