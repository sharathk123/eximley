"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useRouter } from "next/navigation";
import { ProformaDetailsTab } from "./tabs/ProformaDetailsTab";
import { ProformaItemsTab } from "./tabs/ProformaItemsTab";
import { ProformaPreviewTab } from "./tabs/ProformaPreviewTab";
import { ProformaDocumentsTab } from "./tabs/ProformaDocumentsTab";
import { DocumentLineage } from "@/components/shared/DocumentLineage";

import { ProformaHeader } from "./ProformaHeader";

interface ProformaInvoiceViewProps {
    invoice: any;
}

export function ProformaInvoiceView({ invoice }: ProformaInvoiceViewProps) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("details");



    return (
        <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header */}
            <ProformaHeader
                invoice={invoice}
                onEdit={() => router.push(`/invoices/proforma/${invoice.id}/edit`)}
                onRefresh={() => router.refresh()}
            />

            {/* Tabs */}
            <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="bg-muted h-9 p-1">
                    <TabsTrigger value="details" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4">Details</TabsTrigger>
                    <TabsTrigger value="items" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4">Items & Calculation</TabsTrigger>
                    <TabsTrigger value="preview" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4">Preview</TabsTrigger>
                    <TabsTrigger value="documents" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4">Documents</TabsTrigger>
                    <TabsTrigger value="lineage" className="data-[state=active]:bg-background data-[state=active]:text-foreground px-4">Lineage</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="pt-2 m-0">
                    <ProformaDetailsTab invoice={invoice} />
                </TabsContent>

                <TabsContent value="items" className="pt-2 m-0">
                    <ProformaItemsTab items={invoice.proforma_items} currencyCode={invoice.currency_code} />
                </TabsContent>

                <TabsContent value="preview" className="pt-2 m-0">
                    <ProformaPreviewTab
                        invoice={invoice}
                    />
                </TabsContent>

                <TabsContent value="documents" className="pt-2 m-0">
                    <ProformaDocumentsTab invoice={invoice} />
                </TabsContent>

                <TabsContent value="lineage" className="pt-2 m-0">
                    <DocumentLineage
                        documentType="proforma_invoice"
                        documentId={invoice.id}
                        relatedDocuments={{
                            sourceQuote: invoice.quotes && invoice.quotes.length > 0 ? {
                                id: invoice.quotes[0].id,
                                number: invoice.quotes[0].quote_number,
                                status: invoice.quotes[0].status,
                            } : undefined,
                            exportOrders: invoice.export_orders?.map((order: any) => ({
                                id: order.id,
                                number: order.order_number,
                                status: order.status,
                            })),
                        }}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
