import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { DocumentService } from "@/lib/services/documentService";
import { NumberingService } from "@/lib/services/numberingService";
import path from 'path';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;

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
            enquiry.version || 1, // Default to 1 if column missing (fallback)
            enquiry.status
        );

        // 5. Generate PDF Buffer
        const pdfBuffer = await generateEnquiryPDF(
            { ...enquiry, enquiry_number: formattedEnquiryNumber },
            company
        );

        // 6. Store in DMS
        try {
            await DocumentService.generateAndStoreDocument(
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
                    version: enquiry.version || 1,
                    parentDocumentId: enquiry.parent_enquiry_id
                }
            );
        } catch (dmsError) {
            console.error('Error storing PDF in DMS:', dmsError);
        }

        // 7. Return PDF
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

    } catch (error: any) {
        console.error("PDF generation error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function generateEnquiryPDF(enquiry: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Enquiry ${enquiry.enquiry_number}`,
                    Author: company.legal_name || company.trade_name,
                }
            });

            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            const regularFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
            const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');
            doc.font(regularFontPath);

            // Styling constants
            const primaryColor = '#1e40af';
            const secondaryColor = '#64748b';

            // --- HEADER ---
            doc.fontSize(24).fillColor(primaryColor)
                .text(company.legal_name || company.trade_name);

            doc.fontSize(9).fillColor(secondaryColor);
            if (company.address) doc.text(company.address);
            if (company.city) doc.text(`${company.city}, ${company.state} ${company.pincode}`);
            if (company.email) doc.text(`Email: ${company.email}`);

            doc.moveDown(1);
            doc.strokeColor('#0ea5e9').lineWidth(2)
                .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
            doc.moveDown(1);

            // --- TITLE ---
            doc.fontSize(20).fillColor(primaryColor).text('ENQUIRY', { align: 'center' });
            doc.moveDown(1);

            // --- INFO COLUMNS ---
            const leftCol = 50, rightCol = 300, startY = doc.y;

            // Details
            doc.fontSize(10).fillColor('#000000').font(boldFontPath).text('Enquiry Details:', leftCol, startY);
            doc.fontSize(9).font(regularFontPath).fillColor(secondaryColor);
            doc.text(`Number: ${enquiry.enquiry_number}`, leftCol, startY + 15);
            doc.text(`Date: ${new Date(enquiry.created_at).toLocaleDateString('en-IN')}`, leftCol, startY + 30);
            doc.text(`Priority: ${enquiry.priority?.toUpperCase()}`, leftCol, startY + 45);

            // Customer
            doc.fontSize(10).fillColor('#000000').font(boldFontPath).text('Customer:', rightCol, startY);
            doc.fontSize(9).font(regularFontPath).fillColor(secondaryColor);
            doc.text(enquiry.customer_name, rightCol, startY + 15);
            if (enquiry.customer_company) doc.text(enquiry.customer_company, rightCol, startY + 30);
            if (enquiry.customer_email) doc.text(enquiry.customer_email, rightCol, startY + 45);

            doc.y = Math.max(doc.y, startY + 80);
            doc.moveDown(1);

            // --- ITEMS TABLE ---
            doc.fontSize(10).fillColor('#000000').font(boldFontPath).text('Items of Interest:', 50);
            doc.moveDown(0.5);

            const tableTop = doc.y;
            // Header Bg
            doc.rect(50, tableTop, 495, 20).fill(primaryColor);
            // Header Text
            doc.fillColor('#ffffff').fontSize(9);
            doc.text('#', 55, tableTop + 5, { width: 30 });
            doc.text('Product / SKU', 90, tableTop + 5, { width: 250 });
            doc.text('Target Price', 350, tableTop + 5, { width: 80 });
            doc.text('Quantity', 450, tableTop + 5, { width: 80, align: 'right' });

            let rowY = tableTop + 25;
            doc.fillColor('#000000').font(regularFontPath);

            enquiry.enquiry_items?.forEach((item: any, i: number) => {
                const productName = item.skus?.name || 'Unknown Product';
                const skuCode = item.skus?.sku_code ? `(${item.skus.sku_code})` : '';

                if (i % 2 === 0) doc.rect(50, rowY - 5, 495, 20).fill('#f8f9fa');

                doc.fillColor('#000000')
                    .text((i + 1).toString(), 55, rowY)
                    .text(`${productName} ${skuCode}`, 90, rowY)
                    .text(item.target_price || '-', 350, rowY)
                    .text(item.quantity?.toString() || '-', 450, rowY, { align: 'right' });

                rowY += 20;
            });

            doc.y = rowY + 20;

            // --- NOTES ---
            if (enquiry.description) {
                doc.fontSize(10).font(boldFontPath).text('Description / Notes:');
                doc.fontSize(9).font(regularFontPath).text(enquiry.description);
            }

            // Footer
            const footerY = 750;
            doc.fontSize(8).fillColor(secondaryColor)
                .text('Computer generated enquiry document.', 50, footerY, { align: 'center', width: 495 });

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
