import { createSessionClient } from "@/lib/supabase/server";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createSessionClient();
    const { id } = await params;

    const { data: quote, error } = await supabase
        .from("quotes")
        .select(`
            *,
            items:quote_items (
                *,
                sku:skus (
                    *,
                    product:products (name)
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !quote) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <QuoteForm mode="edit" initialData={quote} />
        </div>
    );
}
