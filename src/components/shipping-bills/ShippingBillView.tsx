"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShippingBillDetailsTab } from "./tabs/ShippingBillDetailsTab";
import { ShippingBillItemsTab } from "./tabs/ShippingBillItemsTab";
import { ShippingBillDocumentsTab } from "./tabs/ShippingBillDocumentsTab";
import { ShippingBillPreviewTab } from "./tabs/ShippingBillPreviewTab";

interface ShippingBillViewProps {
    sb: any;
}

export function ShippingBillView({ sb }: ShippingBillViewProps) {
    return (
        <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="items">Items</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
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
        </Tabs>
    );
}
