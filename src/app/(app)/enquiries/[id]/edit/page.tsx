import { createSessionClient } from "@/lib/supabase/server";
import { EnquiryForm } from "@/components/enquiries/EnquiryForm";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function EditEnquiryPage({ params }: { params: Promise<{ id: string }> }) {
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
            <EnquiryForm enquiry={enquiry} />
        </div>
    );
}
