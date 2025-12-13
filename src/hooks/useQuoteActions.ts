/**
 * useQuoteActions Hook
 * 
 * Custom hook for managing quote actions like revise, mark status, and convert
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/use-toast';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

/**
 * Return type for the useQuoteActions hook
 */
interface UseQuoteActionsReturn {
    /** Whether a revision action is in progress */
    revising: boolean;

    /** Whether a convert to PI action is in progress */
    converting: boolean;

    /** Creates a new revision of the quote */
    handleRevise: () => Promise<void>;

    /** Marks the quote status (won/lost) */
    handleMarkStatus: (status: string) => Promise<void>;

    /** Converts the quote to a Proforma Invoice */
    handleConvertToPI: () => Promise<void>;
}

/**
 * Custom hook for managing Quote actions
 * 
 * Provides handlers for revise, mark status, and convert to PI operations.
 * Manages loading states, API calls, toast notifications, and navigation.
 * 
 * @param quote - The quote object to perform actions on
 * @param onRefresh - Optional callback to refresh data after successful operations
 * @returns Object containing loading states and action handlers
 * 
 * @example
 * ```tsx
 * const {
 *     revising,
 *     converting,
 *     handleRevise,
 *     handleConvertToPI
 * } = useQuoteActions(quote, onRefresh);
 * ```
 */
export function useQuoteActions(quote: any, onRefresh?: () => void): UseQuoteActionsReturn {
    const [revising, setRevising] = useState(false);
    const [converting, setConverting] = useState(false);
    const { toast } = useToast();
    const router = useRouter();

    const handleRevise = async () => {
        try {
            setRevising(true);
            const response = await fetch('/api/quotes/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quote_id: quote.id })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to create revised quote');
            }

            const data = await response.json();
            toast({
                title: "Success",
                description: "Revised quote created successfully",
            });

            // Navigate to the new revision if returned, or just refresh
            if (data.quote && data.quote.id) {
                router.push(`/quotes/${data.quote.id}`);
            } else if (data.id) {
                router.push(`/quotes/${data.id}`);
            } else {
                if (onRefresh) onRefresh();
            }
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to create revised quote",
                variant: "destructive"
            });
        } finally {
            setRevising(false);
        }
    };

    const handleMarkStatus = async (status: string) => {
        try {
            // Check if we should use the specific status endpoint or general update
            // Using general update if available, or specific endpoint
            const response = await fetch('/api/quotes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: quote.id,
                    status,
                }),
            });

            if (!response.ok) throw new Error(`Failed to update status to ${status}`);

            toast({
                title: "Success",
                description: `Quote marked as ${status}`,
            });

            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || `Failed to update status to ${status}`,
                variant: "destructive"
            });
        }
    };

    const handleConvertToPI = async () => {
        try {
            setConverting(true);
            const response = await fetch(`/api/quotes/convert-to-pi`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quote_id: quote.id })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Conversion failed");
            }

            const data = await response.json();

            toast({
                title: "Success",
                description: `Converted to Proforma Invoice: ${data.pi?.invoice_number || 'Created'}`
            });

            if (onRefresh) onRefresh();

            // Navigate to PIs page or the specific PI
            if (data.pi && data.pi.id) {
                router.push(`/invoices/proforma/${data.pi.id}`);
            } else {
                router.push('/invoices/proforma');
            }

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setConverting(false);
        }
    };

    return {
        revising,
        converting,
        handleRevise,
        handleMarkStatus,
        handleConvertToPI,
    };
}
