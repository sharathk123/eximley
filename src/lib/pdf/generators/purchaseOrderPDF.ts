/**
 * Purchase Order PDF Generator
 * Generates professional PDF documents for Purchase Orders using modular components.
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

export async function generatePurchaseOrderPDF(po: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            // Load and register fonts
            const fontBuffers = loadFonts();

            // Initialize PDF document
            const doc = new PDFDocument({
                autoFirstPage: false,
                info: {
                    Title: `Purchase Order ${po.po_number}`,
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
            const versionText = po.version > 1 ? ` V${po.version}` : '';
            renderHeader(doc, company, 'PURCHASE ORDER', `${po.po_number}${versionText}`);

            const boxStartY = doc.y;

            // Left box - PO Details
            const poFields = [
                { label: 'PO Number:', value: po.po_number || '-' },
                { label: 'Date:', value: formatDate(po.po_date) },
                { label: 'Status:', value: po.status?.toUpperCase() || 'PENDING' },
                { label: 'Currency:', value: po.currency_code || 'INR' },
            ];

            if (po.expected_delivery_date) {
                poFields.push({ label: 'Expected Delivery:', value: formatDate(po.expected_delivery_date) });
            }

            renderInfoBox(doc, PDF_LAYOUT.margin, boxStartY, 'PURCHASE ORDER DETAILS', poFields);

            // Right box - Vendor Details
            const rightBoxX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
            const vendor = po.entities || {};
            const vendorFields = [
                { label: 'Vendor:', value: vendor.name || 'Unknown' },
            ];

            if (vendor.address) {
                vendorFields.push({ label: 'Address:', value: vendor.address });
            }
            if (vendor.email) {
                vendorFields.push({ label: 'Email:', value: vendor.email });
            }
            if (vendor.phone) {
                vendorFields.push({ label: 'Phone:', value: vendor.phone });
            }

            renderInfoBox(doc, rightBoxX, boxStartY, 'VENDOR DETAILS', vendorFields);

            doc.y = boxStartY + PDF_LAYOUT.boxHeight + 25;

            // Items table
            const tableItems = po.purchase_order_items?.map((item: any) => ({
                name: item.skus?.sku_code || 'Item',
                description: item.skus?.name + (item.description ? `\n${item.description}` : ''),
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                currency_code: po.currency_code || 'INR'
            })) || [];

            const tableEndY = renderItemsTable(
                doc,
                'ORDER ITEMS',
                tableItems
            );

            // Total Summary
            doc.y = tableEndY + 20;
            const totalWidth = 200;
            const totalX = PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - totalWidth;

            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`Total (${po.currency_code || 'INR'}): ${po.total_amount?.toFixed(2)}`, totalX, doc.y, {
                width: totalWidth,
                align: 'right'
            });

            // Amount in Words
            doc.fontSize(10).font('Helvetica-Oblique');
            const words = numberToWords(po.total_amount || 0, po.currency_code || 'INR');
            doc.text(`${words}`, PDF_LAYOUT.margin, doc.y - 15, {
                width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - totalWidth - 20,
                align: 'left'
            });

            // Delivery & Payment Terms Box
            doc.y += 20;
            const termsY = doc.y;

            const termsFields = [];
            if (po.delivery_address) {
                termsFields.push({ label: 'Delivery Address:', value: po.delivery_address });
            }
            if (po.payment_terms) {
                termsFields.push({ label: 'Payment Terms:', value: po.payment_terms });
            }
            if (po.notes) {
                termsFields.push({ label: 'Notes:', value: po.notes });
            }

            if (termsFields.length > 0) {
                renderInfoBox(doc, PDF_LAYOUT.margin, termsY, 'DELIVERY & PAYMENT TERMS', termsFields);
                doc.y = termsY + PDF_LAYOUT.boxHeight + 20;
            }

            // Footer
            renderFooter(doc);

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
