
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateEmbeddingsLocal() {
    console.log('Starting local embedding generation using Xenova/all-MiniLM-L6-v2 (384 dim)...');

    // Dynamically import to handle ESM module in TS/Node environment
    const { pipeline } = await import('@xenova/transformers');

    // Load local model
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    const BATCH_SIZE = 20; // Smaller batch for local CPU processing
    let processedCount = 0;
    let errorCount = 0;

    let page = 0;
    let hasMore = true;

    while (hasMore) {
        // Select IDs from HSN mapping
        const { data: mappings, error: fetchError } = await supabase
            .from('itc_gst_hsn_mapping')
            .select('id, itc_hs_code, commodity, description, gst_hsn_code, gst_rate')
            .range(page * BATCH_SIZE, (page + 1) * BATCH_SIZE - 1)
            .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Error fetching mappings:', fetchError);
            break;
        }

        if (!mappings || mappings.length === 0) {
            hasMore = false;
            break;
        }

        // Check which ones already have embeddings
        const mappingIds = mappings.map(m => m.id);
        const { data: existingEmbeddings } = await supabase
            .from('itc_gst_hsn_embeddings')
            // Note: IF you previously tried inserting 1536-dim vectors, this script might skip them.
            // But since OpenAI failed, we assume they are empty or we want to overwrite 'failed' ones.
            // For now, simple check: don't process if valid embedding exists.
            .select('mapping_id, embedding_conv_status')
            .in('mapping_id', mappingIds);

        const alreadyProcessedIds = new Set(
            existingEmbeddings
                ?.filter(e => e.embedding_conv_status === 'processed')
                .map(e => e.mapping_id) || []
        );

        const toProcess = mappings.filter(m => !alreadyProcessedIds.has(m.id));

        if (toProcess.length === 0) {
            console.log(`Skipping batch ${page} (all processed)`);
            page++;
            continue;
        }

        console.log(`Processing ${toProcess.length} items in batch ${page}...`);

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

            try {
                // Generate embedding locally
                const output = await extractor(text, { pooling: 'mean', normalize: true });
                // output.data is a Float32Array
                const embedding = Array.from(output.data);

                updates.push({
                    mapping_id: m.id,
                    embedding_vector: embedding,
                    embedding: JSON.stringify(embedding),
                    embedding_conv_status: 'processed',
                    embedding_meta: {
                        model: "Xenova/all-MiniLM-L6-v2",
                        generated_at: new Date().toISOString()
                    }
                });
            } catch (err) {
                console.error(`Error generating embedding for ID ${m.id}:`, err);
                errorCount++;
            }
        }

        if (updates.length > 0) {
            const { error: insertError } = await supabase
                .from('itc_gst_hsn_embeddings')
                .upsert(updates);

            if (insertError) {
                console.error('Error inserting embeddings:', insertError);
                errorCount += updates.length;
            } else {
                processedCount += updates.length;
                console.log(`Saved ${updates.length} embeddings.`);
            }
        }

        page++;
    }

    console.log(`\n--- Completed ---`);
    console.log(`Processed: ${processedCount}`);
    console.log(`Errors: ${errorCount}`);
}

generateEmbeddingsLocal().catch(console.error);
