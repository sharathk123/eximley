import { NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documentService';

export async function POST(
    request: Request,
    { params }: { params: { documentId: string } }
) {
    try {
        const body = await request.json();
        const { expiresIn, maxDownloads, recipientEmail } = body;

        const shareData = await DocumentService.createShareLink(params.documentId, {
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
