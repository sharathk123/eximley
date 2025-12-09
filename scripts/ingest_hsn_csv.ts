
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Handling __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function ingestHsnData() {
    console.log("-----------------------------------------");
    console.log("HSN Data Ingestion: Starting...");
    console.log("-----------------------------------------");

    // 1. Clear Existing Data
    console.log("1. Clearing existing HSN mapping data...");
    // We filter by id IS NOT NULL (which is everything) to bypass 'unsafe delete' warning if any, 
    // but typically delete().neq() is enough.
    // Using an arbitrary UUID that won't match to delete *everything* else is 'neq'.
    // Or we can delete rows where id is NOT NULL.
    const { error: delError } = await supabase
        .from('itc_gst_hsn_mapping')
        .delete()
        .neq('gst_hsn_code', 'INVALID_CODE_XYZ'); // Delete all rows

    if (delError) {
        console.error("Failed to clear data:", delError);
        process.exit(1);
    }
    console.log("   Cleared 'itc_gst_hsn_mapping'. Cascade delete should handle embeddings.");

    // 2. Read CSV File
    console.log("2. Reading CSV file...");
    const filePath = path.resolve(process.cwd(), 'test-data/hsn-codewiselist-with-gst-rates.csv');
    if (!fs.existsSync(filePath)) {
        console.error("   File not found:", filePath);
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // 3. Regex Anchor Strategy (Treat file as one big string)
    // The reliable anchor is the 8-digit ITC HS Code at the start of a line.
    // Pattern: Newline + 8 digits + Comma
    // We will extract everything between these anchors.

    // Normalize newlines
    const fullText = content.replace(/\r\n/g, '\n');

    // Regex to find all starts: \n(\d{8}),
    // We strictly look for 8 digits followed by comma.
    const rowStartRegex = /\n(\d{8}),/g;

    let match;
    const indices: { start: number, code: string }[] = [];
    const records: any[] = [];

    // Manually find the first one (header might mess up regex if we just scan from 0)
    // But since we want to skip headers, we can just ignore matches before a certain point or just filter.

    while ((match = rowStartRegex.exec(fullText)) !== null) {
        indices.push({ start: match.index, code: match[1] });
    }

    console.log(`   Found ${indices.length} potential records based on 8-digit code anchor.`);

    for (let i = 0; i < indices.length; i++) {
        const current = indices[i];
        const next = indices[i + 1];

        // Slice text for this row
        // If next exists, slice up to next.index. Else slice to end.
        // We add 1 to start because match includes the \n
        const chunkStart = current.start + 1;
        const chunkEnd = next ? next.start : fullText.length;

        let rowStr = fullText.substring(chunkStart, chunkEnd).trim();

        // Cleanup: Use the code we found + the rest
        // rowStr should look like: "33019031,Attars...,3301,Desc..."

        // We try to parse this chunk. 
        // Problem: The previous row's "Description" might have garbage at end that spills into this match? 
        // No, because we defined the match as STARTING with \n\d{8}, which implies the previous line ended.
        // If previous line didn't end with newline properly... well, valid rows usually do.

        // Let's try to extract fields from this `rowStr`.
        // It's CSV format.
        // Col 0: Code (WE HAVE IT: current.code)
        // Col 1: Commodity
        // Col 2: GST HSN
        // Col 3: Description
        // Col 4: Rate

        // We can parse `rowStr` using csv-parse in relaxed mode?
        // Or manually split.

        try {
            // If rowStr is "33019031,Attars...", parse matches it perfectly.
            // We add a dummy newline just in case needed for closure? No.
            const parsed = parse(rowStr, {
                columns: false,
                relax_quotes: true,
                relax_column_count: true
            })[0];

            if (parsed) {
                const itcCode = parsed[0]?.toString().trim();
                const commodity = parsed[1]?.toString().trim();
                let gstHsn = parsed[2]?.toString().trim();
                const desc = parsed[3]?.toString().trim();
                let rate = parsed[4]?.toString().trim();

                // 5. Clean GST HSN
                // Pattern: "4202 22, 4202 29, 4202 31 10..."
                // We want the one that best matches rules.
                // Rule 1: Eliminate spaces -> "420222", "420229"
                // Rule 2: If multiple, check if any is a prefix of ITC Code (e.g. 42022910)
                // Rule 3: If no prefix match, take the first valid one.
                let finalGstHsn = gstHsn;
                if (gstHsn && (gstHsn.includes(',') || gstHsn.includes('\n'))) {
                    // Split by non-alphanumeric chars
                    const candidates = gstHsn.split(/[^0-9]+/).filter(c => c.length >= 4);

                    // Find best
                    const best = candidates.find(c => itcCode.startsWith(c));
                    if (best) {
                        finalGstHsn = best;
                    } else if (candidates.length > 0) {
                        finalGstHsn = candidates[0]; // Fallback to first
                    }
                } else if (gstHsn) {
                    // Clean single value
                    finalGstHsn = gstHsn.replace(/[^0-9]/g, '');
                }

                if (!finalGstHsn) {
                    // Check if we can derive from ITC?
                    // usually first 4 digits
                    if (itcCode && itcCode.length >= 4) finalGstHsn = itcCode.substring(0, 4);
                }

                // Push record
                records.push({
                    itc_hs_code: itcCode,
                    commodity: commodity,
                    gst_hsn_code: finalGstHsn,
                    description: desc,
                    gst_rate: rate,
                });
                continue;
            }
        } catch (e) {
            // Fallback
        }

        // Manual extraction if parse fails
        // We know it starts with Code.
        // Last part is usually "Rate%,"
        // Let's find "Rate%".
        const rateMatch = rowStr.match(/(\d+(\.\d+)?%),?/);
        let rate = null;
        let rateIndex = -1;

        if (rateMatch) {
            rate = rateMatch[1];
            rateIndex = rateMatch.index!;
        }

        // Clean Rate
        let numRate = 0;
        if (rate) {
            numRate = parseFloat(rate.replace(/%/g, ''));
        }

        // GST HSN is usually a 4-digit code somewhere in middle?
        // It's hard to find uniquely if commodity contains numbers.
        // But structured as: Code, Commodity, GST_HSN(4digit...), Desc, Rate

        // Split by comma
        const parts = rowStr.split(',');
        const itcCode = parts[0].trim();
        const commodity = parts[1] ? parts[1].trim() : "";
        let gstHsn = parts[2] ? parts[2].trim() : "";

        // Fallback Logic for cleaning GST HSN too
        let finalGstHsn = gstHsn.replace(/[^0-9]/g, '');
        if (gstHsn.includes(' ')) {
            // "4202 22" -> "420222"
            // If multiple "4202 22 4202 29" -> "420222420229" -> messy.
            // Regex for first 4+ digits
            const match = gstHsn.match(/\d{4,}/);
            if (match) finalGstHsn = match[0];
        }
        if (!finalGstHsn && itcCode.length >= 4) finalGstHsn = itcCode.substring(0, 4);

        // Validating
        if (/^\d{4,10}$/.test(itcCode)) {
            // Description recovery?
            // If we used split, description is parts[3]...range...
            // We'll just put "Recovered" or try to join.
            const desc = "Main recovered commodity: " + commodity;

            records.push({
                itc_hs_code: itcCode,
                commodity: commodity,
                gst_hsn_code: finalGstHsn,
                description: desc,
                gst_rate: isNaN(numRate) ? null : numRate,
            });
            console.log(`Recovered broken row: ${itcCode} -> GST: ${finalGstHsn}`);
        }
    }

    console.log(`   Finalized ${records.length} records.`);


    // 4. Transform Records (Simplified now that loop does it)
    console.log("3. Prepare for DB...");
    const upsertPayload = records.map(r => ({
        itc_hs_code: r.itc_hs_code,
        commodity: r.commodity,
        gst_hsn_code: r.gst_hsn_code,
        description: r.description,
        gst_rate: typeof r.gst_rate === 'string' ? parseFloat(r.gst_rate.replace('%', '')) : r.gst_rate,
    }));


    console.log(`   prepared ${upsertPayload.length} valid records to insert.`);

    if (upsertPayload.length === 0) {
        console.warn("No valid records to insert. Aborting.");
        return;
    }

    // 5. Batch Insert
    console.log("4. Inserting into Supabase...");
    const BATCH_SIZE = 100;
    for (let i = 0; i < upsertPayload.length; i += BATCH_SIZE) {
        const batch = upsertPayload.slice(i, i + BATCH_SIZE);
        const { error: insError } = await supabase
            .from('itc_gst_hsn_mapping')
            .insert(batch);

        if (insError) {
            console.error(`   Error inserting batch ${i}:`, insError);
        } else {
            console.log(`   Inserted batch ${i / BATCH_SIZE + 1} (${batch.length} rows)`);
        }
    }
    console.log("\n   Data ingestion complete.");
}

ingestHsnData().catch(console.error);
