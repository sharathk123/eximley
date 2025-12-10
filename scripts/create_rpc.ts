
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("No Database Connection String found! Please ensure DATABASE_URL is set in .env or .env.local");
    process.exit(1);
}

const sql = postgres(connectionString);

async function run() {
    try {
        console.log("Creating truncate_hsn_data function...");
        await sql`
            CREATE OR REPLACE FUNCTION truncate_hsn_data()
            RETURNS void AS $$
            BEGIN
              TRUNCATE TABLE public.itc_gst_hsn_embeddings CASCADE;
              TRUNCATE TABLE public.itc_gst_hsn_mapping CASCADE;
            END;
            $$ LANGUAGE plpgsql SECURITY DEFINER;
        `;
        console.log("Function created successfully.");
    } catch (e) {
        console.error("Error creating function:", e);
    } finally {
        await sql.end();
    }
}
run();
