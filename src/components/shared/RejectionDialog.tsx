/**
 * RejectionDialog Component
 * 
 * A reusable rejection dialog with required reason input for workflow processes.
 * Manages internal state for rejection reason and automatically resets on close.
 * 
 * @example
 * ```tsx
 * <RejectionDialog
 *     open={showRejectDialog}
 *     onOpenChange={setShowRejectDialog}
 *     onConfirm={handleReject}  // Called with (reason: string)
 *     documentNumber="EO-2024-045"
 *     documentType="Export Order"
 *     loading={rejecting}
 * />
 * ```
 */

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

/**
 * Props for the RejectionDialog component
 */
interface RejectionDialogProps {
    /** Controls the open/closed state of the dialog */
    open: boolean;

    /** Callback fired when the dialog's open state changes */
    onOpenChange: (open: boolean) => void;

    /** Callback fired when the user confirms rejection. Receives the rejection reason as a string. */
    onConfirm: (reason: string) => void;

    /** The document number to display in the dialog (e.g., "SB-2024-012") */
    documentNumber: string;

    /** The type of document being rejected (e.g., "Shipping Bill", "Purchase Order") */
    documentType?: string;

    /** Whether the rejection action is in progress (shows loading state and disables inputs) */
    loading?: boolean;
}

export function RejectionDialog({
    open,
    onOpenChange,
    onConfirm,
    documentNumber,
    documentType = "document",
    loading = false,
}: RejectionDialogProps) {
    const [reason, setReason] = useState("");

    const handleConfirm = () => {
        if (reason.trim()) {
            onConfirm(reason);
            setReason(""); // Reset for next use
        }
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setReason(""); // Reset when closing
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Reject {documentType}</DialogTitle>
                    <DialogDescription>
                        Please provide a reason for rejecting {documentType.toLowerCase()} {documentNumber}.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                        <Textarea
                            id="rejection-reason"
                            placeholder="Enter the reason for rejection..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            disabled={loading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        disabled={!reason.trim() || loading}
                    >
                        {loading ? 'Rejecting...' : `Reject ${documentType}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
