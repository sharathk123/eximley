import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { DocumentService } from "@/lib/services/documentService";
import { NumberingService } from "@/lib/services/numberingService";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Fetch quote with all details
        const { data: quote, error: quoteError } = await supabase
            .from("quotes")
            .select(`
                *,
                quote_items (*),
                entities:buyer_id (*)
            `)
            .eq("id", id)
            .eq("company_id", companyUser.company_id)
            .single();

        if (quoteError || !quote) {
            return NextResponse.json({ error: "Quote not found" }, { status: 404 });
        }

        // Fetch company details
        const { data: company } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyUser.company_id)
            .single();

        if (!company) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        // Generate Formatted Number (e.g. QT-2024-001-V1 or QT-2024-001-FN)
        const formattedQuoteNumber = NumberingService.formatDocumentNumber(
            quote.quote_number,
            quote.version,
            quote.status
        );

        // Generate PDF (Pass formatted number to appear in the PDF)
        const pdfBuffer = await generateProfessionalPDF(
            { ...quote, quote_number: formattedQuoteNumber },
            company,
            quote.entities
        );

        // Store PDF in DMS
        try {
            await DocumentService.generateAndStoreDocument(
                companyUser.company_id,
                pdfBuffer,
                {
                    documentType: 'quote',
                    documentCategory: 'Quotes',
                    referenceType: 'quote',
                    referenceId: quote.id,
                    documentNumber: formattedQuoteNumber,
                    documentDate: quote.quote_date,
                    tags: ['quote', quote.status, `v${quote.version}`],
                    metadata: {
                        version: quote.version,
                        buyer_id: quote.buyer_id,
                        buyer_name: quote.entities?.name,
                        total_amount: quote.total_amount,
                        currency: quote.currency_code,
                        status: quote.status
                    }
                },
                {
                    version: quote.version,
                    parentDocumentId: quote.parent_quote_id
                }
            );
        } catch (dmsError) {
            console.error('Error storing PDF in DMS:', dmsError);
            // Continue even if DMS storage fails - still return the PDF
        }

        // Return PDF directly as download
        const fileName = NumberingService.formatDocumentName(
            quote.quote_number,
            quote.version,
            quote.status
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

import path from 'path';

// ... (existing code)

async function generateProfessionalPDF(quote: any, company: any, buyer: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                size: 'A4',
                margin: 50,
                info: {
                    Title: `Quotation ${quote.quote_number}`,
                    Author: company.legal_name || company.trade_name,
                }
            });

            // Define font paths
            const regularFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
            const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');

            // Set default font
            doc.font(regularFontPath);

            const chunks: Buffer[] = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Colors
            const primaryColor = '#1e40af'; // Blue
            const secondaryColor = '#64748b'; // Gray
            const accentColor = '#0ea5e9'; // Light blue

            // Header with company info
            doc.fontSize(24)
                .fillColor(primaryColor)
                .text(company.legal_name || company.trade_name, { align: 'left' });

            if (company.trade_name && company.legal_name !== company.trade_name) {
                doc.fontSize(10)
                    .fillColor(secondaryColor)
                    .text(`Trading as: ${company.trade_name}`, { align: 'left' });
            }

            doc.moveDown(0.5);

            // Company details
            doc.fontSize(9)
                .fillColor(secondaryColor);

            if (company.address) {
                doc.text(company.address);
            }
            if (company.city || company.state || company.pincode) {
                const location = [company.city, company.state, company.pincode].filter(Boolean).join(', ');
                doc.text(location);
            }
            if (company.country) {
                doc.text(company.country);
            }
            if (company.phone) {
                doc.text(`Phone: ${company.phone}`);
            }
            if (company.email) {
                doc.text(`Email: ${company.email}`);
            }
            if (company.website) {
                doc.text(`Website: ${company.website}`);
            }
            if (company.gstin) {
                doc.text(`GSTIN: ${company.gstin}`);
            }
            if (company.iec_number) {
                doc.text(`IEC: ${company.iec_number}`);
            }

            // Horizontal line
            doc.moveDown(1);
            doc.strokeColor(accentColor)
                .lineWidth(2)
                .moveTo(50, doc.y)
                .lineTo(545, doc.y)
                .stroke();

            doc.moveDown(1);

            // QUOTATION title
            doc.fontSize(20)
                .fillColor(primaryColor)
                .text('QUOTATION', { align: 'center' });

            doc.moveDown(1);

            // Quote details and buyer info side by side
            const leftColumn = 50;
            const rightColumn = 320;
            const startY = doc.y;

            // Left: Quote details
            doc.fontSize(10)
                .fillColor('#000000')
                .font(boldFontPath)
                .text('Quote Details:', leftColumn, startY);

            doc.font(regularFontPath)
                .fontSize(9)
                .fillColor(secondaryColor);

            let currentY = startY + 20;
            doc.text(`Quote Number: ${quote.quote_number}`, leftColumn, currentY);
            currentY += 15;
            doc.text(`Date: ${new Date(quote.quote_date).toLocaleDateString('en-IN')}`, leftColumn, currentY);
            currentY += 15;
            if (quote.valid_until) {
                doc.text(`Valid Until: ${new Date(quote.valid_until).toLocaleDateString('en-IN')}`, leftColumn, currentY);
                currentY += 15;
            }
            doc.text(`Currency: ${quote.currency_code || 'USD'}`, leftColumn, currentY);
            currentY += 15;
            if (quote.incoterms) {
                doc.text(`Incoterms: ${quote.incoterms}`, leftColumn, currentY);
                currentY += 15;
            }

            // Right: Buyer details
            doc.fontSize(10)
                .fillColor('#000000')
                .font(boldFontPath)
                .text('Bill To:', rightColumn, startY);

            doc.font(regularFontPath)
                .fontSize(9)
                .fillColor(secondaryColor);

            currentY = startY + 20;
            if (buyer) {
                doc.text(buyer.name || 'N/A', rightColumn, currentY, { width: 200 });
                currentY += 15;
                if (buyer.address) {
                    doc.text(buyer.address, rightColumn, currentY, { width: 200 });
                    currentY += 15;
                }
                if (buyer.country) {
                    doc.text(buyer.country, rightColumn, currentY);
                    currentY += 15;
                }
                if (buyer.email) {
                    doc.text(`Email: ${buyer.email}`, rightColumn, currentY);
                    currentY += 15;
                }
                if (buyer.phone) {
                    doc.text(`Phone: ${buyer.phone}`, rightColumn, currentY);
                    currentY += 15;
                }
            } else {
                doc.text('N/A', rightColumn, currentY);
            }

            // Move past both columns
            doc.y = Math.max(currentY, doc.y) + 20;

            // Items table
            doc.moveDown(1);
            doc.fontSize(10)
                .fillColor('#000000')
                .font(boldFontPath)
                .text('Items:', 50);

            doc.moveDown(0.5);

            // Table header
            const tableTop = doc.y;
            const itemX = 50;
            const descX = 150;
            const qtyX = 320;
            const priceX = 380;
            const discountX = 440;
            const totalX = 495;

            doc.fontSize(9)
                .fillColor('#ffffff')
                .rect(50, tableTop, 495, 20)
                .fill(primaryColor);

            doc.fillColor('#ffffff')
                .text('#', itemX + 5, tableTop + 6, { width: 20 })
                .text('Description', descX, tableTop + 6, { width: 160 })
                .text('Qty', qtyX, tableTop + 6, { width: 50 })
                .text('Price', priceX, tableTop + 6, { width: 50 })
                .text('Disc%', discountX, tableTop + 6, { width: 45 })
                .text('Amount', totalX, tableTop + 6, { width: 50, align: 'right' });

            // Table rows
            let rowY = tableTop + 25;
            doc.fillColor('#000000').font(regularFontPath);

            quote.quote_items?.forEach((item: any, index: number) => {
                // Alternate row background
                if (index % 2 === 0) {
                    doc.rect(50, rowY - 3, 495, 20).fillAndStroke('#f8f9fa', '#e9ecef');
                }

                doc.fillColor('#000000')
                    .fontSize(9)
                    .text(String(index + 1), itemX + 5, rowY, { width: 20 })
                    .text(item.product_name || 'N/A', descX, rowY, { width: 160, lineBreak: false, ellipsis: true })
                    .text(String(item.quantity), qtyX, rowY, { width: 50 })
                    .text((item.unit_price || 0).toFixed(2), priceX, rowY, { width: 50 })
                    .text(String(item.discount_percent || 0), discountX, rowY, { width: 45 })
                    .text((item.line_total || 0).toFixed(2), totalX, rowY, { width: 50, align: 'right' });

                rowY += 20;

                // Add description if present
                if (item.description) {
                    doc.fontSize(8)
                        .fillColor(secondaryColor)
                        .text(item.description, descX, rowY, { width: 340 });
                    rowY += 15;
                }
            });

            // Totals section
            doc.y = rowY + 10;
            const totalsX = 400;

            doc.fontSize(9)
                .fillColor('#000000')
                .font(regularFontPath);

            if (quote.subtotal > 0) {
                doc.text('Subtotal:', totalsX, doc.y)
                    .text(`${quote.currency_code} ${quote.subtotal.toFixed(2)}`, totalsX + 95, doc.y, { align: 'right' });
                doc.moveDown(0.5);
            }

            if (quote.discount_amount > 0) {
                doc.text('Discount:', totalsX, doc.y)
                    .text(`- ${quote.currency_code} ${quote.discount_amount.toFixed(2)}`, totalsX + 95, doc.y, { align: 'right' });
                doc.moveDown(0.5);
            }

            if (quote.tax_amount > 0) {
                doc.text('Tax:', totalsX, doc.y)
                    .text(`${quote.currency_code} ${quote.tax_amount.toFixed(2)}`, totalsX + 95, doc.y, { align: 'right' });
                doc.moveDown(0.5);
            }

            // Grand total
            doc.fontSize(11)
                .font(boldFontPath)
                .fillColor(primaryColor)
                .text('Total:', totalsX, doc.y)
                .text(`${quote.currency_code} ${(quote.total_amount || 0).toFixed(2)}`, totalsX + 95, doc.y, { align: 'right' });

            // Terms and conditions
            doc.moveDown(2);
            doc.fontSize(10)
                .fillColor('#000000')
                .font(boldFontPath)
                .text('Terms & Conditions:');

            doc.moveDown(0.5);
            doc.fontSize(9)
                .font(regularFontPath)
                .fillColor(secondaryColor);

            if (quote.payment_terms) {
                doc.text(`Payment Terms: ${quote.payment_terms}`);
            }
            if (quote.delivery_terms) {
                doc.text(`Delivery Terms: ${quote.delivery_terms}`);
            }
            if (quote.incoterms && quote.incoterm_place) {
                doc.text(`Incoterms: ${quote.incoterms} - ${quote.incoterm_place}`);
            }
            if (quote.notes) {
                doc.moveDown(0.5);
                doc.text(`Notes: ${quote.notes}`);
            }

            // Footer
            const footerY = 750;
            doc.fontSize(8)
                .fillColor(secondaryColor)
                .text(
                    'This is a computer-generated quotation and does not require a signature.',
                    50,
                    footerY,
                    { align: 'center', width: 495 }
                );

            if (company.signatory_name) {
                doc.moveDown(0.5);
                doc.text(
                    `For ${company.legal_name || company.trade_name}`,
                    50,
                    footerY + 20,
                    { align: 'right', width: 495 }
                );
                doc.text(
                    company.signatory_name,
                    50,
                    footerY + 35,
                    { align: 'right', width: 495 }
                );
                if (company.signatory_designation) {
                    doc.text(
                        company.signatory_designation,
                        50,
                        footerY + 48,
                        { align: 'right', width: 495 }
                    );
                }
            }

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
}
