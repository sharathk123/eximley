
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
// @ts-ignore
const PDFDocument = require('@/lib/pdfkit-legacy.js');

export async function GET() {
    const logs: string[] = [];
    const log = (msg: string) => logs.push(msg);

    try {
        log(`__filename: ${__filename}`);
        log(`require.resolve('pdfkit'): ${require.resolve('pdfkit')}`);
        log('Starting simulation...');
        const fontsDir = path.join(process.cwd(), 'public', 'fonts');

        // 1. Reading Buffers
        log('Reading buffers...');
        const regularPath = path.join(fontsDir, 'Roboto-Regular.ttf');
        const boldPath = path.join(fontsDir, 'Roboto-Bold.ttf');

        if (!fs.existsSync(regularPath)) throw new Error('Regular font missing');
        if (!fs.existsSync(boldPath)) throw new Error('Bold font missing');

        const regularBuffer = fs.readFileSync(regularPath);
        const boldBuffer = fs.readFileSync(boldPath);
        log('Buffers read successfully.');
        log(`Regular buffer header: ${regularBuffer.toString('hex', 0, 4)}`);
        log(`Bold buffer header: ${boldBuffer.toString('hex', 0, 4)}`);

        // 2. Constructor
        log('Testing with Courier-Bold to check options propagation');
        const doc = new PDFDocument({
            autoFirstPage: false,
            font: 'Courier-Bold',
            info: { Title: 'Test', Author: 'Debug' }
        });
        log('Constructor passed.');

        // 3. Register Fonts
        log('Registering fonts...');
        doc.registerFont('Roboto', regularBuffer);
        doc.registerFont('Roboto-Bold', boldBuffer);
        log('Fonts registered.');

        // 4. Add Page
        log('Adding page...');
        doc.addPage({ size: 'A4', margin: 50 });
        log('Page added.');

        // 5. Set Font
        log('Setting font to Roboto...');
        doc.font('Roboto');
        log('Font set.');

        // 6. Add Text
        log('Adding text...');
        doc.text('Hello World');
        log('Text added.');

        // 7. Text with Bold
        log('Setting font to Roboto-Bold...');
        doc.font('Roboto-Bold');
        doc.text('Bold Text');
        log('Bold Text added.');

        doc.end();
        log('Finished.');

        return NextResponse.json({ success: true, logs });

    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: e.message,
            stack: e.stack,
            logs
        }, { status: 200 });
    }
}
