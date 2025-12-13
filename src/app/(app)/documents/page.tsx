import { DocumentLibrary } from '@/components/documents/DocumentLibrary';
import { PageContainer } from '@/components/ui/page-container';
import { PageHeader } from '@/components/ui/page-header';

export default function DocumentsPage() {
    return (
        <PageContainer>
            <PageHeader
                title="Document Library"
                description="Browse and manage all company documents organized by category and year"
            />
            <DocumentLibrary />
        </PageContainer>
    );
}
