
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
// We import the transformer pipeline dynamically to avoid build issues in some envs
// but for this route we'll try standard import or dynamic inside handler

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    // 1. Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if super admin
    const { data: companyUser } = await supabase
        .from('company_users')
        .select('is_super_admin')
        .eq('user_id', user.id)
        .single();

    if (!companyUser?.is_super_admin) {
        return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
    }

    try {
        // 2. Fetch HSN codes WITHOUT embeddings (or pending)
        // We'll process a small batch (e.g. 10) to avoid Vercel timeouts
        const BATCH_SIZE = 10;

        // Fetch IDs that already have processed embeddings
        const { data: existing } = await supabase
            .from('itc_gst_hsn_embeddings')
            .select('mapping_id')
            .eq('embedding_conv_status', 'processed');

        const existingIds = new Set(existing?.map(e => e.mapping_id) || []);

        // Fetch candidates from master table
        // Note: In a larger DB, this logic should be improved (e.g. using a "not in" query or joining)
        // But for <1000 items, fetching all IDs to diff is fine.
        const { data: allMappings } = await supabase
            .from('itc_gst_hsn_mapping')
            .select('id, itc_hs_code, commodity, description, gst_hsn_code, gst_rate');

        if (!allMappings) return NextResponse.json({ processed: 0, remaining: 0 });

        const toProcess = allMappings.filter(m => !existingIds.has(m.id)).slice(0, BATCH_SIZE);
        const remainingCount = Math.max(0, allMappings.filter(m => !existingIds.has(m.id)).length - toProcess.length);

        if (toProcess.length === 0) {
            return NextResponse.json({ success: true, processed: 0, remaining: 0, message: "All complete" });
        }

        console.log(`Processing batch of ${toProcess.length} items...`);

        // 3. Generate Embeddings (Local Model)
        // Import dynamically
        const { pipeline } = await import('@xenova/transformers');
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

        const updates: any[] = [];

        for (const m of toProcess) {
            const parts = [
                `ITC HS Code: ${m.itc_hs_code || 'N/A'}`,
                `GST HSN: ${m.gst_hsn_code || 'N/A'}`,
                `Commodity: ${m.commodity || 'N/A'}`,
                `Description: ${m.description || 'N/A'}`,
                `GST Rate: ${m.gst_rate ? m.gst_rate + '%' : 'N/A'}`
            ];
            const text = parts.join('. ');

            const output = await extractor(text, { pooling: 'mean', normalize: true });
            const embedding = Array.from(output.data);

            updates.push({
                mapping_id: m.id,
                embedding_vector: embedding, // 384 dimensions
                embedding: JSON.stringify(embedding),
                embedding_conv_status: 'processed',
                embedding_meta: {
                    model: "Xenova/all-MiniLM-L6-v2",
                    generated_at: new Date().toISOString()
                }
            });
        }

        // 4. Upsert to DB
        if (updates.length > 0) {
            const { error } = await supabase
                .from('itc_gst_hsn_embeddings')
                .upsert(updates, { onConflict: 'mapping_id' }); // Ensure we match by mapping_id if you have a unique constraint, otherwise insert

            if (error) throw error;
        }

        return NextResponse.json({
            success: true,
            processed: updates.length,
            remaining: remainingCount
        });

    } catch (error: any) {
        console.error("Embedding Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
