/**
 * Shipping Bill PDF Generator
 * Generates professional PDF documents for Shipping Bills (export customs documentation).
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

export async function generateShippingBillPDF(shippingBill: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            // Load and register fonts
            const fontBuffers = loadFonts();

            // Initialize PDF document
            const doc = new PDFDocument({
                autoFirstPage: false,
                info: {
                    Title: `Shipping Bill ${shippingBill.sb_number}`,
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
            const versionText = shippingBill.version > 1 ? ` V${shippingBill.version}` : '';
            renderHeader(doc, company, 'SHIPPING BILL', `${shippingBill.sb_number}${versionText}`);

            const boxStartY = doc.y;

            // Left box - Shipping Bill Details
            const sbFields = [
                { label: 'SB Number:', value: shippingBill.sb_number || '-' },
                { label: 'SB Date:', value: formatDate(shippingBill.sb_date) },
                { label: 'Status:', value: shippingBill.status?.toUpperCase() || 'DRAFTED' },
                { label: 'Port Code:', value: shippingBill.port_code || '-' },
                { label: 'Customs House:', value: shippingBill.customs_house || '-' },
            ];

            if (shippingBill.customs_officer_name) {
                sbFields.push({ label: 'Customs Officer:', value: shippingBill.customs_officer_name });
            }

            renderInfoBox(doc, PDF_LAYOUT.margin, boxStartY, 'SHIPPING BILL DETAILS', sbFields);

            // Right box - Export References
            const rightBoxX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
            const referenceFields = [];

            if (shippingBill.export_orders?.order_number) {
                referenceFields.push({ label: 'Export Order:', value: shippingBill.export_orders.order_number });
            }
            if (shippingBill.proforma_invoices?.invoice_number) {
                referenceFields.push({ label: 'Proforma Invoice:', value: shippingBill.proforma_invoices.invoice_number });
            }
            if (shippingBill.let_export_order_number) {
                referenceFields.push({ label: 'LET Order No:', value: shippingBill.let_export_order_number });
            }
            if (shippingBill.let_export_date) {
                referenceFields.push({ label: 'LET Date:', value: formatDate(shippingBill.let_export_date) });
            }
            if (shippingBill.ad_code) {
                referenceFields.push({ label: 'AD Code:', value: shippingBill.ad_code });
            }

            if (referenceFields.length > 0) {
                renderInfoBox(doc, rightBoxX, boxStartY, 'EXPORT REFERENCES', referenceFields);
            }

            doc.y = boxStartY + PDF_LAYOUT.boxHeight + 25;

            // Vessel & Consignee Section
            const vesselY = doc.y;
            const vesselFields = [];

            if (shippingBill.vessel_name) {
                vesselFields.push({ label: 'Vessel Name:', value: shippingBill.vessel_name });
            }
            if (shippingBill.voyage_number) {
                vesselFields.push({ label: 'Voyage Number:', value: shippingBill.voyage_number });
            }
            if (shippingBill.port_of_loading) {
                vesselFields.push({ label: 'Port of Loading:', value: shippingBill.port_of_loading });
            }
            if (shippingBill.port_of_discharge) {
                vesselFields.push({ label: 'Port of Discharge:', value: shippingBill.port_of_discharge });
            }

            if (vesselFields.length > 0) {
                renderInfoBox(doc, PDF_LAYOUT.margin, vesselY, 'VESSEL & SHIPMENT', vesselFields);
            }

            // Consignee Details
            const consigneeFields = [];
            if (shippingBill.consignee_name) {
                consigneeFields.push({ label: 'Consignee:', value: shippingBill.consignee_name });
            }
            if (shippingBill.consignee_address) {
                consigneeFields.push({ label: 'Address:', value: shippingBill.consignee_address });
            }
            if (shippingBill.consignee_country) {
                consigneeFields.push({ label: 'Country:', value: shippingBill.consignee_country });
            }

            if (consigneeFields.length > 0) {
                renderInfoBox(doc, rightBoxX, vesselY, 'CONSIGNEE DETAILS', consigneeFields);
            }

            if (vesselFields.length > 0 || consigneeFields.length > 0) {
                doc.y = vesselY + PDF_LAYOUT.boxHeight + 25;
            }

            // Items table
            const tableItems = shippingBill.shipping_bill_items?.map((item: any) => ({
                name: item.hsn_code || 'N/A',
                description: item.description,
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.fob_value,
                currency_code: shippingBill.currency_code || 'USD'
            })) || [];

            const tableEndY = renderItemsTable(
                doc,
                'SHIPPED ITEMS',
                tableItems
            );

            // Financial Summary
            doc.y = tableEndY + 20;
            const summaryWidth = 250;
            const summaryX = PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - summaryWidth;

            doc.fontSize(10).font('Helvetica');

            // FOB Value
            doc.text(`FOB Value (${shippingBill.currency_code || 'USD'}):`, summaryX, doc.y, { width: summaryWidth - 100, align: 'left', continued: true });
            doc.text(`${shippingBill.fob_value?.toFixed(2)}`, { width: 100, align: 'right' });
            doc.moveDown(0.3);

            // Freight
            if (shippingBill.freight_value) {
                doc.text('Freight:', summaryX, doc.y, { width: summaryWidth - 100, align: 'left', continued: true });
                doc.text(`${shippingBill.freight_value?.toFixed(2)}`, { width: 100, align: 'right' });
                doc.moveDown(0.3);
            }

            // Insurance
            if (shippingBill.insurance_value) {
                doc.text('Insurance:', summaryX, doc.y, { width: summaryWidth - 100, align: 'left', continued: true });
                doc.text(`${shippingBill.insurance_value?.toFixed(2)}`, { width: 100, align: 'right' });
                doc.moveDown(0.3);
            }

            // Draw line
            doc.moveTo(summaryX, doc.y).lineTo(PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin, doc.y).stroke();
            doc.moveDown(0.3);

            // Total Value
            doc.fontSize(12).font('Helvetica-Bold');
            doc.text(`Total Value (${shippingBill.currency_code || 'USD'}):`, summaryX, doc.y, { width: summaryWidth - 100, align: 'left', continued: true });
            doc.text(`${shippingBill.total_value?.toFixed(2)}`, { width: 100, align: 'right' });

            // Amount in Words
            doc.fontSize(10).font('Helvetica-Oblique');
            const words = numberToWords(shippingBill.total_value || 0, shippingBill.currency_code || 'USD');
            doc.text(`${words}`, PDF_LAYOUT.margin, doc.y - 15, {
                width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - summaryWidth - 20,
                align: 'left'
            });

            // Additional Details (if any)
            doc.y += 20;
            if (shippingBill.number_of_packages || shippingBill.gross_weight || shippingBill.net_weight) {
                const additionalY = doc.y;
                const additionalFields = [];

                if (shippingBill.number_of_packages) {
                    additionalFields.push({ label: 'Packages:', value: String(shippingBill.number_of_packages) });
                }
                if (shippingBill.gross_weight) {
                    additionalFields.push({ label: 'Gross Weight:', value: `${shippingBill.gross_weight} KG` });
                }
                if (shippingBill.net_weight) {
                    additionalFields.push({ label: 'Net Weight:', value: `${shippingBill.net_weight} KG` });
                }

                renderInfoBox(doc, PDF_LAYOUT.margin, additionalY, 'PACKAGE DETAILS', additionalFields);
                doc.y = additionalY + PDF_LAYOUT.boxHeight + 20;
            }

            // Notes
            if (shippingBill.notes) {
                doc.fontSize(10).font('Helvetica-Bold');
                doc.text('Notes:', PDF_LAYOUT.margin, doc.y);
                doc.moveDown(0.3);
                doc.font('Helvetica');
                doc.text(shippingBill.notes, PDF_LAYOUT.margin, doc.y, {
                    width: PDF_LAYOUT.pageWidth - 2 * PDF_LAYOUT.margin,
                    align: 'left'
                });
                doc.moveDown(1);
            }

            // Footer
            renderFooter(doc);

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
