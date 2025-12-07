import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: Request) {
    try {
        const { shipmentId } = await request.json();
        if (!shipmentId) return NextResponse.json({ error: "Shipment ID required" }, { status: 400 });

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const adminClient = createAdminClient();

        // 1. Fetch Data
        const { data: shipment } = await adminClient
            .from("shipments")
            .select("*, company:companies(*), items:shipment_items(*, skus(*))")
            .eq("id", shipmentId)
            .single();

        if (!shipment) return NextResponse.json({ error: "Shipment not found" }, { status: 404 });

        const company = shipment.company;
        const items = shipment.items;

        // 2. Generate PDF
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const fontSize = 12;
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Header
        page.drawText('COMMERCIAL INVOICE', {
            x: 50,
            y: height - 50,
            size: 20,
            font: font,
            color: rgb(0, 0, 0),
        });

        page.drawText(`Invoice No: ${shipment.reference_no}`, { x: 50, y: height - 80, size: fontSize, font });
        page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: height - 95, size: fontSize, font });

        // Exporter
        page.drawText('EXPORTER:', { x: 50, y: height - 130, size: 10, font });
        page.drawText(company.name || '', { x: 50, y: height - 145, size: 10, font });
        page.drawText(company.address || '', { x: 50, y: height - 160, size: 10, font });

        // Buyer
        page.drawText('CONSIGNEE / BUYER:', { x: 300, y: height - 130, size: 10, font });
        page.drawText(shipment.buyer_name || '', { x: 300, y: height - 145, size: 10, font });

        // Items Table Header
        let y = height - 220;
        page.drawText('Description', { x: 50, y, size: 10, font });
        page.drawText('Qty', { x: 300, y, size: 10, font });
        page.drawText('Unit Price', { x: 400, y, size: 10, font });
        page.drawText('Total', { x: 500, y, size: 10, font });

        y -= 20;
        let totalAmount = 0;

        items.forEach((item: any) => {
            const itemName = item.skus?.name || "Item";
            const lineTotal = item.quantity * item.unit_price;
            totalAmount += lineTotal;

            page.drawText(itemName, { x: 50, y, size: 10, font });
            page.drawText(item.quantity.toString(), { x: 300, y, size: 10, font });
            page.drawText(item.unit_price.toFixed(2), { x: 400, y, size: 10, font });
            page.drawText(lineTotal.toFixed(2), { x: 500, y, size: 10, font });
            y -= 20;
        });

        // Total
        y -= 20;
        page.drawText(`TOTAL: ${totalAmount.toFixed(2)} ${items[0]?.currency || 'USD'}`, { x: 400, y, size: 12, font });

        const pdfBytes = await pdfDoc.save();

        // 3. Upload PDF
        const filename = `invoice-${shipment.reference_no}-${Date.now()}.pdf`;
        const path = `${company.id}/shipments/${shipmentId}/generated/${filename}`;

        const { error: uploadError } = await adminClient
            .storage
            .from("documents")
            .upload(path, pdfBytes, {
                contentType: "application/pdf",
                upsert: false
            });

        if (uploadError) {
            throw new Error("Failed to upload PDF: " + uploadError.message);
        }

        // 4. Insert Document Record
        await adminClient
            .from("documents")
            .insert({
                company_id: company.id,
                shipment_id: shipmentId,
                doc_type: "Commercial Invoice",
                file_url: path,
                created_by: user.id
            });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("PDF Generate Error:", error);
        return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
    }
}
