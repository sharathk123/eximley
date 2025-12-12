/**
 * Enquiry PDF Generator
 * Generates professional PDF documents for enquiries using modular components
 */

import path from 'path';
import { PDF_LAYOUT } from '../constants';
import { loadFonts, registerFonts } from '../fonts';
import { renderHeader } from '../sections/header';
import { renderInfoBox, formatDate, getPriorityColor } from '../sections/infoBox';
import { renderItemsTable } from '../sections/table';
import { renderDescriptionSection, renderFooter } from '../sections/footer';

// Use vendored browser build to avoid Turbopack filesystem issues with standard fonts
// @ts-ignore
const PDFDocument = require('@/lib/pdfkit-legacy.js');

export async function generateEnquiryPDF(enquiry: any, company: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            // Load and register fonts
            const fontBuffers = loadFonts();

            // Initialize PDF document
            const doc = new PDFDocument({
                autoFirstPage: false,
                info: {
                    Title: `Enquiry ${enquiry.enquiry_number}`,
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
            renderHeader(doc, company, 'ENQUIRY', enquiry.enquiry_number);

            const boxStartY = doc.y;

            // Left box - Enquiry Details
            renderInfoBox(doc, PDF_LAYOUT.margin, boxStartY, 'ENQUIRY DETAILS', [
                { label: 'Enquiry No:', value: enquiry.enquiry_number || '-' },
                { label: 'Date:', value: formatDate(enquiry.created_at) },
                { label: 'Follow-up:', value: formatDate(enquiry.next_follow_up_date) },
                {
                    label: 'Priority:',
                    value: enquiry.priority?.toUpperCase() || 'NORMAL',
                    color: getPriorityColor(enquiry.priority),
                    bold: true
                },
                { label: 'Status:', value: enquiry.status?.toUpperCase() || 'PENDING' },
            ]);

            // Right box - Customer Details
            const rightBoxX = PDF_LAYOUT.margin + PDF_LAYOUT.boxWidth + PDF_LAYOUT.boxGap;
            const customerFields = [
                { label: 'Name:', value: enquiry.customer_name || 'Unknown' },
            ];

            if (enquiry.customer_company) {
                customerFields.push({ label: 'Company:', value: enquiry.customer_company });
            }
            if (enquiry.customer_email) {
                customerFields.push({ label: 'Email:', value: enquiry.customer_email });
            }
            if (enquiry.customer_phone) {
                customerFields.push({ label: 'Phone:', value: enquiry.customer_phone });
            }

            renderInfoBox(doc, rightBoxX, boxStartY, 'CUSTOMER DETAILS', customerFields);

            doc.y = boxStartY + PDF_LAYOUT.boxHeight + 25;

            // Items table
            const tableEndY = renderItemsTable(
                doc,
                'ITEMS OF INTEREST',
                enquiry.enquiry_items || []
            );

            doc.y = tableEndY + 20;

            // Description section
            renderDescriptionSection(doc, enquiry.description);

            // Footer
            renderFooter(doc);

            doc.end();

        } catch (e) {
            reject(e);
        }
    });
}
