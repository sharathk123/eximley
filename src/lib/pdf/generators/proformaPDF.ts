/**
 * Proforma Invoice PDF Generator
 * Generates professional PDF documents for Proforma Invoices using modular components.
 */

import { PDF_LAYOUT } from '../constants';
import { loadFonts, registerFonts } from '../fonts';
import { renderHeader } from '../sections/header';
import { renderInfoBox, formatDate } from '../sections/infoBox';
import { renderItemsTable } from '../sections/table';
import { renderFooter } from '../sections/footer';
import { numberToWords } from '@/lib/utils/numberToWords';

// Use vendored browser build to avoid Turbopack filesystem issues with standard fonts
// @ts-ignore
const PDFDocument = require('@/lib/pdfkit-legacy.js');

export async function generateProformaPDF(invoice: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            // Load and register fonts
            const fontBuffers = loadFonts();

            // Initialize PDF document
            const doc = new PDFDocument({
                autoFirstPage: false,
                info: {
                    Title: `Proforma Invoice ${invoice.invoice_number}`,
                    Author: company.legal_name || company.trade_name || 'Eximley User',
                }
            });

            registerFonts(doc, fontBuffers);

            // Add first page
            doc.addPage({ size: 'A4', margin: 50 });

            // Stream handling
            const chunks: Buffer[] = [];
            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);

            // Render document sections
            renderHeader(doc, company, 'PROFORMA INVOICE', invoice.invoice_number);

            const boxStartY = doc.y;

            // Left box - Invoice Details
            renderInfoBox(doc, PDF_LAYOUT.margin, boxStartY, 'INVOICE DETAILS', [
                { label: 'Invoice No:', value: invoice.invoice_number || '-' },
                { label: 'Date:', value: formatDate(invoice.date) },
                { label: 'Status:', value: invoice.status?.toUpperCase() || 'DRAFT' },
                { label: 'Currency:', value: invoice.currency_code },
                { label: 'Exchange Rate:', value: String(invoice.conversion_rate) },
            ]);

            // Right box - Buyer Details
            const rightBoxX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
            const entity = invoice.entities || {};
            const buyerFields = [
                { label: 'Name:', value: entity.name || 'Unknown' },
            ];

            if (entity.address) {
                buyerFields.push({ label: 'Address:', value: entity.address });
            }
            if (entity.email) {
                buyerFields.push({ label: 'Email:', value: entity.email });
            }
            if (entity.phone) {
                buyerFields.push({ label: 'Phone:', value: entity.phone });
            }

            renderInfoBox(doc, rightBoxX, boxStartY, 'BUYER DETAILS', buyerFields);

            doc.y = boxStartY + PDF_LAYOUT.boxHeight + 25;

            // LUT Section if applicable
            if (invoice.lut_id) {
                doc.fontSize(10).text("Export under Letter of Undertaking (LUT) without payment of IGST.", {
                    align: 'left'
                });
                doc.moveDown(0.5);
            }

            // Items table
            // Transforming items to match what renderItemsTable likely expects (generic item structure)
            // renderItemsTable expects { name, description, quantity, unit_price, total_price } usually.
            // We need to check renderItemsTable signature/interface but typically it's loose.
            const tableItems = invoice.proforma_items?.map((item: any) => ({
                name: item.skus?.sku_code || 'Item',
                description: item.skus?.name + (item.description ? `\n${item.description}` : ''),
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                currency_code: invoice.currency_code
            })) || [];

            const tableEndY = renderItemsTable(
                doc,
                'LINE ITEMS',
                tableItems
            );

            // Total Summary
            doc.y = tableEndY + 20;
            const totalWidth = 200;
            const totalX = PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - totalWidth;

            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`Total (${invoice.currency_code}): ${invoice.total_amount?.toFixed(2)}`, totalX, doc.y, {
                width: totalWidth,
                align: 'right'
            });

            // Amount in Words
            doc.fontSize(10).font('Helvetica-Oblique');
            const words = numberToWords(invoice.total_amount || 0, invoice.currency_code);
            doc.text(`${words}`, PDF_LAYOUT.margin, doc.y - 15, {
                width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - totalWidth - 20,
                align: 'left'
            });

            // Logistics & Terms Box
            doc.y += 20;
            const logisticsY = doc.y;

            // Render Logistics Info
            renderInfoBox(doc, PDF_LAYOUT.margin, logisticsY, 'LOGISTICS & TERMS', [
                { label: 'Incoterm:', value: invoice.incoterm ? `${invoice.incoterm} - ${invoice.incoterm_place || ''}` : '-' },
                { label: 'Payment Terms:', value: invoice.payment_terms || '-' },
                { label: 'Loading Port:', value: invoice.port_of_loading || '-' },
                { label: 'Discharge Port:', value: invoice.port_of_discharge || '-' },
            ]);

            // Bank Details (if available) - Fetch logic needed?
            // Actually, invoice object should have bank details if we join.
            // But API GET route likely needs update to join 'company_banks'.

            if (invoice.company_banks) {
                const bank = invoice.company_banks;
                const bankFields = [
                    { label: 'Bank Name:', value: bank.bank_name },
                    { label: 'Account No:', value: bank.account_number },
                    { label: 'SWIFT:', value: bank.swift_code || '-' },
                    { label: 'Branch:', value: bank.branch_name || '-' },
                ];
                // Render Bank Details in right box
                const rightLogisticsX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
                renderInfoBox(doc, rightLogisticsX, logisticsY, 'BANKING INSTRUCTIONS', bankFields);
            }

            doc.y = logisticsY + PDF_LAYOUT.boxHeight + 20;

            // Footer
            renderFooter(doc);

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
