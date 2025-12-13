import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateShippingBillPDF } from "@/lib/pdf/generators/shippingBillPDF";

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

        const sbId = id;
        const { searchParams } = new URL(request.url);
        const exportToDms = searchParams.get('export') === 'true';

        // Fetch shipping bill with all related data including company
        const { data: shippingBill, error: fetchError } = await supabase
            .from('shipping_bills')
            .select(`
                *,
                export_orders (
                    order_number,
                    entities (name)
                ),
                proforma_invoices (
                    invoice_number
                ),
                shipping_bill_items (
                    *
                ),
                companies!shipping_bills_company_id_fkey (
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
            .eq('id', sbId)
            .single();

        if (fetchError || !shippingBill) {
            console.error('Error fetching shipping bill:', fetchError);
            return NextResponse.json({ error: "Shipping bill not found" }, { status: 404 });
        }

        // Get company data
        const company = shippingBill.companies;
        if (!company) {
            return NextResponse.json({ error: "Company data not found" }, { status: 404 });
        }

        // Generate PDF
        const pdfBuffer = await generateShippingBillPDF(shippingBill, company);

        if (exportToDms) {
            // Save to DMS
            const fileName = `${shippingBill.sb_number}-V${shippingBill.version || 1}.pdf`;
            const filePath = `shipping_bills/${shippingBill.company_id}/${fileName}`;

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
                company_id: shippingBill.company_id,
                entity_type: 'shipping_bill',
                entity_id: shippingBill.id,
                file_name: fileName,
                file_path: filePath,
                file_type: 'application/pdf',
                file_size: pdfBuffer.length,
            });

            if (docError) {
                console.error('Error creating document record:', docError);
            }

            return NextResponse.json({ success: true, message: "PDF exported to DMS" });
        }

        // Return PDF for preview/download
        return new NextResponse(new Uint8Array(pdfBuffer), {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${shippingBill.sb_number}-V${shippingBill.version || 1}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
