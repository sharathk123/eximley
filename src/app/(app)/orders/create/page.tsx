import { OrderForm } from "@/components/orders/OrderForm";

export default function CreateOrderPage() {
    return (
        <div className="container py-6">
            <OrderForm mode="create" />
        </div>
    );
}
