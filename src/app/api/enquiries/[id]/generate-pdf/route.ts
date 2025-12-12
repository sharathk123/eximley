import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { DocumentService } from "@/lib/services/documentService";
import { NumberingService } from "@/lib/services/numberingService";
import { generateEnquiryPDF } from "@/lib/pdf/generators/enquiryPDF";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;

        // Check if this is an export request
        const { searchParams } = new URL(request.url);
        const shouldExport = searchParams.get('export') === 'true';

        // 1. Auth Check
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) return NextResponse.json({ error: "No company found" }, { status: 404 });

        // 2. Fetch Enquiry Data
        const { data: enquiry, error: fetchError } = await supabase
            .from("enquiries")
            .select(`
                *,
                enquiry_items (*, skus(name, sku_code)),
                entities (name, address, country, email, phone)
            `)
            .eq("id", id)
            .eq("company_id", companyUser.company_id)
            .single();

        if (fetchError || !enquiry) {
            return NextResponse.json({ error: "Enquiry not found" }, { status: 404 });
        }

        // 3. Fetch Company Data
        const { data: company } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyUser.company_id)
            .single();

        if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

        // 4. Format Document Number
        const formattedEnquiryNumber = NumberingService.formatDocumentNumber(
            enquiry.enquiry_number,
            enquiry.version || 1,
            enquiry.status
        );

        // 5. Generate PDF Buffer using modular generator
        const pdfBuffer = await generateEnquiryPDF(
            { ...enquiry, enquiry_number: formattedEnquiryNumber },
            company
        );

        // 6. Store in DMS (always store for tracking)
        let documentId: string | undefined;
        try {
            const document = await DocumentService.generateAndStoreDocument(
                companyUser.company_id,
                pdfBuffer,
                {
                    documentType: 'enquiry',
                    documentCategory: 'Enquiries',
                    referenceType: 'enquiry',
                    referenceId: enquiry.id,
                    documentNumber: formattedEnquiryNumber,
                    documentDate: enquiry.created_at,
                    tags: ['enquiry', enquiry.status, `v${enquiry.version || 1}`],
                    metadata: {
                        version: enquiry.version || 1,
                        customer_name: enquiry.customer_name,
                        status: enquiry.status
                    }
                },
                {
                    version: enquiry.version || 1
                    // Don't pass parentDocumentId - we'll handle document versioning separately
                }
            );
            documentId = document.id;
        } catch (dmsError) {
            console.error('Error storing PDF in DMS:', dmsError);
            // Don't fail the request if DMS storage fails for preview/download
            if (shouldExport) {
                return NextResponse.json({
                    error: "Failed to export PDF to DMS"
                }, { status: 500 });
            }
        }

        // 7. Return response based on request type
        if (shouldExport) {
            // For export requests, return JSON with document info
            return NextResponse.json({
                success: true,
                message: "PDF exported to DMS successfully",
                documentId
            });
        } else {
            // For preview/download requests, return the PDF
            const fileName = NumberingService.formatDocumentName(
                enquiry.enquiry_number,
                enquiry.version || 1,
                enquiry.status
            );

            return new NextResponse(new Uint8Array(pdfBuffer), {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Content-Length': pdfBuffer.length.toString(),
                },
            });
        }

    } catch (error: any) {
        console.error("PDF generation error:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
