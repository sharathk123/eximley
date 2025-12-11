import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documentService';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ documentId: string }> }
) {
    try {
        const { documentId } = await params;
        const body = await request.json();
        const { expiresIn, maxDownloads, recipientEmail } = body;

        const shareData = await DocumentService.createShareLink(documentId, {
            expiresIn,
            maxDownloads,
            recipientEmail
        });

        return NextResponse.json(shareData);
    } catch (error: any) {
        console.error('POST /api/documents/[documentId]/share error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
