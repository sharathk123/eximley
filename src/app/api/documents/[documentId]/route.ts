import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
    request: Request,
    { params }: { params: { documentId: string } }
) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch document metadata
        const { data: document, error: docError } = await supabase
            .from("documents")
            .select("*")
            .eq("id", params.documentId)
            .single();

        if (docError || !document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Get signed URL (valid for 1 hour)
        const { data: signedUrl, error: urlError } = await supabase.storage
            .from("export-documents")
            .createSignedUrl(document.file_path, 3600);

        if (urlError) {
            return NextResponse.json({ error: urlError.message }, { status: 500 });
        }

        // Redirect to signed URL
        return NextResponse.redirect(signedUrl.signedUrl);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { documentId: string } }
) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch document metadata
        const { data: document, error: docError } = await supabase
            .from("documents")
            .select("*")
            .eq("id", params.documentId)
            .single();

        if (docError || !document) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from("export-documents")
            .remove([document.file_path]);

        if (storageError) {
            console.error("Storage delete error:", storageError);
        }

        // Delete metadata
        const { error: dbError } = await supabase
            .from("documents")
            .delete()
            .eq("id", params.documentId);

        if (dbError) {
            return NextResponse.json({ error: dbError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
