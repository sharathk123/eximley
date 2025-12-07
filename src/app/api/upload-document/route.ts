import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const shipmentId = formData.get("shipmentId") as string;
        const docType = formData.get("docType") as string; // e.g., 'Commercial Invoice'

        if (!file || !shipmentId) {
            return NextResponse.json({ error: "File and Shipment ID required" }, { status: 400 });
        }

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get Company ID
        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) {
            return NextResponse.json({ error: "Company context missing" }, { status: 403 });
        }

        const companyId = userData.company_id;

        // Define Path: documents/{company_id}/shipments/{shipment_id}/{filename}
        // Sanitize filename
        const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const path = `${companyId}/shipments/${shipmentId}/${Date.now()}-${filename}`;

        const adminClient = createAdminClient();

        // 1. Upload to Supabase Storage
        const { error: uploadError } = await adminClient
            .storage
            .from("documents")
            .upload(path, file, {
                contentType: file.type,
                upsert: false
            });

        if (uploadError) {
            console.error("Storage upload error:", uploadError);
            return NextResponse.json({ error: "Upload failed" }, { status: 500 });
        }

        // 2. Insert Record in DB
        const { data: docRecord, error: dbError } = await adminClient
            .from("documents")
            .insert({
                company_id: companyId,
                shipment_id: shipmentId,
                doc_type: docType || "Other",
                file_url: path, // Storing path relative to bucket
                created_by: user.id
            })
            .select()
            .single();

        if (dbError) {
            console.error("DB insert error:", dbError);
            // Should delete file? For MVP, skip cleanup.
            return NextResponse.json({ error: "Database update failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true, document: docRecord });

    } catch (error) {
        console.error("Upload handler error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
