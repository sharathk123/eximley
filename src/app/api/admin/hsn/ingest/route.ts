
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { pipeline } from '@xenova/transformers';

// Force Node.js runtime for file processing and transformers
export const runtime = 'nodejs';
export const maxDuration = 60; // Increase timeout for heavy processing

// Initialize Supabase Admin Client
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Transformers Singleton (sort of)
let extractor: any = null;
async function getExtractor() {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return extractor;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const fileName = file.name.toLowerCase();

        let entries: any[] = []; // { itc_hs_code, gst_hsn_code, commodity, description, category }

        // 1. PARSE FILE
        if (fileName.endsWith('.pdf')) {
            const data = await pdfParse(buffer);
            const text = data.text;

            // Logic form ingest_hsn_remote.ts
            // Format: "Category NameCodeDescription"
            const regex = /([A-Za-z\s,\(\)\/-]+?)(\d{6,8})([\s\S]+?)(?=[A-Za-z\s,\(\)\/-]+\d{6,8}|$)/g;

            let match;
            while ((match = regex.exec(text)) !== null) {
                let category = match[1].trim();
                let code = match[2].trim();
                let desc = match[3].trim();

                if (category.length > 200) category = category.substring(category.length - 100);
                desc = desc.replace(/Product CategoryITC-HS CodesDescription/g, "");
                desc = desc.replace(/[\r\n]+/g, " ");

                entries.push({
                    itc_hs_code: code,
                    gst_hsn_code: code.substring(0, 4),
                    commodity: desc.split(/[,:]/)[0] || desc.substring(0, 50),
                    description: desc,
                    category: category
                });
            }
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const workbook = XLSX.read(buffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            // Heuristic mapping
            entries = json.map((row: any) => {
                const code = String(row['ITC Code'] || row['HSN Code'] || row['Code'] || Object.values(row)[0] || "").replace(/\D/g, '');
                const desc = String(row['Description'] || row['Commodity'] || Object.values(row)[1] || "");
                const cat = String(row['Category'] || row['Chapter'] || "Unknown");

                if (code.length < 4) return null;

                return {
                    itc_hs_code: code,
                    gst_hsn_code: code.substring(0, 4),
                    commodity: desc.substring(0, 50),
                    description: desc,
                    category: cat
                };
            }).filter(x => x !== null);

        } else if (fileName.endsWith('.csv')) {
            const records = parse(buffer, {
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true
            });

            entries = records.map((row: any) => {
                // Similar heuristics
                const codeKey = Object.keys(row).find(k => k.toLowerCase().includes('code')) || Object.keys(row)[0];
                const descKey = Object.keys(row).find(k => k.toLowerCase().includes('desc')) || Object.keys(row)[1];
                const catKey = Object.keys(row).find(k => k.toLowerCase().includes('cat')) || 'Category';

                const code = String(row[codeKey] || "").replace(/\D/g, '');
                const desc = String(row[descKey] || "");
                const cat = String(row[catKey] || "Unknown");

                if (code.length < 4) return null;

                return {
                    itc_hs_code: code,
                    gst_hsn_code: code.substring(0, 4),
                    commodity: desc.substring(0, 50),
                    description: desc,
                    category: cat
                };
            }).filter((x: any) => x !== null);
        } else {
            return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
        }

        console.log(`Parsed ${entries.length} entries`);

        // 2. EMBED & STORE (Batch Processing)
        const extractorInstance = await getExtractor();
        let processedCount = 0;

        // Process in chunks to avoid memory kill? No, just loop.
        for (const entry of entries) {
            const chapterDesc = entry.category || `Chapter ${entry.itc_hs_code.substring(0, 2)}`;
            const textForEmbedding = `Chapter:${chapterDesc} > ${entry.commodity} > ${entry.description} (ITC:${entry.itc_hs_code} GST:${entry.gst_hsn_code})`.trim();

            try {
                const output = await extractorInstance(textForEmbedding, { pooling: 'mean', normalize: true });
                const vector = Array.from(output.data);

                // DB Insert - Mapping
                const { data: mapData, error: mapError } = await supabase
                    .from('itc_gst_hsn_mapping')
                    .upsert({ // Upsert based on ITC code? uniqueness check lines 465? No unique constraint on code in schema, only ID.
                        // Ideally we check existence or define conflict.
                        // Schema 1_1 doesn't strict unique itc_hs_code.
                        // We will insert specific entry.
                        // Wait, duplicates? Logic needs refinement for Production.
                        itc_hs_code: entry.itc_hs_code,
                        gst_hsn_code: entry.gst_hsn_code,
                        commodity: entry.commodity,
                        description: (chapterDesc ? `${chapterDesc} > ` : "") + entry.description
                    })
                    .select('id')
                    .single();

                if (mapError) {
                    console.error("Map Error", mapError);
                    continue;
                }

                // Embeddings
                // Delete old embedding for this mapping if exists? (New ID implies new embedding row)
                await supabase.from('itc_gst_hsn_embeddings').insert({
                    mapping_id: mapData.id,
                    embedding_vector: vector,
                    embedding_conv_status: 'processed'
                });

                processedCount++;
            } catch (e) {
                console.error("Processing error", e);
            }
        }

        return NextResponse.json({
            success: true,
            count: processedCount,
            totalParsed: entries.length,
            message: `Successfully processed ${processedCount} records.`
        });

    } catch (e: any) {
        console.error("API Error:", e);
        return NextResponse.json({ error: e.message || "Internal Server Error" }, { status: 500 });
    }
}
