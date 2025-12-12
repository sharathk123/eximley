/**
 * PDF Font Utilities
 * Handles font loading and registration for PDFKit
 */

import fs from 'fs';
import path from 'path';
import { FONT_NAMES } from './constants';

export interface FontBuffers {
    regular: Buffer;
    bold: Buffer;
}

/**
 * Load font files from the public directory
 */
export function loadFonts(): FontBuffers {
    const regularFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf');
    const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Bold.ttf');

    try {
        if (!fs.existsSync(regularFontPath)) {
            throw new Error(`Regular font not found at ${regularFontPath}`);
        }

        if (!fs.existsSync(boldFontPath)) {
            throw new Error(`Bold font not found at ${boldFontPath}`);
        }

        return {
            regular: fs.readFileSync(regularFontPath),
            bold: fs.readFileSync(boldFontPath),
        };
    } catch (error) {
        console.error('CRITICAL: Failed to load fonts:', error);
        throw new Error(`Font loading failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

/**
 * Register fonts with PDFKit document
 */
export function registerFonts(doc: any, fontBuffers: FontBuffers): void {
    doc.registerFont(FONT_NAMES.regular, fontBuffers.regular);
    doc.registerFont(FONT_NAMES.bold, fontBuffers.bold);
}
