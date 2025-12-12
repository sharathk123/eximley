/**
 * PDF Info Boxes Renderer
 * Renders information boxes (e.g., Enquiry Details, Customer Details)
 */

import { PDF_COLORS, PDF_FONTS, PDF_LAYOUT, FONT_NAMES } from '../constants';

interface InfoBoxField {
    label: string;
    value: string;
    color?: string;
    bold?: boolean;
}

export function renderInfoBox(
    doc: any,
    x: number,
    y: number,
    title: string,
    fields: InfoBoxField[]
): void {
    // Box background and border
    doc.roundedRect(x, y, PDF_LAYOUT.boxWidth, PDF_LAYOUT.boxHeight, 5)
        .fillAndStroke(PDF_COLORS.bgLight, PDF_COLORS.border);

    // Box title
    doc.fontSize(PDF_FONTS.boxTitle)
        .fillColor(PDF_COLORS.primary)
        .font(FONT_NAMES.bold)
        .text(title, x + 15, y + 15);

    // Box fields
    doc.fontSize(PDF_FONTS.normal)
        .fillColor(PDF_COLORS.textDark)
        .font(FONT_NAMES.regular);

    const startY = y + 35;
    fields.forEach((field, index) => {
        const fieldY = startY + (index * 15);

        // Label
        doc.font(FONT_NAMES.bold)
            .fillColor(PDF_COLORS.textMuted)
            .text(field.label, x + 15, fieldY);

        // Value
        const valueFont = field.bold ? FONT_NAMES.bold : FONT_NAMES.regular;
        const valueColor = field.color || PDF_COLORS.textDark;

        doc.font(valueFont)
            .fillColor(valueColor)
            .text(field.value, x + 90, fieldY, { width: 135 });
    });
}

export function formatDate(dateString: string | null | undefined): string {
    if (!dateString) return '-';

    return new Date(dateString).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

export function getPriorityColor(priority: string): string {
    switch (priority) {
        case 'high':
            return PDF_COLORS.danger;
        case 'medium':
            return PDF_COLORS.warning;
        case 'low':
            return PDF_COLORS.success;
        default:
            return PDF_COLORS.success;
    }
}
