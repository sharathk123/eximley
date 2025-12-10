
import { pipeline } from '@xenova/transformers';

/**
 * Generates specific vector embeddings for the given text.
 * 
 * Strategy:
 * 1. Try Hugging Face Inference API (if HF_ACCESS_TOKEN is present).
 *    - This is fast and offloads computation.
 * 2. Fallback to local Xenova / ONNX runtime.
 *    - Runs locally on the server (slower cold start, but reliable).
 * 
 * Model: 'sentence-transformers/all-MiniLM-L6-v2' (384 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    if (!text || !text.trim()) return [];

    const hfToken = process.env.HF_ACCESS_TOKEN;
    const useHf = false; // hfToken; // Disable HF API as it fails with 400/404 on Router for this model. Use Local Xenova for consistency.
    // 1. Hugging Face Inference API
    if (hfToken && useHf) {
        try {
            console.log("Using Hugging Face Inference API...");
            const response = await fetch(
                "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2",
                {
                    headers: {
                        Authorization: `Bearer ${hfToken}`,
                        "Content-Type": "application/json"
                    },
                    method: "POST",
                    body: JSON.stringify({ inputs: [text], options: { wait_for_model: true } }),
                }
            );

            if (!response.ok) {
                const errText = await response.text();
                // If 503 (loading), we might retry, but 'wait_for_model' usually handles it.
                // If 401/403, token is bad.
                console.warn(`HF API Warning: ${response.status} - ${errText}`);
                throw new Error(`HF API Error`);
            }

            const result = await response.json();

            // HF returns number[] (single) or number[][] (batch)
            if (Array.isArray(result)) {
                if (typeof result[0] === 'number') {
                    return result as number[];
                } else if (Array.isArray(result[0])) {
                    return result[0] as number[];
                }
            }
            throw new Error("Unexpected HF response format");
        } catch (hfError) {
            console.warn("HF API failed/skipped, falling back to local model.");
        }
    }

    // 2. Local Fallback (Xenova)
    try {
        console.log("Generating embedding locally (Xenova)...");
        // Singleton pattern for pipeline could be implemented here for perf,  
        // but Next.js serverless environment makes persistence tricky without specific caching.
        // For now, re-initializing is acceptable for fallback or occasional use.
        const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        const output = await extractor(text, { pooling: 'mean', normalize: true });

        return Array.from(output.data);
    } catch (e) {
        console.error("Local embedding generation failed:", e);
        throw e;
    }
}
