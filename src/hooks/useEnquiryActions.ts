/**
 * useEnquiryActions Hook
 * 
 * Custom hook for managing enquiry actions like revise and mark status
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import type { Enquiry, EnquiryStatus } from '@/types/enquiry';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

/**
 * Return type for the useEnquiryActions hook
 */
interface UseEnquiryActionsReturn {
    /** Whether a revision action is in progress */
    revising: boolean;

    /** Creates a new revision of the enquiry */
    handleRevise: () => Promise<void>;

    /** Marks the enquiry as won or lost */
    handleMarkStatus: (status: 'won' | 'lost') => Promise<void>;

    /** Converts the enquiry to a quote */
    handleConvert: () => Promise<void>;
}

/**
 * Custom hook for managing Enquiry actions
 * 
 * Provides handlers for revise, mark status, and convert to quote operations.
 * Manages loading states, API calls, toast notifications, and navigation.
 * 
 * @param enquiry - The enquiry object to perform actions on
 * @param onRefresh - Optional callback to refresh data after successful operations
 * @returns Object containing loading states and action handlers
 * 
 * @example
 * ```tsx
 * const {
 *     revising,
 *     handleRevise,
 *     handleMarkStatus,
 *     handleConvert
 * } = useEnquiryActions(enquiry, onRefresh);
 * ```
 */
export function useEnquiryActions(enquiry: Enquiry, onRefresh?: () => void): UseEnquiryActionsReturn {
    const [revising, setRevising] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRevise = async () => {
        try {
            setRevising(true);
            const response = await fetch('/api/enquiries/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: enquiry.id,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create revised enquiry');
            }

            const data = await response.json();
            toast({
                title: "Success",
                description: "Revised enquiry created successfully",
            });

            // Navigate to the new revision
            router.push(`/enquiries/${data.id}`);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create revised enquiry",
                variant: "destructive"
            });
        } finally {
            setRevising(false);
        }
    };

    const handleMarkStatus = async (status: 'won' | 'lost') => {
        try {
            const response = await fetch('/api/enquiries', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: enquiry.id,
                    status,
                }),
            });

            if (!response.ok) throw new Error(`Failed to mark enquiry as ${status}`);

            toast({
                title: "Success",
                description: `Enquiry marked as ${status}`,
            });

            if (onRefresh) onRefresh();
        } catch (error) {
            toast({
                title: "Error",
                description: `Failed to mark enquiry as ${status}`,
                variant: "destructive"
            });
        }
    };

    const handleConvert = async () => {
        try {
            const res = await fetch("/api/enquiries/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enquiry_id: enquiry.id }),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to convert enquiry");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: `Enquiry converted successfully! Quote Number: ${data.quote?.quote_number ? DocumentFormatter.formatDocumentNumber(data.quote.quote_number, 1, 'draft') : 'Created'}`,
            });

            // Navigate to the new quote
            if (data.quote?.id) {
                router.push(`/quotes?id=${data.quote.id}`);
            }
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message || "Failed to convert enquiry", variant: "destructive" });
        }
    };

    return {
        revising,
        handleRevise,
        handleMarkStatus,
        handleConvert,
    };
}
