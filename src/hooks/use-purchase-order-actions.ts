import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

export function usePurchaseOrderActions(poId: string) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const approvePO = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/purchase-orders/${poId}/approve`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to approve PO");
            }

            toast({
                title: "Success",
                description: "Purchase order approved successfully",
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

    const rejectPO = async (reason: string) => {
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
            const res = await fetch(`/api/purchase-orders/${poId}/reject`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to reject PO");
            }

            toast({
                title: "Success",
                description: "Purchase order rejected",
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

    const revisePO = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/purchase-orders/${poId}/revise`, {
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

            // Navigate to the new revision
            if (data.po?.id) {
                router.push(`/purchase-orders/${data.po.id}`);
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

    const deletePO = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/purchase-orders?id=${poId}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to delete PO");
            }

            toast({
                title: "Success",
                description: "Purchase order deleted successfully",
            });

            router.push("/purchase-orders");
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
        approvePO,
        rejectPO,
        revisePO,
        deletePO,
    };
}
