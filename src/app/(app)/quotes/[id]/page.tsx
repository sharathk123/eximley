import { createSessionClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { QuoteView } from "@/components/quotes/QuoteView";

export const dynamic = 'force-dynamic';

export default async function ViewQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createSessionClient();
    const { id } = await params;

    const { data: quote, error } = await supabase
        .from("quotes")
        .select(`
            *,
            entities (
                id,
                name,
                email,
                phone,
                address,
                country
            ),
            enquiries (
                id,
                enquiry_number
            ),
            proforma_invoices (
                id,
                invoice_number
            ),
            quote_items (
                id,
                sku_id,
                product_name,
                description,
                quantity,
                unit_price,
                discount_percent,
                tax_percent,
                line_total,
                total_price,
                skus (
                    sku_code,
                    name,
                    hs_code,
                    products (
                        hsn_code
                    )
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !quote) {
        notFound();
    }

    return <QuoteView quote={quote} />;
}
