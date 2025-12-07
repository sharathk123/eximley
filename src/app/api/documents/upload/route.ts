import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { ERRORS } from "@/lib/constants/messages";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const ALLOWED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];


export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId, user } = await getUserAndCompany(supabase);

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const documentType = formData.get("document_type") as string;
        const referenceType = formData.get("reference_type") as string | null;
        const referenceId = formData.get("reference_id") as string | null;
        const documentNumber = formData.get("document_number") as string | null;
        const documentDate = formData.get("document_date") as string | null;
        const notes = formData.get("notes") as string | null;

        if (!file || !documentType) {
            return NextResponse.json({ error: ERRORS.MISSING_REQUIRED_FIELDS }, { status: 400 });
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: ERRORS.FILE_TOO_LARGE }, { status: 400 });
        }

        // Validate file extension
        const fileExt = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];

        if (!fileExt || !ALLOWED_EXTENSIONS.includes(fileExt)) {
            return NextResponse.json({ error: ERRORS.INVALID_FILE_TYPE }, { status: 400 });
        }

        // Validate MIME type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json({ error: ERRORS.INVALID_MIME_TYPE }, { status: 400 });
        }

        // Generate file path: {company_id}/{document_type}/{timestamp}_{filename}
        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const filePath = `${companyId} /${documentType}/${timestamp}_${sanitizedFileName} `;

        // Upload to Supabase Storage
        const fileBuffer = await file.arrayBuffer();
        const { error: uploadError } = await supabase.storage
            .from("export-documents")
            .upload(filePath, fileBuffer, {
                contentType: file.type,
                upsert: false,
            });

        if (uploadError) {
            console.error("Upload error:", uploadError);
            return NextResponse.json({ error: ERRORS.FILE_UPLOAD_FAILED }, { status: 500 });
        }

        // Save metadata to documents table
        const { data: document, error: dbError } = await supabase
            .from("documents")
            .insert({
                company_id: companyId,
                document_type: documentType,
                document_category: "uploaded",
                reference_type: referenceType,
                reference_id: referenceId,
                file_path: filePath,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                document_number: documentNumber,
                document_date: documentDate,
                uploaded_by: user.id,
                notes: notes,
            })
            .select()
            .single();

        if (dbError) {
            // Rollback: delete uploaded file
            await supabase.storage.from("export-documents").remove([filePath]);
            return NextResponse.json({ error: ERRORS.DATABASE_ERROR }, { status: 500 });
        }

        return NextResponse.json({ success: true, document });
    } catch (error: any) {
        console.error("Upload error:", error);
        const status = error.message === ERRORS.UNAUTHORIZED || error.message === ERRORS.COMPANY_NOT_FOUND ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

// GET: List documents with optional filters
export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(request.url);
        const referenceType = searchParams.get("reference_type");
        const referenceId = searchParams.get("reference_id");
        const documentType = searchParams.get("document_type");

        let query = supabase
            .from("documents")
            .select("*")
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (referenceType) query = query.eq("reference_type", referenceType);
        if (referenceId) query = query.eq("reference_id", referenceId);
        if (documentType) query = query.eq("document_type", documentType);

        const { data: documents, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ documents });
    } catch (error: any) {
        const status = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
