/**
 * ExportOrderView Component
 * 
 * Main view component for Export Order details with tabbed interface
 */

"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExportOrderHeader } from './ExportOrderHeader';
import { ExportOrderDetailsTab } from './tabs/ExportOrderDetailsTab';
import { ExportOrderItemsTab } from './tabs/ExportOrderItemsTab';
import { ExportOrderPreviewTab } from './tabs/ExportOrderPreviewTab';
import { ExportOrderDocumentsTab } from './tabs/ExportOrderDocumentsTab';
import { useRouter } from 'next/navigation';
import { useExportOrderPdf } from '@/hooks/useExportOrderPdf';
import { useExportOrderActions } from '@/hooks/useExportOrderActions';

interface ExportOrderViewProps {
    order: any;
}

export function ExportOrderView({ order }: ExportOrderViewProps) {
    const [activeTab, setActiveTab] = useState("details");
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
    } = useExportOrderPdf(order, handleRefresh);

    const {
        approving,
        rejecting,
        revising,
        updatingStatus,
        handleApprove,
        handleReject,
        handleRevise,
        handleMarkStatus,
    } = useExportOrderActions(order, handleRefresh);

    // Load PDF when Preview tab is activated
    useEffect(() => {
        if (activeTab === 'preview' && !pdfUrl && !pdfLoading) {
            loadPdfPreview();
        }
    }, [activeTab, pdfUrl, pdfLoading, loadPdfPreview]);

    return (
        <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
            <ExportOrderHeader
                order={order}
                onEdit={() => router.push(`/orders/${order.id}/edit`)}
                onRefresh={handleRefresh}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevise={handleRevise}
                onMarkStatus={handleMarkStatus}
                approving={approving}
                rejecting={rejecting}
                revising={revising}
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
                    <ExportOrderDetailsTab order={order} />
                </TabsContent>

                <TabsContent value="items" className="pt-2 m-0">
                    <ExportOrderItemsTab
                        items={order.order_items || []}
                        currency={order.currency_code || 'USD'}
                    />
                </TabsContent>

                <TabsContent value="preview" className="pt-2 m-0">
                    <ExportOrderPreviewTab
                        order={order}
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
                    <ExportOrderDocumentsTab orderId={order.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
