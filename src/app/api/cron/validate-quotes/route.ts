
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// This route should be protected, e.g., by a secret key header
export async function GET(request: Request) {
    try {
        // Use service role key to bypass RLS and access all companies
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Find quotes that are active but expired
        // Active statuses: draft, sent, pending_approval
        // valid_until < today
        const today = new Date().toISOString().split('T')[0];

        const { data: expiredQuotes, error: fetchError } = await supabase
            .from("quotes")
            .select("id, quote_number, status, valid_until, company_id")
            .in("status", ["draft", "sent", "pending_approval"])
            .lt("valid_until", today);

        if (fetchError) throw fetchError;

        if (!expiredQuotes || expiredQuotes.length === 0) {
            return NextResponse.json({ message: "No expired quotes found", count: 0 });
        }

        console.log(`Found ${expiredQuotes.length} expired quotes. Updating...`);

        // Bulk update status to 'expired'
        // Note: Supabase update with filter might be unsafe if not careful, 
        // but here we want to update specific IDs.
        // Or update all that match filters.

        const ids = expiredQuotes.map(q => q.id);

        const { error: updateError } = await supabase
            .from("quotes")
            .update({ status: 'expired' })
            .in("id", ids);

        if (updateError) throw updateError;

        return NextResponse.json({
            message: "Successfully expired quotes",
            count: expiredQuotes.length,
            ids: ids
        });

    } catch (error: any) {
        console.error("Expiry Cron Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
