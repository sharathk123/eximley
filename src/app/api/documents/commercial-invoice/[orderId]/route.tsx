import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { CommercialInvoice } from "@/components/documents/CommercialInvoice";
import { getUserAndCompany } from "@/lib/helpers/api";
import { generateAndStoreDocument } from "@/lib/helpers/transactions";
import { ERRORS } from "@/lib/constants/messages";

export async function GET(
    request: Request,
    { params }: { params: { orderId: string } }
) {
    const supabase = await createSessionClient();

    try {
        const { user } = await getUserAndCompany(supabase);

        // Fetch order with all related data
        const { data: order, error: orderError } = await supabase
            .from("export_orders")
            .select(`
        *,
        entities!buyer_id (*),
        currencies (symbol),
        order_items (
          *,
          skus (*)
        )
      `)
            .eq("id", params.orderId)
            .single();

        if (orderError || !order) {
            return NextResponse.json({ error: ERRORS.RECORD_NOT_FOUND }, { status: 404 });
        }

        // Fetch company profile
        const { data: company } = await supabase
            .from("companies")
            .select("*")
            .limit(1)
            .single();

        // Generate PDF with error handling and transaction support
        try {
            const pdfBuffer = await renderToBuffer(
                <CommercialInvoice
                    order={order}
                    company={company}
                    buyer={order.entities}
                />
            );

            // Store document with transaction
            const timestamp = Date.now();
            const filePath = `${order.company_id}/commercial-invoices/${timestamp}_${order.order_number}.pdf`;

            await generateAndStoreDocument(
                supabase,
                {
                    company_id: order.company_id,
                    document_type: "commercial_invoice",
                    reference_type: "order",
                    reference_id: params.orderId,
                    file_name: `Commercial-Invoice-${order.order_number}.pdf`,
                    uploaded_by: user.id,
                },
                pdfBuffer,
                filePath
            );

            // Return PDF as download
            return new Response(pdfBuffer as any, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Disposition": `attachment; filename="Commercial-Invoice-${order.order_number}.pdf"`,
                },
            });
        } catch (pdfError) {
            console.error("PDF Generation Failed:", pdfError);
            return NextResponse.json({
                error: ERRORS.DOCUMENT_GENERATION_FAILED
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error("Commercial Invoice Error:", error);
        const status = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
