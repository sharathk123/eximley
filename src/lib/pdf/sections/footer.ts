/**
 * PDF Footer Renderer
 * Renders document footer with metadata
 */

import { PDF_COLORS, PDF_FONTS, PDF_LAYOUT, FONT_NAMES } from '../constants';

export function renderFooter(doc: any): void {
    const footerY = 750;

    doc.strokeColor(PDF_COLORS.border)
        .lineWidth(1)
        .moveTo(PDF_LAYOUT.margin, footerY)
        .lineTo(PDF_LAYOUT.pageWidth + PDF_LAYOUT.margin, footerY)
        .stroke();

    doc.fontSize(PDF_FONTS.footer)
        .fillColor(PDF_COLORS.textMuted)
        .font(FONT_NAMES.regular)
        .text(
            'This is a computer-generated document and does not require a signature.',
            PDF_LAYOUT.margin,
            footerY + 8,
            {
                align: 'center',
                width: PDF_LAYOUT.tableWidth
            }
        );

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
    const timeStr = now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit'
    });

    doc.text(
        `Generated on ${dateStr} at ${timeStr}`,
        PDF_LAYOUT.margin,
        footerY + 18,
        {
            align: 'center',
            width: PDF_LAYOUT.tableWidth
        }
    );
}

export function renderDescriptionSection(doc: any, description: string | null): void {
    if (!description) return;

    doc.fontSize(PDF_FONTS.boxTitle)
        .fillColor(PDF_COLORS.primary)
        .font(FONT_NAMES.bold)
        .text('DESCRIPTION / NOTES', PDF_LAYOUT.margin);

    doc.moveDown(0.5);

    doc.roundedRect(PDF_LAYOUT.margin, doc.y, PDF_LAYOUT.tableWidth, 0, 5)
        .stroke(PDF_COLORS.border);

    const descBoxY = doc.y;
    doc.rect(PDF_LAYOUT.margin, descBoxY, PDF_LAYOUT.tableWidth, 0)
        .fill(PDF_COLORS.bgLight);

    doc.fontSize(PDF_FONTS.normal)
        .fillColor(PDF_COLORS.textDark)
        .font(FONT_NAMES.regular)
        .text(
            description,
            PDF_LAYOUT.margin + 15,
            descBoxY + 10,
            { width: PDF_LAYOUT.tableWidth - 30 }
        );

    const descHeight = doc.y - descBoxY + 15;
    doc.roundedRect(PDF_LAYOUT.margin, descBoxY, PDF_LAYOUT.tableWidth, descHeight, 5)
        .stroke(PDF_COLORS.border);

    doc.y = descBoxY + descHeight + 10;
}
