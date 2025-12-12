import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

interface UseProformaActionsReturn {
    approving: boolean;
    rejecting: boolean;
    revising: boolean;
    updatingStatus: boolean;
    handleApprove: () => Promise<void>;
    handleReject: (reason: string) => Promise<void>;
    handleRevise: () => Promise<void>;
    handleMarkStatus: (status: string) => Promise<void>;
}

export function useProformaActions(invoice: any, onRefresh?: () => void): UseProformaActionsReturn {
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [revising, setRevising] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleApprove = async () => {
        if (!invoice?.id) return;
        try {
            setApproving(true);
            const response = await fetch(`/api/invoices/proforma/${invoice.id}/approve`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to approve invoice');
            }

            toast({
                title: "Success",
                description: "Proforma Invoice approved successfully",
            });

            if (onRefresh) onRefresh();
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to approve invoice",
                variant: "destructive"
            });
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async (reason: string) => {
        if (!invoice?.id) return;
        try {
            setRejecting(true);
            const response = await fetch(`/api/invoices/proforma/${invoice.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to reject invoice');
            }

            toast({
                title: "Success",
                description: "Proforma Invoice rejected",
            });

            if (onRefresh) onRefresh();
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to reject invoice",
                variant: "destructive"
            });
        } finally {
            setRejecting(false);
        }
    };

    const handleRevise = async () => {
        if (!invoice?.id) return;
        try {
            setRevising(true);
            const response = await fetch(`/api/invoices/proforma/${invoice.id}/revise`, {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create revised invoice');
            }

            const data = await response.json();
            toast({
                title: "Success",
                description: `Created revision V${data.invoice.version}`,
            });

            if (data.invoice && data.invoice.id) {
                router.push(`/invoices/proforma/${data.invoice.id}`);
            } else {
                if (onRefresh) onRefresh();
            }
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to create revised invoice",
                variant: "destructive"
            });
        } finally {
            setRevising(false);
        }
    };

    const handleMarkStatus = async (status: string) => {
        if (!invoice?.id) return;
        try {
            setUpdatingStatus(true);
            // Using the generic PUT endpoint which updates fields
            const response = await fetch('/api/invoices/proforma', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: invoice.id,
                    status,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to update status to ${status}`);
            }

            toast({
                title: "Success",
                description: `Invoice marked as ${status}`,
            });

            if (onRefresh) onRefresh();
            router.refresh(); // Ensure server components update too
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || `Failed to update status to ${status}`,
                variant: "destructive"
            });
        } finally {
            setUpdatingStatus(false);
        }
    };

    return {
        approving,
        rejecting,
        revising,
        updatingStatus,
        handleApprove,
        handleReject,
        handleRevise,
        handleMarkStatus,
    };
}
