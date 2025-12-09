
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { createRequire } from 'module';

// Load env vars
dotenv.config({ path: '.env.local' });

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

const PDF_PATH = './test-data/hscodewiselistwithgstrates.pdf';

// Use standard env vars for remote
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

async function generateEmbedding(text: string) {
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

async function run() {
    if (!fs.existsSync(PDF_PATH)) {
        console.error("PDF not found at", PDF_PATH);
        return;
    }

    console.log(`Targeting Database: ${SUPABASE_URL}`);
    console.log("WARNING: This will DELETE existing HSN data. Starting in 5 seconds...");
    await new Promise(r => setTimeout(r, 5000));

    // 1. WIPE DATA
    console.log("Cleaning old data...");
    const { error: delEmb } = await supabase.from('itc_gst_hsn_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delEmb) console.error("Error clearing embeddings:", delEmb);

    const { error: delMap } = await supabase.from('itc_gst_hsn_mapping').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delMap) console.error("Error clearing mappings:", delMap);

    console.log("Data cleared.");

    // 2. PARSE PDF
    console.log("Reading PDF...");
    const dataBuffer = fs.readFileSync(PDF_PATH);
    const data = await pdf(dataBuffer);
    const text = data.text;

    // Parsing Logic for HS_Code_Mappin.pdf
    // Format appears to be: "Category NameCodeDescription"
    // Example: "Articles of Iron or Steel730429Casing..."

    // Regex to find 6-8 digit codes flanked by text
    // We capture (Category)(Code)(Description)
    // Category matches text ending in letter/space
    // Code matches digits
    // Description matches rest
    // Note: pdf-parse text is continuous.

    // We split by standard headers or just search valid codes.
    // Use a regex that finds the Code, then looks behind for Category.

    // Since JS lookbehind is variable length restricted in regex sometimes, or messy, 
    // we'll iterate matches.

    const regex = /([A-Za-z\s,\(\)\/-]+?)(\d{6,8})([\s\S]+?)(?=[A-Za-z\s,\(\)\/-]+\d{6,8}|$)/g;

    // Explanation:
    // 1. ([A-Za-z\s,\(\)\/-]+?) -> Category (lazy match, text chars)
    // 2. (\d{6,8}) -> Code (ITC/HSN)
    // 3. ([\s\S]+?) -> Description (content until next match)
    // 4. (?= ... ) -> Lookahead for next Category+Code pattern

    let match;
    let entries = [];

    // Heuristic cleanup
    while ((match = regex.exec(text)) !== null) {
        let category = match[1].trim();
        let code = match[2].trim();
        let desc = match[3].trim();

        // Clean trailing chars from category if any (usually clean)
        // Clean description (sometimes captured garbage)

        // If Category is too long (>100 chars), it's probably description leak from previous item.
        // We might need to rely on Code anchoring.

        // Limit checks
        if (category.length > 200) category = category.substring(category.length - 100);

        // Description cleanup
        desc = desc.replace(/Product CategoryITC-HS CodesDescription/g, "");
        desc = desc.replace(/[\r\n]+/g, " ");

        entries.push({
            itc_hs_code: code,
            gst_hsn_code: code.substring(0, 4), // Derive GST (4 digit)
            commodity: desc.split(/[,:]/)[0] || desc.substring(0, 50), // Guess commodity name from start of desc
            description: desc,
            category: category // Store for context
        });
    }

    console.log(`Found ${entries.length} entries.`);

    let processedCount = 0;

    // Hardcoded map not strictly needed if we extract Category, but good for fallback
    // We'll rely on extracted 'category' for context.
    /*
    const CHAPTER_MAP: Record<string, string> = {
        "33": "Essential oils and resinoids; perfumery, cosmetic or toilet preparations",
        "50": "Silk",
        "51": "Wool, fine or coarse animal hair; horsehair yarn and woven fabric",
        "52": "Cotton",
        "53": "Other vegetable textile fibres; paper yarn and woven fabrics of paper yarn",
        "54": "Man-made filaments; strip and the like of man-made textile materials",
        "55": "Man-made staple fibres",
        "56": "Wadding, felt and nonwovens; special yarns; twine, cordage, ropes and cables and articles thereof",
        "57": "Carpets and other textile floor coverings",
        "58": "Special woven fabrics; tufted textile fabrics; lace; tapestries; trimmings; embroidery",
        "59": "Impregnated, coated, covered or laminated textile fabrics; textile articles of a kind suitable for industrial use",
        "60": "Knitted or crocheted fabrics",
        "61": "Articles of apparel and clothing accessories, knitted or crocheted",
        "62": "Articles of apparel and clothing accessories, not knitted or crocheted",
        "63": "Other made up textile articles; sets; worn clothing and worn textile articles; rags"
    };
    */

    for (const entry of entries) {
        // Embed: "ITC: 33019031 GST: 3301 Commodity: Attar... Desc: Essential..."

        // Enrich with hierarchy (Extracted Category)
        const chapterDesc = entry.category || `Chapter ${entry.itc_hs_code.substring(0, 2)}`;

        const textForEmbedding = `Chapter:${chapterDesc} > ${entry.commodity} > ${entry.description} (ITC:${entry.itc_hs_code} GST:${entry.gst_hsn_code})`.trim();

        try {
            const vector = await generateEmbedding(textForEmbedding);

            // Insert Mapping
            const { data: mapData, error: mapError } = await supabase
                .from('itc_gst_hsn_mapping')
                .insert({
                    itc_hs_code: entry.itc_hs_code,
                    gst_hsn_code: entry.gst_hsn_code,
                    commodity: entry.commodity,
                    // Prepend Chapter Context for Keyword Search (FTS)
                    description: (chapterDesc ? `${chapterDesc} > ` : "") + entry.description
                })
                .select('id')
                .single();

            if (mapError) {
                console.error(`DB Error [${entry.itc_hs_code}]:`, mapError.message);
                continue;
            }

            // Insert Embedding
            const { error: embError } = await supabase
                .from('itc_gst_hsn_embeddings')
                .insert({
                    mapping_id: mapData.id,
                    embedding_vector: vector,
                    embedding_conv_status: 'processed'
                });

            if (embError) {
                console.error("Emb Error:", embError.message);
            } else {
                processedCount++;
                if (processedCount % 10 === 0) process.stdout.write('.');
            }

        } catch (e: any) {
            console.error("Processing Error:", e.message);
        }
    }

    console.log(`\n\nSuccess! Ingested ${processedCount} records.`);
}

run();
