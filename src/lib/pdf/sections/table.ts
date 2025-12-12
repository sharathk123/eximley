/**
 * PDF Table Renderer
 * Renders tables with headers and rows
 */

import { PDF_COLORS, PDF_FONTS, PDF_LAYOUT, FONT_NAMES, TABLE_COLUMNS } from '../constants';

export interface TableColumn {
    header: string;
    x: number;
    width: number;
    align?: 'left' | 'right' | 'center';
}

export interface TableRow {
    [key: string]: string | number;
}

export function renderItemsTable(
    doc: any,
    title: string,
    items: any[]
): number {
    // Section title
    doc.fontSize(PDF_FONTS.sectionTitle)
        .fillColor(PDF_COLORS.primary)
        .font(FONT_NAMES.bold)
        .text(title, PDF_LAYOUT.margin);

    doc.moveDown(0.8);

    const tableTop = doc.y;

    // Table border
    doc.roundedRect(PDF_LAYOUT.margin, tableTop, PDF_LAYOUT.tableWidth, 0, 3)
        .stroke(PDF_COLORS.border);

    // Header row
    doc.rect(PDF_LAYOUT.margin, tableTop, PDF_LAYOUT.tableWidth, 25)
        .fill(PDF_COLORS.primary);

    // Header text
    doc.fillColor(PDF_COLORS.white)
        .fontSize(PDF_FONTS.normal)
        .font(FONT_NAMES.bold);

    doc.text('S.No', PDF_LAYOUT.margin + TABLE_COLUMNS.sNo.x, tableTop + 8, {
        width: TABLE_COLUMNS.sNo.width
    });
    doc.text('Product / SKU Code', PDF_LAYOUT.margin + TABLE_COLUMNS.product.x, tableTop + 8, {
        width: TABLE_COLUMNS.product.width
    });
    doc.text('Target Price', PDF_LAYOUT.margin + TABLE_COLUMNS.targetPrice.x, tableTop + 8, {
        width: TABLE_COLUMNS.targetPrice.width,
        align: 'right'
    });
    doc.text('Quantity', PDF_LAYOUT.margin + TABLE_COLUMNS.quantity.x, tableTop + 8, {
        width: TABLE_COLUMNS.quantity.width,
        align: 'right'
    });
    doc.text('Unit', PDF_LAYOUT.margin + TABLE_COLUMNS.unit.x, tableTop + 8, {
        width: TABLE_COLUMNS.unit.width,
        align: 'right'
    });

    let rowY = tableTop + 25;
    doc.font(FONT_NAMES.regular);

    if (items.length === 0) {
        doc.fillColor(PDF_COLORS.textMuted)
            .fontSize(PDF_FONTS.normal)
            .text(
                'No items added to this enquiry',
                PDF_LAYOUT.margin + 10,
                rowY + 10,
                { align: 'center', width: PDF_LAYOUT.tableWidth - 20 }
            );
        rowY += 30;
    } else {
        items.forEach((item: any, i: number) => {
            rowY = renderTableRow(doc, item, i, rowY);
        });
    }

    // Table bottom border
    doc.roundedRect(PDF_LAYOUT.margin, tableTop, PDF_LAYOUT.tableWidth, rowY - tableTop, 3)
        .stroke(PDF_COLORS.border);

    return rowY;
}

function renderTableRow(doc: any, item: any, index: number, rowY: number): number {
    const productName = item.skus?.name || 'Unknown Product';
    const skuCode = item.skus?.sku_code || '';
    const rowHeight = 35;

    // Alternating row background
    if (index % 2 === 0) {
        doc.rect(PDF_LAYOUT.margin, rowY, PDF_LAYOUT.tableWidth, rowHeight)
            .fill(PDF_COLORS.bgLight);
    }

    // Row border
    doc.strokeColor(PDF_COLORS.border)
        .lineWidth(0.5)
        .moveTo(PDF_LAYOUT.margin, rowY + rowHeight)
        .lineTo(PDF_LAYOUT.margin + PDF_LAYOUT.tableWidth, rowY + rowHeight)
        .stroke();

    // Row content
    doc.fillColor(PDF_COLORS.textDark)
        .fontSize(PDF_FONTS.normal);

    // S.No
    doc.text(
        (index + 1).toString(),
        PDF_LAYOUT.margin + TABLE_COLUMNS.sNo.x,
        rowY + 8,
        { width: TABLE_COLUMNS.sNo.width }
    );

    // Product name
    doc.text(
        productName,
        PDF_LAYOUT.margin + TABLE_COLUMNS.product.x,
        rowY + 8,
        { width: TABLE_COLUMNS.product.width }
    );

    // SKU code (smaller text)
    if (skuCode) {
        doc.fillColor(PDF_COLORS.textMuted)
            .fontSize(PDF_FONTS.small)
            .text(
                `SKU: ${skuCode}`,
                PDF_LAYOUT.margin + TABLE_COLUMNS.product.x,
                rowY + 20,
                { width: TABLE_COLUMNS.product.width }
            );
    }

    // Target price
    doc.fillColor(PDF_COLORS.textDark)
        .fontSize(PDF_FONTS.normal);

    const targetPrice = item.target_price
        ? `₹${parseFloat(item.target_price).toLocaleString('en-IN')}`
        : '-';

    doc.text(
        targetPrice,
        PDF_LAYOUT.margin + TABLE_COLUMNS.targetPrice.x,
        rowY + 8,
        { width: TABLE_COLUMNS.targetPrice.width, align: 'right' }
    );

    // Quantity
    doc.text(
        item.quantity?.toString() || '-',
        PDF_LAYOUT.margin + TABLE_COLUMNS.quantity.x,
        rowY + 8,
        { width: TABLE_COLUMNS.quantity.width, align: 'right' }
    );

    // Unit
    doc.text(
        item.unit || 'pcs',
        PDF_LAYOUT.margin + TABLE_COLUMNS.unit.x,
        rowY + 8,
        { width: TABLE_COLUMNS.unit.width, align: 'right' }
    );

    return rowY + rowHeight;
}
