/**
 * PDFKit Constants and Styling Configuration
 * Centralized configuration for PDF generation using PDFKit
 */

export const PDF_COLORS = {
    primary: '#1e3a8a',      // Dark blue for headers
    accent: '#0ea5e9',       // Bright blue for accents
    textDark: '#1f2937',     // Dark gray for main text
    textMuted: '#6b7280',    // Muted gray for labels
    border: '#e5e7eb',       // Light gray for borders
    bgLight: '#f9fafb',      // Very light gray for backgrounds
    white: '#ffffff',
    success: '#10b981',      // Green for low priority
    warning: '#f59e0b',      // Orange for medium priority
    danger: '#dc2626',       // Red for high priority
} as const;

export const PDF_LAYOUT = {
    pageWidth: 545,
    margin: 50,
    boxWidth: 240,
    boxHeight: 110,
    boxGap: 15,
    tableWidth: 495,
} as const;

export const PDF_FONTS = {
    headerLarge: 26,
    headerMedium: 28,
    sectionTitle: 12,
    boxTitle: 11,
    normal: 9,
    small: 7,
    footer: 7,
} as const;

export const FONT_NAMES = {
    regular: 'Roboto',
    bold: 'Roboto-Bold',
} as const;

export const TABLE_COLUMNS = {
    sNo: { x: 10, width: 35 },
    product: { x: 55, width: 220 },
    targetPrice: { x: 285, width: 70 },
    quantity: { x: 365, width: 60 },
    unit: { x: 435, width: 50 },
} as const;
