const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function fixSchema() {
    console.log("🔌 Connecting to database...");

    // Find connection string
    let connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

    // Fallback search
    if (!connectionString) {
        for (const [key, value] of Object.entries(process.env)) {
            if (value && (key.includes('URL') || key.includes('CONNECTION')) && (value.startsWith('postgres://') || value.startsWith('postgresql://'))) {
                console.log("   Found connection string in:", key);
                connectionString = value;
                break;
            }
        }
    }

    if (!connectionString) {
        console.error("❌ Error: NO PostgreSQL Connection String found.");
        console.log("   Checked: DATABASE_URL, POSTGRES_URL, SUPABASE_DB_URL and scanned others.");
        process.exit(1);
    }

    const sql = postgres(connectionString, {
        ssl: { rejectUnauthorized: false },
        max: 1
    });

    try {
        console.log("🛠️  Applying Schema Fixes...");

        console.log("   - Enabling pg_trgm extension...");
        await sql`CREATE EXTENSION IF NOT EXISTS pg_trgm`;

        console.log("   - Adding 'source' column if missing...");
        await sql`ALTER TABLE public.itc_gst_hsn_mapping ADD COLUMN IF NOT EXISTS source TEXT`;

        console.log("   - Fixing Unique Constraint...");
        await sql`ALTER TABLE public.itc_gst_hsn_mapping DROP CONSTRAINT IF EXISTS unique_itc_gst_hsn_pair`;
        await sql`DROP INDEX IF EXISTS idx_unique_itc_gst_hsn`;
        await sql`ALTER TABLE public.itc_gst_hsn_mapping ADD CONSTRAINT unique_itc_gst_hsn_pair UNIQUE (itc_hs_code, gst_hsn_code)`;

        console.log("   - Creating 'search_hsn_smart' RPC function...");
        await sql`
            CREATE OR REPLACE FUNCTION public.search_hsn_smart(
              p_search_text TEXT,
              p_limit INT DEFAULT 20,
              p_offset INT DEFAULT 0
            )
            RETURNS TABLE (
              id UUID,
              itc_hs_code TEXT,
              gst_hsn_code TEXT,
              commodity TEXT,
              itc_hs_code_description TEXT,
              gst_hsn_code_description TEXT,
              gst_rate NUMERIC,
              chapter TEXT,
              govt_notification_no TEXT,
              rank_score FLOAT
            ) 
            LANGUAGE plpgsql STABLE
            AS $$
            DECLARE
              clean_search TEXT;
            BEGIN
              clean_search := trim(p_search_text);
              RETURN QUERY
              SELECT
                m.id,
                m.itc_hs_code,
                m.gst_hsn_code,
                m.commodity,
                m.itc_hs_code_description,
                m.gst_hsn_code_description,
                m.gst_rate,
                m.chapter,
                m.govt_notification_no,
                (
                  CASE WHEN m.itc_hs_code = clean_search THEN 100.0 ELSE 0 END +
                  CASE WHEN m.gst_hsn_code = clean_search THEN 90.0 ELSE 0 END +
                  CASE WHEN m.itc_hs_code LIKE clean_search || '%' THEN 50.0 ELSE 0 END +
                  (CASE 
                       WHEN m.commodity ILIKE '%' || clean_search || '%' THEN 20.0 
                       WHEN m.itc_hs_code_description ILIKE '%' || clean_search || '%' THEN 15.0
                       WHEN m.gst_hsn_code_description ILIKE '%' || clean_search || '%' THEN 15.0
                       ELSE 0
                   END) +
                  (similarity(m.commodity, clean_search) * 10.0) 
                ) AS rank_score
              FROM public.itc_gst_hsn_mapping m
              WHERE 
                m.itc_hs_code ILIKE clean_search || '%' OR
                m.gst_hsn_code ILIKE clean_search || '%' OR
                m.commodity ILIKE '%' || clean_search || '%' OR
                m.itc_hs_code_description ILIKE '%' || clean_search || '%' OR
                m.gst_hsn_code_description ILIKE '%' || clean_search || '%' OR
                m.govt_notification_no ILIKE '%' || clean_search || '%' OR
                m.chapter ILIKE clean_search || '%'
              ORDER BY rank_score DESC, m.itc_hs_code ASC
              LIMIT p_limit
              OFFSET p_offset;
            END;
            $$;
        `;

        console.log("✅ Schema Fixes Applied Successfully!");

        console.log("🧪 Verifying with Dummy Insert...");
        await sql`
            INSERT INTO public.itc_gst_hsn_mapping (itc_hs_code, gst_hsn_code, source, commodity)
            VALUES ('TEST_VERIFY', 'TEST', 'ScriptVerification', 'Test Entry')
            ON CONFLICT (itc_hs_code, gst_hsn_code) DO NOTHING
        `;
        console.log("✅ Verification Insert Passed.");

    } catch (e) {
        console.error("❌ Schema Fix Failed:", e);
        // Force exit 1
        process.exit(1);
    } finally {
        await sql.end();
    }
}

fixSchema();
