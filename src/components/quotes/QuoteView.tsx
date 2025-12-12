"use client";

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuoteHeader } from './QuoteHeader';
import { QuoteDetailsTab } from './tabs/QuoteDetailsTab';
import { QuoteItemsTab } from './tabs/QuoteItemsTab';
import { QuoteDocumentsTab } from './tabs/QuoteDocumentsTab';
// import { QuoteEditDialog } from './QuoteEditDialog';
import { useRouter } from 'next/navigation';

import { useEffect } from 'react';
import { useQuotePdf } from '@/hooks/useQuotePdf';
import { useQuoteActions } from '@/hooks/useQuoteActions';
import { QuotePreviewTab } from './tabs/QuotePreviewTab';

interface QuoteViewProps {
    quote: any;
}

export function QuoteView({ quote }: QuoteViewProps) {
    const [activeTab, setActiveTab] = useState("details");
    // const [isEditOpen, setIsEditOpen] = useState(false);
    const router = useRouter();

    const handleRefresh = () => {
        router.refresh();
    };

    const {
        pdfUrl,
        pdfLoading,
        pdfError,
        exporting,
        loadPdfPreview,
        handleDownloadPdf,
        handleExportToDms,
    } = useQuotePdf(quote, handleRefresh);

    const {
        revising,
        converting,
        handleRevise,
        handleMarkStatus,
        handleConvertToPI
    } = useQuoteActions(quote, handleRefresh);

    // Load PDF when Preview tab is activated
    useEffect(() => {
        if (activeTab === 'preview' && !pdfUrl && !pdfLoading) {
            loadPdfPreview();
        }
    }, [activeTab, pdfUrl, pdfLoading, loadPdfPreview]);

    return (
        <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
            <QuoteHeader
                quote={quote}
                onEdit={() => router.push(`/quotes/${quote.id}/edit`)}
                onRefresh={handleRefresh}
                onRevise={handleRevise}
                onConvert={handleConvertToPI}
                onMarkStatus={handleMarkStatus}
                revising={revising}
                converting={converting}
            />

            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted h-9 p-1">
                    <TabsTrigger
                        value="details"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4"
                    >
                        Details
                    </TabsTrigger>
                    <TabsTrigger
                        value="items"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4"
                    >
                        Items & Calculation
                    </TabsTrigger>
                    <TabsTrigger
                        value="preview"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4"
                    >
                        Preview
                    </TabsTrigger>
                    <TabsTrigger
                        value="documents"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4"
                    >
                        Documents
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="pt-2 m-0">
                    <QuoteDetailsTab quote={quote} />
                </TabsContent>

                <TabsContent value="items" className="pt-2 m-0">
                    <QuoteItemsTab items={quote.quote_items || []} currency={quote.currency_code || 'USD'} />
                </TabsContent>

                <TabsContent value="preview" className="pt-2 m-0">
                    <QuotePreviewTab
                        quote={quote}
                        pdfUrl={pdfUrl}
                        pdfLoading={pdfLoading}
                        pdfError={pdfError}
                        exporting={exporting}
                        onLoadPdf={loadPdfPreview}
                        onDownload={handleDownloadPdf}
                        onExport={handleExportToDms}
                    />
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                    <QuoteDocumentsTab quoteId={quote.id} />
                </TabsContent>
            </Tabs>

            {/* <QuoteEditDialog
                quote={quote}
                open={isEditOpen}
                onOpenChange={setIsEditOpen}
                onSuccess={handleRefresh}
            /> */}
        </div>
    );
}
