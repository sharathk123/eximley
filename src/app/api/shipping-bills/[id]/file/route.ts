import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAndCompany } from "@/lib/helpers/api";

// Mark shipping bill as filed with customs
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);

        // Security check
        const { data: existing } = await supabase
            .from("shipping_bills")
            .select("company_id, status")
            .eq("id", id)
            .single();

        if (!existing || existing.company_id !== companyId) {
            return NextResponse.json(
                { error: "Shipping bill not found or access denied" },
                { status: 404 }
            );
        }

        // Update status to filed
        const { error } = await supabase
            .from("shipping_bills")
            .update({
                status: 'filed',
                updated_at: new Date().toISOString()
            })
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
