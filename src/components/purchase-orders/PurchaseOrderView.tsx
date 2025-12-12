"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PurchaseOrderDetailsTab } from "./tabs/PurchaseOrderDetailsTab";
import { PurchaseOrderItemsTab } from "./tabs/PurchaseOrderItemsTab";
import { PurchaseOrderDocumentsTab } from "./tabs/PurchaseOrderDocumentsTab";
import { PurchaseOrderPreviewTab } from "./tabs/PurchaseOrderPreviewTab";

interface PurchaseOrderViewProps {
    po: any;
}

export function PurchaseOrderView({ po }: PurchaseOrderViewProps) {
    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
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
        </Tabs>
    );
}
