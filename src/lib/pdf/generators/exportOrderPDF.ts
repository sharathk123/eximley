/**
 * Export Order PDF Generator
 * Generates professional PDF documents for Export Orders using modular components.
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

export async function generateExportOrderPDF(order: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            // Load and register fonts
            const fontBuffers = loadFonts();

            // Initialize PDF document
            const doc = new PDFDocument({
                autoFirstPage: false,
                info: {
                    Title: `Export Order ${order.order_number}`,
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
            const versionText = order.version > 1 ? ` V${order.version}` : '';
            renderHeader(doc, company, 'EXPORT ORDER', `${order.order_number}${versionText}`);

            const boxStartY = doc.y;

            // Left box - Order Details
            const orderFields = [
                { label: 'Order No:', value: order.order_number || '-' },
                { label: 'Date:', value: formatDate(order.order_date) },
                { label: 'Status:', value: order.status?.toUpperCase() || 'PENDING' },
                { label: 'Currency:', value: order.currency_code },
            ];

            if (order.conversion_rate) {
                orderFields.push({ label: 'Exchange Rate:', value: String(order.conversion_rate) });
            }

            renderInfoBox(doc, PDF_LAYOUT.margin, boxStartY, 'ORDER DETAILS', orderFields);

            // Right box - Buyer Details
            const rightBoxX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
            const buyer = order.entities || {};
            const buyerFields = [
                { label: 'Name:', value: buyer.name || 'Unknown' },
            ];

            if (buyer.address) {
                buyerFields.push({ label: 'Address:', value: buyer.address });
            }
            if (buyer.email) {
                buyerFields.push({ label: 'Email:', value: buyer.email });
            }
            if (buyer.phone) {
                buyerFields.push({ label: 'Phone:', value: buyer.phone });
            }
            if (buyer.country) {
                buyerFields.push({ label: 'Country:', value: buyer.country });
            }

            renderInfoBox(doc, rightBoxX, boxStartY, 'BUYER DETAILS', buyerFields);

            doc.y = boxStartY + PDF_LAYOUT.boxHeight + 25;

            // Items table
            const tableItems = order.order_items?.map((item: any) => ({
                name: item.skus?.sku_code || 'Item',
                description: item.skus?.name + (item.description ? `\n${item.description}` : ''),
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.quantity * item.unit_price,
                currency_code: order.currency_code
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
            doc.text(`Total (${order.currency_code}): ${order.total_amount?.toFixed(2)}`, totalX, doc.y, {
                width: totalWidth,
                align: 'right'
            });

            // Amount in Words
            doc.fontSize(10).font('Helvetica-Oblique');
            const words = numberToWords(order.total_amount || 0, order.currency_code);
            doc.text(`${words}`, PDF_LAYOUT.margin, doc.y - 15, {
                width: PDF_LAYOUT.pageWidth - PDF_LAYOUT.margin - totalWidth - 20,
                align: 'left'
            });

            // Logistics & Payment Terms Box
            doc.y += 20;
            const logisticsY = doc.y;

            const logisticsFields = [];
            if (order.incoterm) {
                logisticsFields.push({
                    label: 'Incoterm:',
                    value: order.incoterm_place ? `${order.incoterm} - ${order.incoterm_place}` : order.incoterm
                });
            }
            if (order.payment_terms) {
                logisticsFields.push({ label: 'Payment Terms:', value: order.payment_terms });
            }
            if (order.port_of_loading) {
                logisticsFields.push({ label: 'Loading Port:', value: order.port_of_loading });
            }
            if (order.port_of_discharge) {
                logisticsFields.push({ label: 'Discharge Port:', value: order.port_of_discharge });
            }

            if (logisticsFields.length > 0) {
                renderInfoBox(doc, PDF_LAYOUT.margin, logisticsY, 'LOGISTICS & TERMS', logisticsFields);
            }

            // Bank Details (if available)
            if (order.company_banks) {
                const bank = order.company_banks;
                const bankFields = [
                    { label: 'Bank Name:', value: bank.bank_name },
                    { label: 'Account No:', value: bank.account_number },
                ];
                if (bank.swift_code) {
                    bankFields.push({ label: 'SWIFT:', value: bank.swift_code });
                }
                if (bank.branch_name) {
                    bankFields.push({ label: 'Branch:', value: bank.branch_name });
                }

                const rightLogisticsX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
                renderInfoBox(doc, rightLogisticsX, logisticsY, 'BANKING INSTRUCTIONS', bankFields);
                doc.y = logisticsY + PDF_LAYOUT.boxHeight + 20;
            } else if (logisticsFields.length > 0) {
                doc.y = logisticsY + PDF_LAYOUT.boxHeight + 20;
            }

            // Footer
            renderFooter(doc);

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
