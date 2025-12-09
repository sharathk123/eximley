
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase credentials.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function dumpEmbeddings() {
    console.log('Fetching embeddings to create seed file...');

    const { data: embeddings, error } = await supabase
        .from('itc_gst_hsn_embeddings')
        .select(`
            mapping_id,
            embedding_vector,
            embedding_conv_status,
            embedding_meta
        `);

    if (error) {
        console.error('Error fetching embeddings:', error);
        return;
    }

    if (!embeddings || embeddings.length === 0) {
        console.log('No embeddings found to dump.');
        return;
    }

    console.log(`Found ${embeddings.length} embeddings. Generating SQL...`);

    let sqlContent = `-- Seed Embeddings (Generated via dump script)\n`;
    sqlContent += `-- WARNING: Vectors are large, this file might be heavy.\n\n`;

    // Process in chunks to avoid massive INSERT statements
    const chunkSize = 50;
    for (let i = 0; i < embeddings.length; i += chunkSize) {
        const chunk = embeddings.slice(i, i + chunkSize);

        sqlContent += `INSERT INTO public.itc_gst_hsn_embeddings (mapping_id, embedding_vector, embedding_conv_status, embedding_meta) VALUES\n`;

        const values = chunk.map(row => {
            // Format vector as string '[x,y,z]'
            // Note: pgvector input format is '[1,2,3]'
            const vectorStr = JSON.stringify(row.embedding_vector);
            const metaStr = JSON.stringify(row.embedding_meta).replace(/'/g, "''"); // Escape single quotes

            return `('${row.mapping_id}', '${vectorStr}', '${row.embedding_conv_status}', '${metaStr}')`;
        });

        sqlContent += values.join(',\n') + `\nON CONFLICT (id) DO NOTHING;\n\n`;
    }

    const outputPath = path.resolve(process.cwd(), 'supabase/seed_embeddings.sql');
    fs.writeFileSync(outputPath, sqlContent);

    console.log(`✅ Seed file created at: ${outputPath}`);
}

dumpEmbeddings().catch(console.error);
