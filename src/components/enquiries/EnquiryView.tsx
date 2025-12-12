/**
 * EnquiryView Component
 * 
 * Main component for viewing enquiry details with tabs for different sections
 */

"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentBrowser } from '@/components/documents/DocumentBrowser';
import { cn } from "@/lib/utils";
import type { Enquiry } from '@/types/enquiry';
import { useEnquiryPdf } from '@/hooks/useEnquiryPdf';
import { useEnquiryActions } from '@/hooks/useEnquiryActions';
import { EnquiryHeader } from './EnquiryHeader';
import { EnquiryDetailsTab } from './tabs/EnquiryDetailsTab';
import { EnquiryPreviewTab } from './tabs/EnquiryPreviewTab';

interface EnquiryViewProps {
    enquiry: Enquiry;
    onRefresh?: () => void;
}

export function EnquiryView({ enquiry, onRefresh }: EnquiryViewProps) {
    const [activeTab, setActiveTab] = useState("details");

    // Custom hooks for PDF and actions
    const {
        pdfUrl,
        pdfLoading,
        pdfError,
        exporting,
        loadPdfPreview,
        handleDownloadPdf,
        handleExportToDms,
    } = useEnquiryPdf(enquiry, onRefresh);

    const {
        revising,
        handleRevise,
        handleMarkStatus,
        handleConvert,
    } = useEnquiryActions(enquiry, onRefresh);

    // Scroll to top when component mounts to prevent screen jumping
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }, []);

    // Load PDF when Preview tab is activated
    useEffect(() => {
        if (activeTab === 'preview' && !pdfUrl && !pdfLoading) {
            loadPdfPreview();
        }
    }, [activeTab, pdfUrl, pdfLoading]);

    if (!enquiry) return null;

    return (
        <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header with navigation and actions */}
            <EnquiryHeader
                enquiry={enquiry}
                revising={revising}
                onRevise={handleRevise}
                onMarkWon={() => handleMarkStatus('won')}
                onMarkLost={() => handleMarkStatus('lost')}
                onConvert={handleConvert}
            />

            {/* Tabs for different sections */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted h-9 p-1">
                    <TabsTrigger
                        value="details"
                        className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4"
                    >
                        Details
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

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6">
                    <EnquiryDetailsTab enquiry={enquiry} />
                </TabsContent>

                {/* Preview Tab */}
                <TabsContent value="preview" className="space-y-4">
                    <EnquiryPreviewTab
                        enquiry={enquiry}
                        pdfUrl={pdfUrl}
                        pdfLoading={pdfLoading}
                        pdfError={pdfError}
                        exporting={exporting}
                        onLoadPdf={loadPdfPreview}
                        onDownload={handleDownloadPdf}
                        onExport={handleExportToDms}
                    />
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="documents" className="space-y-6">
                    <DocumentBrowser
                        referenceType="enquiry"
                        referenceId={enquiry.id}
                        category="enquiry"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
