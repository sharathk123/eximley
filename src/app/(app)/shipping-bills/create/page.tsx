import { ShippingBillForm } from "@/components/shipping-bills/ShippingBillForm";

export default function CreateShippingBillPage() {
    return (
        <div className="container py-6">
            <ShippingBillForm mode="create" />
        </div>
    );
}
