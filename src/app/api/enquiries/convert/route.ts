import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Get enquiry details
        const { data: enquiry, error: enquiryError } = await supabase
            .from("enquiries")
            .select("*")
            .eq("id", enquiry_id)
            .single();

        if (enquiryError) throw enquiryError;
        if (!enquiry) {
            return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
        }

        // Generate Quote number
        const { data: existingQuotes } = await supabase
            .from("quotes")
            .select("quote_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let quoteNumber = "QT-2024-001";
        if (existingQuotes && existingQuotes.length > 0) {
            const lastNumber = existingQuotes[0].quote_number;
            const match = lastNumber.match(/QT-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastYear = parseInt(match[1]);
                const lastSeq = parseInt(match[2]);

                if (year === lastYear) {
                    quoteNumber = `QT-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
                } else {
                    quoteNumber = `QT-${year}-001`;
                }
            }
        } else {
            const year = new Date().getFullYear();
            quoteNumber = `QT-${year}-001`;
        }

        // Create Quote
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .insert({
                company_id: companyUser.company_id,
                quote_number: quoteNumber,
                enquiry_id: enquiry_id,
                buyer_id: enquiry.entity_id,
                quote_date: new Date().toISOString().split('T')[0],
                currency_code: 'USD',
                status: 'draft',
                created_by: user.id,
            })
            .select()
            .single();

        if (quoteError) throw quoteError;

        // Create Quote items from enquiry products_interested
        if (enquiry.products_interested && Array.isArray(enquiry.products_interested)) {
            const quoteItems = enquiry.products_interested.map((product: any) => ({
                quote_id: quote.id,
                sku_id: product.sku_id,
                product_name: product.product_name || '',
                description: product.notes || '',
                quantity: product.quantity || 1,
                unit_price: product.unit_price || 0,
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
