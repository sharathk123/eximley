import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';
import { DocumentService } from '@/lib/services/documentService';

// GET - List documents
export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);

        const referenceType = searchParams.get('reference_type');
        const referenceId = searchParams.get('reference_id');
        const category = searchParams.get('category');
        const type = searchParams.get('type');
        const search = searchParams.get('search');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        let query = supabase
            .from('documents')
            .select('*')
            .eq('company_id', companyUser.company_id)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

        if (referenceType) query = query.eq('reference_type', referenceType);
        if (referenceId) query = query.eq('reference_id', referenceId);
        if (category) query = query.eq('document_category', category);
        if (type) query = query.eq('document_type', type);
        if (search) {
            query = query.or(`file_name.ilike.%${search}%,document_number.ilike.%${search}%,notes.ilike.%${search}%`);
        }

        const { data: documents, error } = await query;

        if (error) throw error;

        return NextResponse.json({ documents });
    } catch (error: any) {
        console.error('GET /api/documents error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Upload document
export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const metadataStr = formData.get('metadata') as string;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!metadataStr) {
            return NextResponse.json({ error: 'No metadata provided' }, { status: 400 });
        }

        const metadata = JSON.parse(metadataStr);

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        const document = await DocumentService.uploadDocument(
            companyUser.company_id,
            file,
            metadata
        );

        return NextResponse.json({ document }, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/documents error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Archive document
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const document = await DocumentService.archiveDocument(id);

        return NextResponse.json({ document });
    } catch (error: any) {
        console.error('DELETE /api/documents error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
