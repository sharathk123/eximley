import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

// POST - Convert enquiry to Quote
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { enquiry_id } = body;

        if (!enquiry_id) {
            return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get enquiry details with items
        const { data: enquiry, error: enquiryError } = await supabase
            .from("enquiries")
            .select(`
                *,
                enquiry_items (
                    *,
                    skus (
                        id,
                        name,
                        sku_code,
                        products (name)
                    )
                )
            `)
            .eq("id", enquiry_id)
            .single();

        if (enquiryError) throw enquiryError;
        if (!enquiry) {
            return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
        }

        // Use company_id from the enquiry itself (guaranteed to be correct)
        const companyId = enquiry.company_id;

        // Generate Quote number
        const quoteNumber = await NumberingService.generateNextNumber(companyId, 'QUOTE');

        // Create Quote
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
                company_id: companyId,
                quote_number: quoteNumber,
                enquiry_id: enquiry_id,
                buyer_id: enquiry.entity_id, // Ensure enquiry has entity_id
                quote_date: new Date().toISOString().split('T')[0],
                currency_code: 'USD',
                status: 'draft',
                created_by: user.id,
            })
            .select()
            .single();

        if (quoteError) throw quoteError;

        // Create Quote items from enquiry_items
        if (enquiry.enquiry_items && Array.isArray(enquiry.enquiry_items)) {
            const quoteItems = enquiry.enquiry_items.map((item: any) => ({
                quote_id: quote.id,
                sku_id: item.sku_id,
                product_name: item.skus?.products?.name || item.skus?.name || 'Unknown Product',
                description: item.notes || '',
                quantity: item.quantity || 1,
                unit_price: item.target_price || 0, // Map target_price to unit_price
            }));

            if (quoteItems.length > 0) {
                const { error: itemsError } = await supabase
                    .from("quote_items")
                    .insert(quoteItems);

                if (itemsError) throw itemsError;
            }
        }

        // Update enquiry status to quoted
        const { error: updateError } = await supabase
            .from("enquiries")
            .update({
                status: 'quoted',
                updated_at: new Date().toISOString(),
            })
            .eq("id", enquiry_id);

        if (updateError) throw updateError;

        return NextResponse.json({ quote, enquiry_id }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/enquiries/convert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
