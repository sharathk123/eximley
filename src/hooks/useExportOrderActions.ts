/**
 * useExportOrderActions Hook
 * 
 * Custom hook for managing Export Order actions: approve, reject, revise, and status updates
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';

/**
 * Return type for the useExportOrderActions hook
 */
interface UseExportOrderActionsReturn {
    /** Whether an approval action is in progress */
    approving: boolean;

    /** Whether a rejection action is in progress */
    rejecting: boolean;

    /** Whether a revision action is in progress */
    revising: boolean;

    /** Whether a status update action is in progress */
    updatingStatus: boolean;

    /** Approves the export order */
    handleApprove: () => Promise<void>;

    /** Rejects the export order with a reason */
    handleReject: (reason: string) => Promise<void>;

    /** Creates a new revision of the export order */
    handleRevise: () => Promise<void>;

    /** Updates the order status to a new value */
    handleMarkStatus: (status: string) => Promise<void>;
}

/**
 * Custom hook for managing Export Order actions
 * 
 * Provides handlers for approve, reject, revise, and status update operations.
 * Manages loading states, API calls, toast notifications, and navigation.
 * 
 * @param order - The export order object to perform actions on
 * @param onRefresh - Optional callback to refresh data after successful operations
 * @returns Object containing loading states and action handlers
 * 
 * @example
 * ```tsx
 * const {
 *     approving,
 *     handleApprove,
 *     handleReject,
 *     handleRevise
 * } = useExportOrderActions(order, onRefresh);
 * ```
 */
export function useExportOrderActions(order: any, onRefresh?: () => void): UseExportOrderActionsReturn {
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);
    const [revising, setRevising] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleApprove = async () => {
        try {
            setApproving(true);
            const response = await fetch(`/api/orders/${order.id}/approve`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to approve order');
            }

            toast({
                title: "Success",
                description: `Order ${order.order_number} approved successfully`,
            });

            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to approve order",
                variant: "destructive"
            });
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async (reason: string) => {
        try {
            setRejecting(true);
            const response = await fetch(`/api/orders/${order.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to reject order');
            }

            toast({
                title: "Order Rejected",
                description: `Order ${order.order_number} has been rejected`,
            });

            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to reject order",
                variant: "destructive"
            });
        } finally {
            setRejecting(false);
        }
    };

    const handleRevise = async () => {
        try {
            setRevising(true);
            const response = await fetch(`/api/orders/${order.id}/revise`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create revision');
            }

            const data = await response.json();
            const newOrder = data.order;

            toast({
                title: "Revision Created",
                description: `Created version ${newOrder.version} of order ${newOrder.order_number}`,
            });

            // Navigate to the new revision
            router.push(`/orders/${newOrder.id}`);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create revision",
                variant: "destructive"
            });
        } finally {
            setRevising(false);
        }
    };

    const handleMarkStatus = async (status: string) => {
        try {
            setUpdatingStatus(true);
            const response = await fetch(`/api/orders`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: order.id,
                    status,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update status');
            }

            toast({
                title: "Status Updated",
                description: `Order status changed to ${status}`,
            });

            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update status",
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
