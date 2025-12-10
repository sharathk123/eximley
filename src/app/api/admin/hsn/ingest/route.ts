import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { generateEmbedding } from '@/lib/embeddings';


// --- Text Utilities ---
const noCleanText = (str: string): string => {
    if (!str) return "";
    return str.trim();
};

const parseGSTRate = (rateStr: string): number | null => {
    if (!rateStr) return null;
    const match = rateStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : null;
};

// --- Types ---
interface HSNRecord {
    itc_hs_code: string;
    gst_hsn_code: string;
    commodity?: string | null;
    itc_hs_code_description?: string | null;
    gst_hsn_code_description?: string | null;
    chapter?: string | null;
    gst_rate?: number | null;
    source?: string; // "File1" | "File2" | "Both"
    govt_notification_no?: string | null;
    govt_published_date?: string | null;
}



// --- Main API Route ---
export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const uploadedFiles = formData.getAll('file') as File[];

    if (!uploadedFiles || uploadedFiles.length === 0) {
        return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: any) => {
                controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
            };

            const keepAlive = setInterval(() => {
                controller.enqueue(encoder.encode(": keep-alive\n"));
            }, 5000);

            try {
                const supabase = createAdminClient();
                send({ type: 'log', message: `Initializing robust pipeline for ${uploadedFiles.length} files...` });

                const file1Data = new Map<string, HSNRecord>(); // ITC Mapping (File 1)
                const file2Data = new Map<string, HSNRecord>(); // GST Rates (File 2)


                // --- STEP 1: PARSING ---
                for (let fIndex = 0; fIndex < uploadedFiles.length; fIndex++) {
                    const file = uploadedFiles[fIndex];
                    const buffer = Buffer.from(await file.arrayBuffer());
                    const fileName = file.name.toLowerCase();

                    const fileStartTime = Date.now();
                    send({ type: 'log', message: `📁 Parsing ${fileName}...` });

                    if (fileName.endsWith('.pdf')) {
                        const PDFParser = (await import("pdf2json")).default;
                        const parser = new PDFParser(null, 1 as any);

                        const text = await new Promise<string>((resolve, reject) => {
                            parser.on("pdfParser_dataError", (errData: any) => reject(new Error(errData.parserError)));
                            parser.on("pdfParser_dataReady", (pdfData: any) => {
                                try {
                                    const rawText = parser.getRawTextContent();
                                    try {
                                        resolve(decodeURIComponent(rawText));
                                    } catch (e) {
                                        resolve(rawText);
                                    }
                                } catch (e) {
                                    reject(e);
                                }
                            });
                            parser.parseBuffer(buffer);
                        });

                        const isFile1 = text.includes("Product Category") && text.includes("ITC-HS Codes");
                        const isFile2 = text.includes("GST Rate") || text.includes("Commodity");

                        if (isFile1) {
                            // --- File 1: ITC HS Code Mapping ---
                            send({ type: 'log', message: `Detected File 1 (ITC Master)` });
                            const lines = text.split('\n');
                            let currentCategory = "";
                            let count = 0;

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed || trimmed.includes('ITC-HS Codes') || trimmed.includes('Description')) continue;

                                const codeMatch = trimmed.match(/(\d{6,8})/); // Match 6 to 8 digits
                                if (codeMatch) {
                                    const itcCode = codeMatch[1];
                                    // ... rest of logic uses itcCode

                                    const codeIndex = trimmed.indexOf(itcCode);
                                    const beforeCode = trimmed.substring(0, codeIndex).trim();
                                    const afterCode = trimmed.substring(codeIndex + itcCode.length).trim();

                                    if (beforeCode && beforeCode.length > 3 && !/^\d+$/.test(beforeCode)) {
                                        currentCategory = noCleanText(beforeCode);
                                    }

                                    file1Data.set(itcCode, {
                                        itc_hs_code: itcCode,
                                        gst_hsn_code: itcCode.substring(0, 4), // Default guess
                                        chapter: currentCategory || null,
                                        itc_hs_code_description: noCleanText(afterCode) || null,
                                        source: 'File1'
                                    });
                                    count++;
                                }
                            }
                            send({ type: 'log', message: `✓ Extracted ${count} records from File 1` });

                        } else if (isFile2) {
                            // --- File 2: GST HSN with Rates ---
                            send({ type: 'log', message: `Detected File 2 (GST Rates)` });
                            // ... File 2 Parsing ...
                            const lines = text.split('\n');
                            let currentRecord: Partial<HSNRecord> = {};
                            let count = 0;

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (!trimmed) continue;

                                const itcCodeMatch = trimmed.match(/(\d{6,8})/);

                                if (itcCodeMatch) {
                                    // Save Previous
                                    if (currentRecord.itc_hs_code) {
                                        file2Data.set(currentRecord.itc_hs_code, currentRecord as HSNRecord);
                                        count++;
                                    }

                                    // Start New
                                    const itcCode = itcCodeMatch[1];
                                    currentRecord = {
                                        itc_hs_code: itcCode,
                                        gst_hsn_code: "",
                                        commodity: "",
                                        gst_hsn_code_description: "",
                                        source: 'File2'
                                    };

                                    // Extract Remainder
                                    let remaining = trimmed.replace(itcCode, " ").replace(/^\s*\d+\s+/, "").trim();

                                    // Rate extraction
                                    const rateMatch = remaining.match(/(\d+\.?\d*)\s*%$/) || remaining.match(/(\d+\.?\d*)\s*%/);
                                    if (rateMatch) {
                                        currentRecord.gst_rate = parseFloat(rateMatch[1]);
                                        remaining = remaining.replace(rateMatch[0], " ").trim();
                                    }

                                    // GST Code extraction (ANY 4 digit)
                                    const gstCodeMatch = remaining.match(/\b(\d{4})\b/);
                                    if (gstCodeMatch) {
                                        currentRecord.gst_hsn_code = gstCodeMatch[1];
                                        const matchIndex = gstCodeMatch.index!;

                                        const comm = remaining.substring(0, matchIndex).trim();
                                        if (comm) currentRecord.commodity = noCleanText(comm);

                                        const desc = remaining.substring(matchIndex + gstCodeMatch[0].length).trim();
                                        if (desc) currentRecord.gst_hsn_code_description = noCleanText(desc);
                                    } else {
                                        currentRecord.commodity = noCleanText(remaining);
                                    }

                                } else if (currentRecord.itc_hs_code) {
                                    // Continuation Line
                                    const rateMatch = trimmed.match(/(\d+\.?\d*)\s*%$/) || trimmed.match(/(\d+\.?\d*)\s*%/);
                                    if (rateMatch) {
                                        currentRecord.gst_rate = parseFloat(rateMatch[1]);
                                        // If line was just rate, done.
                                        continue;
                                    }

                                    // Simple Append
                                    if (currentRecord.gst_hsn_code) {
                                        currentRecord.gst_hsn_code_description = (currentRecord.gst_hsn_code_description || "") + " " + noCleanText(trimmed);
                                    } else {
                                        currentRecord.commodity = (currentRecord.commodity || "") + " " + noCleanText(trimmed);
                                    }
                                }
                            }
                            // Save Last
                            if (currentRecord.itc_hs_code) {
                                file2Data.set(currentRecord.itc_hs_code, currentRecord as HSNRecord);
                                count++;
                            }

                            send({ type: 'log', message: `✓ Extracted ${count} records from File 2` });
                        }
                    }
                }

                // --- STEP 2: MERGING ---
                send({ type: 'log', message: `🔄 Merging Data...` });
                const finalRecords: HSNRecord[] = [];
                const allItcCodes = new Set([...file1Data.keys(), ...file2Data.keys()]);

                for (const itcCode of allItcCodes) {
                    const r1 = file1Data.get(itcCode);
                    const r2 = file2Data.get(itcCode);

                    if (r1 && r2) {
                        finalRecords.push({
                            itc_hs_code: itcCode,
                            gst_hsn_code: r2.gst_hsn_code || r1.gst_hsn_code,
                            commodity: r2.commodity,
                            itc_hs_code_description: r1.itc_hs_code_description,
                            gst_hsn_code_description: r2.gst_hsn_code_description || null,
                            gst_rate: r2.gst_rate,
                            chapter: r1.chapter,
                            source: 'Both'
                        });
                    } else if (r2) {
                        finalRecords.push({
                            ...r2,
                            gst_hsn_code: r2.gst_hsn_code || itcCode.substring(0, 4),
                            source: 'File2'
                        } as HSNRecord);
                    } else if (r1) {
                        finalRecords.push({
                            ...r1,
                            source: 'File1'
                        });
                    }
                }




                // --- STEP 4: DB UPSERT ---
                send({ type: 'log', message: `💾 Upserting ${finalRecords.length} records (Idempotent)...` });
                const BATCH_SIZE = 50; // Reduced from 100 to prevent timeouts
                let totalProcessed = 0;

                for (let i = 0; i < finalRecords.length; i += BATCH_SIZE) {
                    const batch = finalRecords.slice(i, i + BATCH_SIZE);

                    if (req.signal.aborted) break;

                    const { data: insertedData, error } = await supabase
                        .from('itc_gst_hsn_mapping')
                        .upsert(batch, {
                            onConflict: 'itc_hs_code,gst_hsn_code',
                            ignoreDuplicates: false
                        })
                        .select('id, description, commodity, itc_hs_code_description, gst_hsn_code_description');

                    if (error) {
                        console.error("Upsert Batch Error:", error.message);
                        send({ type: 'log', message: `⚠️ Batch mapping error: ${error.message}` });
                    } else if (insertedData && insertedData.length > 0) {
                        // --- Embedding Generation ---
                        // Processing embeddings in sub-batches or sequentially to manage CPU/Memory
                        send({ type: 'log', message: `🧠 Generating AI Embeddings for batch...` });

                        const embeddingUpdates = [];
                        for (const row of insertedData) {
                            const desc = row.itc_hs_code_description || row.gst_hsn_code_description || '';
                            const textToEmbed = `${desc} ${row.commodity || ''}`.trim();
                            if (!textToEmbed) continue;

                            try {
                                // Use our shared utility (Local or HF)
                                const vector = await generateEmbedding(textToEmbed);
                                if (vector && vector.length === 384) {
                                    embeddingUpdates.push({
                                        mapping_id: row.id,
                                        embedding_vector: vector
                                    });
                                }
                            } catch (embErr) {
                                // console.warn("Embedding failed for row", row.id);
                            }
                        }

                        if (embeddingUpdates.length > 0) {
                            const { error: embError } = await supabase
                                .from('itc_gst_hsn_embeddings')
                                .upsert(embeddingUpdates, { onConflict: 'mapping_id' });

                            if (embError) {
                                console.error("Embedding Upsert Error:", embError.message);
                                send({ type: 'log', message: `⚠️ Embedding save error: ${embError.message}` });
                            }
                        }
                    }

                    totalProcessed += batch.length;
                    send({ type: 'progress', totalProcessed, totalRecords: finalRecords.length, percentage: Math.round((totalProcessed / finalRecords.length) * 100) });
                }


                send({ type: 'done', count: totalProcessed, message: "Pipeline Complete. Data Validated & Merged." });

                clearInterval(keepAlive);
                controller.close();
            } catch (e: any) {
                console.error("Pipeline Error:", e);
                send({ type: 'error', message: e.message });
                clearInterval(keepAlive);
                controller.close();
            }
        }
    });

    return new NextResponse(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

export async function DELETE(req: NextRequest) {
    const supabase = createAdminClient();
    try {
        const { error } = await supabase.rpc('truncate_hsn_data');
        if (error) throw error;
        return NextResponse.json({ success: true, message: "Data Cleared" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
