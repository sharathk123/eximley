"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShippingBillDetailsTab } from "./tabs/ShippingBillDetailsTab";
import { ShippingBillItemsTab } from "./tabs/ShippingBillItemsTab";
import { ShippingBillDocumentsTab } from "./tabs/ShippingBillDocumentsTab";
import { ShippingBillPreviewTab } from "./tabs/ShippingBillPreviewTab";
import { DocumentLineage } from "@/components/shared/DocumentLineage";

interface ShippingBillViewProps {
    sb: any;
}

export function ShippingBillView({ sb }: ShippingBillViewProps) {
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
                <ShippingBillDetailsTab sb={sb} />
            </TabsContent>

            <TabsContent value="items" className="mt-6">
                <ShippingBillItemsTab sb={sb} />
            </TabsContent>

            <TabsContent value="documents" className="mt-6">
                <ShippingBillDocumentsTab sb={sb} />
            </TabsContent>

            <TabsContent value="preview" className="mt-6">
                <ShippingBillPreviewTab sb={sb} />
            </TabsContent>

            <TabsContent value="lineage" className="mt-6">
                <DocumentLineage
                    documentType="shipping_bill"
                    documentId={sb.id}
                    relatedDocuments={{
                        sourceProforma: sb.proforma_invoices ? {
                            id: sb.proforma_invoices.id,
                            number: sb.proforma_invoices.pi_number,
                            status: sb.proforma_invoices.status,
                            date: sb.proforma_invoices.pi_date
                        } : undefined,
                        exportOrders: sb.export_orders ? [{
                            id: sb.export_orders.id,
                            number: sb.export_orders.order_number,
                            status: sb.export_orders.status,
                            date: sb.export_orders.order_date
                        }] : []
                    }}
                />
            </TabsContent>
        </Tabs>
    );
}
