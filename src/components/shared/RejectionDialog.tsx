/**
 * RejectionDialog Component
 * 
 * Reusable rejection dialog with reason input for any document type
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

interface RejectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => void;
    documentNumber: string;
    documentType?: string;
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
