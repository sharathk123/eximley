import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function useShippingBillActions(sbId: string) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const approveSB = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shipping-bills/${sbId}/approve`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to approve shipping bill");
            }

            toast({
                title: "Success",
                description: "Shipping bill approved and filed successfully",
            });

            router.refresh();
            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const rejectSB = async (reason: string) => {
        if (!reason?.trim()) {
            toast({
                title: "Error",
                description: "Rejection reason is required",
                variant: "destructive",
            });
            return false;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/shipping-bills/${sbId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to reject shipping bill");
            }

            toast({
                title: "Success",
                description: "Shipping bill rejected",
            });

            router.refresh();
            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const reviseSB = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shipping-bills/${sbId}/revise`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to create revision");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: "New revision created successfully",
            });

            if (data.shippingBill?.id) {
                router.push(`/shipping-bills/${data.shippingBill.id}`);
            } else {
                router.refresh();
            }
            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const deleteSB = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/shipping-bills?id=${sbId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to delete shipping bill");
            }

            toast({
                title: "Success",
                description: "Shipping bill deleted successfully",
            });

            router.push("/shipping-bills");
            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        approveSB,
        rejectSB,
        reviseSB,
        deleteSB,
    };
}
