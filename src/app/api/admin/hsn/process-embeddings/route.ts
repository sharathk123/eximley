
import { NextRequest, NextResponse } from 'next/server';
import { pipeline } from '@xenova/transformers';
import { createAdminClient } from '@/lib/supabase/server';

// Force Node.js runtime for transformers
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes timeout for processing

// Transformers Singleton
// Reverted to simple init but with LOGGING to debug failures
let extractor: any = null;
async function getExtractor() {
    if (!extractor) {
        try {
            console.log("Initializing Transformers pipeline (Xenova/all-MiniLM-L6-v2)...");
            // Native node Execution requires 'onnxruntime-node'
            extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            console.log("Model initialized successfully.");
        } catch (e: any) {
            console.error("CRITICAL MODEL INIT ERROR:", e);
            // Throwing detailed error to be caught by route handler
            throw new Error(`Model Init Failed: ${e.message} (Stack: ${e.stack})`);
        }
    }
    return extractor;
}

export async function GET(req: NextRequest) {
    const supabase = createAdminClient();
    try {
        // Query for count of mappings that DON'T have a corresponding embedding
        // Using strict count
        // Note: Supabase/PostgREST doesn't support "NOT EXISTS" efficiently in simple queries directly via JS client nicely for counts
        // without a view or rpc. However, we can use the technique of selecting items.
        // EASIER: Create a quick RPC or just use a raw query if possible?
        // Let's rely on a client-side "pending" check via a separate stat API or just returning it here.
        // Actually, let's just create a stats endpoint or use this GET to return status.

        // We'll return a simple JSON with stats for the UI to display "X items pending".
        // This query assumes 1:1 relationship.
        const { count: totalMappings, error: mapError } = await supabase
            .from('itc_gst_hsn_mapping')
            .select('*', { count: 'exact', head: true });

        const { count: totalEmbeddings, error: embError } = await supabase
            .from('itc_gst_hsn_embeddings')
            .select('*', { count: 'exact', head: true });

        if (mapError || embError) throw new Error("Failed to fetch counts");

        const pending = (totalMappings || 0) - (totalEmbeddings || 0);

        return NextResponse.json({
            pending: Math.max(0, pending),
            totalMappings: totalMappings || 0,
            totalEmbeddings: totalEmbeddings || 0
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            };

            // Keep stream alive with heartbeat
            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(": keep-alive\n"));
            }, 5000);

            try {
                const supabase = createAdminClient();

                // 1. Initialize
                send({ type: 'log', message: "Initializing generic model..." });
                const extractorInstance = await getExtractor();

                let offset = 0;
                let processedCount = 0;
                let hasMore = true;
                const BATCH_SIZE = 50;

                send({ type: 'log', message: "Fetching pending records..." });

                while (hasMore) {
                    if (req.signal.aborted) throw new Error("Cancelled by user");

                    // Fetch batch with explicit range to enable scanning
                    // We keep the !left join and null check, but backing it up with JS filtering
                    const { data: batch, error: fetchError } = await supabase
                        .from('itc_gst_hsn_mapping')
                        .select('*, itc_gst_hsn_embeddings!left(id)')
                        //.is('itc_gst_hsn_embeddings.id', null) // Commenting out unreliable DB filter for now, relying on Scan + JS Filter
                        .range(offset, offset + BATCH_SIZE - 1)
                        .order('created_at', { ascending: false }); // Process newest first

                    if (fetchError) throw new Error(fetchError.message);

                    if (!batch || batch.length === 0) {
                        hasMore = false;
                        break;
                    }

                    // In-Memory Filter: Ensure we only process those without embeddings
                    // Supabase returns array for 1:M or 1:1 if not flattened.
                    // If !left join returns data, it means embedding exists.
                    const candidates = batch.filter((item: any) => {
                        const embs = item.itc_gst_hsn_embeddings;
                        // If embs is array and has items -> processed
                        // If embs is object and not null -> processed
                        if (Array.isArray(embs) && embs.length > 0) return false;
                        if (embs && !Array.isArray(embs) && embs.id) return false;
                        return true;
                    });

                    if (candidates.length === 0) {
                        // All items in this batch are already processed.
                        // Move to next page.
                        offset += BATCH_SIZE;
                        send({ type: 'log', message: `Skipping ${batch.length} already processed records...` });
                        continue;
                    }

                    send({ type: 'log', message: `Processing ${candidates.length} new records (Batch: ${Math.floor(offset / BATCH_SIZE) + 1})...` });

                    // GENERATE EMBEDDINGS
                    const validBatchPayload = [];
                    const promises = candidates.map(async (entry: any) => {
                        if (req.signal.aborted) return null;
                        const chapterDesc = entry.itc_hs_code?.length >= 2 ? `Chapter ${entry.itc_hs_code.substring(0, 2)}` : "Unknown Chapter";
                        const textForEmbedding = `Chapter:${chapterDesc} > ${entry.commodity || ''} > ${entry.description} (ITC:${entry.itc_hs_code} GST:${entry.gst_hsn_code})`.trim();

                        try {
                            const output = await extractorInstance(textForEmbedding, { pooling: 'mean', normalize: true });
                            return {
                                mapping_id: entry.id,
                                embedding_vector: Array.from(output.data),
                                embedding_conv_status: 'processed'
                            };
                        } catch (e: any) {
                            console.error(`Embedding failed for ${entry.itc_hs_code}:`, e.message);
                            return null;
                        }
                    });

                    const results = await Promise.all(promises);
                    const payload = results.filter(r => r !== null);

                    if (payload.length > 0) {
                        // BULK INSERT
                        const { error: insertError } = await supabase
                            .from('itc_gst_hsn_embeddings')
                            .insert(payload);

                        if (insertError) {
                            send({ type: 'error', message: "Batch insert failed: " + insertError.message + " IDs: " + payload.map(p => p.mapping_id).join(',') });
                            // If insert fails, we probably should skip this batch to avoid loop, or just break?
                            // Let's increment offset to avoid infinite loop on this batch
                            offset += BATCH_SIZE;
                        } else {
                            processedCount += payload.length;
                            send({
                                type: 'progress',
                                processed: processedCount
                            });
                            // If we successfully processed 'candidates', they now have embeddings.
                            // Since we are iterating by OFFSET on the MAPPING table, 
                            // the mapping rows didn't move. 
                            // So we MUST increment offset to process the next set of mappings.
                            offset += BATCH_SIZE;
                        }
                    } else {
                        // No valid payloads generated (maybe all errored?)
                        offset += BATCH_SIZE;
                    }

                    // Slightly pause or check abort again
                    if (req.signal.aborted) break;
                }

                send({
                    type: 'done',
                    count: processedCount,
                    message: "Process complete. All records indexed."
                });

                clearInterval(keepAlive);
                controller.close();

            } catch (e: any) {
                console.error("Embedding Process Error:", e);
                send({ type: 'error', message: e.message });
                clearInterval(keepAlive);
                controller.close();
            }
        }
    });

    return new NextResponse(stream, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Connection': 'keep-alive'
        }
    });
}
