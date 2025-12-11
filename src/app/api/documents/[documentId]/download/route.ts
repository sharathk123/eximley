import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documentService';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        const { url, fileName } = await DocumentService.downloadDocument(documentId);

        // Redirect to signed URL
        return NextResponse.redirect(url);
    } catch (error: any) {
        console.error('GET /api/documents/[documentId]/download error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
