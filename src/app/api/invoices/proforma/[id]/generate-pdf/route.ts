import { createSessionClient, createAdminClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { generateProformaPDF } from "@/lib/pdf/generators/proformaPDF";
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createSessionClient();
    const adminSupabase = createAdminClient(); // Use admin for storage operations
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const shouldExport = searchParams.get('export') === 'true';

    try {
        // 1. Fetch Invoice Data
        const { data: invoice, error } = await supabase
            .from("proforma_invoices")
            .select(`
                *,
                entities (
                    name,
                    address,
                    email,
                    phone
                ),
                proforma_items (
                    *,
                    skus (
                        sku_code,
                        name
                    )
                )
            `)
            .eq("id", id)
            .single();

        if (error || !invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // 2. Fetch Company Data (Mocked for now, or fetch from settings table if available)
        // Ideally should come from a 'companies' or 'settings' table linked to user
        const company = {
            name: "Eximley Global",
            email: "support@eximley.com",
            phone: "+1 555 123 4567",
            website: "www.eximley.com",
            // Add other fields as expected by header
        };

        // 3. Generate PDF
        const pdfBuffer = await generateProformaPDF(invoice, company);

        // 4. Handle Export to DMS
        if (shouldExport) {
            // Format: PI-YYYY-NNN-Vn (e.g. PI-2025-010-V2)
            // Use existing invoice number if it matches pattern, otherwise construct it
            const fileName = DocumentFormatter.formatDocumentName(
                invoice.invoice_number.toUpperCase().startsWith('PI') ? invoice.invoice_number : `PI-${invoice.invoice_number}`,
                invoice.version || 1,
                invoice.status
            );
            const filePath = `proforma_invoices/${id}/${fileName}`;

            // Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from('commercial-docs')
                .upload(filePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true
                });

            if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

            // Link to Documents Table
            // Check if document already exists to avoid duplicates or update version
            const { data: existingDoc } = await supabase
                .from('documents')
                .select('id')
                .eq('reference_id', id)
                .eq('reference_type', 'proforma_invoices')
                .eq('file_name', fileName)
                .single();

            const { data: { user } } = await supabase.auth.getUser();

            if (!existingDoc) {
                // Use admin client for insert to ensure system record is created regardless of specific user RLS
                const { error: docError } = await adminSupabase.from('documents').insert({
                    company_id: invoice.company_id, // Ensure invoice has company_id
                    document_type: 'Proforma Invoice',
                    document_category: 'sales',
                    reference_type: 'proforma_invoices',
                    reference_id: id,
                    file_name: fileName,
                    file_path: filePath,
                    file_size: pdfBuffer.length,
                    mime_type: 'application/pdf',
                    uploaded_by: user?.id
                });
                if (docError) throw new Error(`Document link failed: ${docError.message}`);
            }

            return NextResponse.json({ success: true, filePath });
        }

        // 5. Return PDF Stream (Download/Preview)
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${invoice.invoice_number}.pdf"`
            }
        });

    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
