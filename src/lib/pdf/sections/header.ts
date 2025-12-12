/**
 * PDF Header Section Renderer
 * Renders company header and document title
 */

import { PDF_COLORS, PDF_FONTS, PDF_LAYOUT, FONT_NAMES } from '../constants';

export function renderHeader(
    doc: any,
    company: any,
    documentTitle: string,
    documentNumber: string
): void {
    // Company name
    doc.fontSize(PDF_FONTS.headerLarge)
        .fillColor(PDF_COLORS.primary)
        .font(FONT_NAMES.bold)
        .text(
            (company.legal_name || company.trade_name || 'My Company').toUpperCase(),
            PDF_LAYOUT.margin,
            PDF_LAYOUT.margin
        );

    doc.moveDown(0.3);

    // Company details
    doc.fontSize(PDF_FONTS.normal)
        .fillColor(PDF_COLORS.textMuted)
        .font(FONT_NAMES.regular);

    const companyDetailsY = doc.y;
    if (company.address) {
        doc.text(company.address, PDF_LAYOUT.margin, companyDetailsY);
    }
    if (company.city) {
        doc.text(
            `${company.city}${company.state ? ', ' + company.state : ''}${company.pincode ? ' - ' + company.pincode : ''}`,
            PDF_LAYOUT.margin
        );
    }
    if (company.email) {
        doc.text(`Email: ${company.email}`, PDF_LAYOUT.margin);
    }
    if (company.phone) {
        doc.text(`Phone: ${company.phone}`, PDF_LAYOUT.margin);
    }

    // Decorative header line
    doc.moveDown(0.8);
    const headerLineY = doc.y;
    doc.strokeColor(PDF_COLORS.accent)
        .lineWidth(3)
        .moveTo(PDF_LAYOUT.margin, headerLineY)
        .lineTo(PDF_LAYOUT.pageWidth + PDF_LAYOUT.margin, headerLineY)
        .stroke();

    doc.strokeColor(PDF_COLORS.border)
        .lineWidth(1)
        .moveTo(PDF_LAYOUT.margin, headerLineY + 5)
        .lineTo(PDF_LAYOUT.pageWidth + PDF_LAYOUT.margin, headerLineY + 5)
        .stroke();

    doc.moveDown(1.5);

    // Document title
    doc.fontSize(PDF_FONTS.headerMedium)
        .fillColor(PDF_COLORS.primary)
        .font(FONT_NAMES.bold)
        .text(documentTitle, { align: 'center' });

    doc.moveDown(0.3);

    doc.fontSize(PDF_FONTS.boxTitle)
        .fillColor(PDF_COLORS.textMuted)
        .font(FONT_NAMES.regular)
        .text(documentNumber || 'N/A', { align: 'center' });

    doc.moveDown(1.5);
}
