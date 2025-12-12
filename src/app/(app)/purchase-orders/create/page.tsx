import { PurchaseOrderForm } from "@/components/purchase-orders/PurchaseOrderForm";

export default function CreatePurchaseOrderPage() {
    return (
        <div className="container py-6">
            <PurchaseOrderForm mode="create" />
        </div>
    );
}
