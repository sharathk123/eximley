import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generatePurchaseOrderPDF } from "@/lib/pdf/generators/purchaseOrderPDF";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const poId = id;
        const url = new URL(request.url);
        const exportToDms = url.searchParams.get('export') === 'true';

        // Get the PO with all details including company
        const { data: po, error: fetchError } = await supabase
            .from('purchase_orders')
            .select(`
                *,
                entities:vendor_id(
                    id,
                    name,
                    address,
                    email,
                    phone
                ),
                purchase_order_items(
                    *,
                    skus(
                        id,
                        name,
                        sku_code,
                        description
                    )
                ),
                companies!purchase_orders_company_id_fkey(
                    id,
                    name,
                    legal_name,
                    trade_name,
                    address,
                    email,
                    phone,
                    gstin,
                    iec_number
                )
            `)
            .eq('id', poId)
            .single();

        if (fetchError || !po) {
            console.error('Error fetching PO:', fetchError);
            return NextResponse.json({ error: "Purchase Order not found" }, { status: 404 });
        }

        // Get company data
        const company = po.companies;
        if (!company) {
            return NextResponse.json({ error: "Company data not found" }, { status: 404 });
        }

        // Generate PDF
        const pdfBuffer = await generatePurchaseOrderPDF(po, company);

        if (exportToDms) {
            // Save PDF to DMS
            const fileName = `${po.po_number}-V${po.version || 1}.pdf`;
            const filePath = `purchase_orders/${po.company_id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, pdfBuffer, {
                    contentType: 'application/pdf',
                    upsert: true,
                });

            if (uploadError) {
                console.error('Error uploading to storage:', uploadError);
                return NextResponse.json({ error: "Failed to upload PDF" }, { status: 500 });
            }

            // Create document record
            const { error: docError } = await supabase.from('documents').insert({
                company_id: po.company_id,
                entity_type: 'purchase_order',
                entity_id: po.id,
                file_name: fileName,
                file_path: filePath,
                file_type: 'application/pdf',
                file_size: pdfBuffer.length,
            });

            if (docError) {
                console.error('Error creating document record:', docError);
            }

            return NextResponse.json({
                success: true,
                message: "PDF exported to DMS",
                po_number: po.po_number
            });
        }

        // Return PDF for preview/download
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${po.po_number}-V${po.version || 1}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error in generate-pdf endpoint:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
