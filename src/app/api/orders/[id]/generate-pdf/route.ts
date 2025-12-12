import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

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

        // Fetch order with all related data
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
                    address,
                    email,
                    phone,
                    gstin,
                    iec_number
                )
            `)
            .eq('id', orderId)
            .single();

        if (fetchError || !order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // TODO: Implement actual PDF generation using exportOrderPDF.ts
        // For now, return a placeholder response
        const pdfBuffer = Buffer.from("PDF generation not yet implemented");

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
            await supabase.from('documents').insert({
                company_id: order.company_id,
                entity_type: 'export_order',
                entity_id: order.id,
                file_name: fileName,
                file_path: filePath,
                file_type: 'application/pdf',
                file_size: pdfBuffer.length,
            });

            return NextResponse.json({ success: true, message: "PDF exported to DMS" });
        }

        // Return PDF for preview/download
        return new NextResponse(pdfBuffer, {
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
