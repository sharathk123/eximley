import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { generateExportOrderPDF } from "@/lib/pdf/generators/exportOrderPDF";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orderId = params.id;
        const { searchParams } = new URL(request.url);
        const exportToDms = searchParams.get('export') === 'true';

        // Fetch order with all related data including company and bank details
        const { data: order, error: fetchError } = await supabase
            .from('export_orders')
            .select(`
                *,
                entities:buyer_id (
                    id,
                    name,
                    email,
                    phone,
                    address,
                    country
                ),
                order_items (
                    *,
                    skus (
                        id,
                        name,
                        sku_code,
                        description
                    )
                ),
                companies!export_orders_company_id_fkey (
                    id,
                    name,
                    legal_name,
                    trade_name,
                    address,
                    email,
                    phone,
                    gstin,
                    iec_number
                ),
                company_banks (
                    id,
                    bank_name,
                    account_number,
                    swift_code,
                    branch_name,
                    ifsc_code
                )
            `)
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            console.error('Error fetching order:', fetchError);
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Get company data
        const company = order.companies;
        if (!company) {
            return NextResponse.json({ error: "Company data not found" }, { status: 404 });
        }

        // Generate PDF
        const pdfBuffer = await generateExportOrderPDF(order, company);

        if (exportToDms) {
            // Save to DMS
            const fileName = `${order.order_number}-V${order.version || 1}.pdf`;
            const filePath = `export_orders/${order.company_id}/${fileName}`;

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
                company_id: order.company_id,
                entity_type: 'export_order',
                entity_id: order.id,
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
                'Content-Disposition': `inline; filename="${order.order_number}-V${order.version || 1}.pdf"`,
            },
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
