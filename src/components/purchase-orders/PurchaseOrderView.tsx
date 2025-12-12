"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrderDetailsTab } from "./tabs/PurchaseOrderDetailsTab";
import { PurchaseOrderItemsTab } from "./tabs/PurchaseOrderItemsTab";
import { PurchaseOrderDocumentsTab } from "./tabs/PurchaseOrderDocumentsTab";
import { PurchaseOrderPreviewTab } from "./tabs/PurchaseOrderPreviewTab";
import { DocumentLineage } from "@/components/shared/DocumentLineage";

interface PurchaseOrderViewProps {
    po: any;
}

export function PurchaseOrderView({ po }: PurchaseOrderViewProps) {
    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="lineage">Lineage</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-6">
                <PurchaseOrderDetailsTab po={po} />
            </TabsContent>

            <TabsContent value="items" className="mt-6">
                <PurchaseOrderItemsTab po={po} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
                <PurchaseOrderDocumentsTab po={po} />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
                <PurchaseOrderPreviewTab po={po} />
            </TabsContent>

            <TabsContent value="lineage" className="mt-6">
                <DocumentLineage
                    documentType="export_order"
                    documentId={po.id}
                    relatedDocuments={{
                        sourceProforma: po.export_orders?.proforma_invoices ? {
                            id: po.export_orders.proforma_invoices.id,
                            number: po.export_orders.proforma_invoices.pi_number,
                            status: po.export_orders.proforma_invoices.status,
                            date: po.export_orders.proforma_invoices.pi_date
                        } : undefined,
                        exportOrders: po.export_orders ? [{
                            id: po.export_orders.id,
                            number: po.export_orders.order_number,
                            status: po.export_orders.status,
                            date: po.export_orders.order_date
                        }] : []
                    }}
                />
            </TabsContent>
        </Tabs>
    );
}
