import { createSessionClient } from "@/lib/supabase/server";
import { EnquiryView } from "@/components/enquiries/EnquiryView";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ViewEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
    const supabase = await createSessionClient();
    const { id } = await params;

    const { data: enquiry, error } = await supabase
        .from("enquiries")
        .select(`
            *,
            enquiry_items (
                *,
                skus (
                    *,
                    products (name)
                )
            )
        `)
        .eq("id", id)
        .single();

    if (error || !enquiry) {
        notFound();
    }

    return (
        <div className="container mx-auto py-10">
            <EnquiryView enquiry={enquiry} />
        </div>
    );
}
