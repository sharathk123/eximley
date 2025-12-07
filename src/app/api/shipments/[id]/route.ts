import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id: shipmentId } = await params;
        if (!shipmentId) return NextResponse.json({ error: "ID required" }, { status: 400 });

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // RLS in 'select' will automatically filter by company_id via company_users?
        // Let's verify: 
        // Policy: "shipments_select_same_company" using company_id in (select company_id from company_users where user_id = auth.uid())
        // Yes. So simplified query works.

        // 1. Fetch Shipment
        const { data: shipment, error } = await supabase
            .from("shipments")
            .select("*")
            .eq("id", shipmentId)
            .single();

        if (error || !shipment) {
            return NextResponse.json({ error: "Shipment not found or access denied" }, { status: 404 });
        }

        // 2. Fetch Items
        const { data: items } = await supabase
            .from("shipment_items")
            .select(`
            *,
            skus ( sku_code, name )
        `)
            .eq("shipment_id", shipmentId);

        // 3. Fetch Documents
        const { data: documents } = await supabase
            .from("documents")
            .select("*")
            .eq("shipment_id", shipmentId);

        // 4. Generate Signed URLs for documents
        // Note: We need Service Role or just standard client with storage access?
        // Storage RLS usually relies on Auth.
        // If we use 'supabase' (session client), it has the user's rights.
        // User Requirement: "Generate signed URLs server-side only."
        // We can use supabase.storage.from('documents').createSignedUrl(path, 3600)

        const documentsWithUrls = await Promise.all((documents || []).map(async (doc) => {
            // path is in doc.file_url? "file_url string // storage path"
            const { data: signedData, error: signedError } = await supabase
                .storage
                .from("documents")
                .createSignedUrl(doc.file_url, 3600); // 1 hour

            return {
                ...doc,
                signedUrl: signedData?.signedUrl || null
            };
        }));


        return NextResponse.json({
            shipment,
            items: items || [],
            documents: documentsWithUrls
        });

    } catch (error) {
        console.error("Fetch shipment details error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
