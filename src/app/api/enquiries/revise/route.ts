import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { id } = body; // Original Enquiry ID

        if (!id) return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // 1. Fetch Original
        const { data: original, error: fetchError } = await supabase
            .from("enquiries")
            .select("*, enquiry_items(*)")
            .eq("id", id)
            .single();

        if (fetchError || !original) {
            return NextResponse.json({ error: "Original enquiry not found" }, { status: 404 });
        }

        // 2. Prepare New Version Data
        const newVersion = (original.version || 1) + 1;

        // We keep the SAME enquiry_number
        // We set parent_enquiry_id to the *original's ID*

        const { data: newEnquiry, error: insertError } = await supabase
            .from("enquiries")
            .insert({
                company_id: original.company_id,
                enquiry_number: original.enquiry_number, // Same number
                version: newVersion, // Incremented version
                parent_enquiry_id: original.id, // Link to parent

                // Copy fields
                customer_name: original.customer_name,
                customer_email: original.customer_email,
                customer_phone: original.customer_phone,
                customer_company: original.customer_company,
                customer_country: original.customer_country,
                source: original.source,
                subject: original.subject,
                description: original.description,
                priority: original.priority, // Keep priority
                status: 'new', // Reset status or keep? Usually 'new' or 'draft' for revision

                assigned_to: user.id // Assign to creator of revision
            })
            .select()
            .single();

        if (insertError) {
            console.error("Error creating revision:", insertError);
            throw insertError;
        }

        // 3. Copy Items
        if (original.enquiry_items && original.enquiry_items.length > 0) {
            const itemsToInsert = original.enquiry_items.map((item: any) => ({
                enquiry_id: newEnquiry.id, // New ID
                sku_id: item.sku_id,
                quantity: item.quantity,
                target_price: item.target_price,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from("enquiry_items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        // 4. Update Original Status (Optional - maybe mark as 'revised' or 'archived'?)
        // For now, checks are mainly on ID, but maybe we want to tag the old one.
        // Let's leave it as is, filter logic usually handles "latest version".

        return NextResponse.json(newEnquiry);

    } catch (error: any) {
        console.error("Revision error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
