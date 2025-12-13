/**
 * ApprovalDialog Component
 * 
 * A reusable confirmation dialog for approving documents in workflow processes.
 * Displays a consistent approval interface across all document types.
 * 
 * @example
 * ```tsx
 * <ApprovalDialog
 *     open={showApproveDialog}
 *     onOpenChange={setShowApproveDialog}
 *     onConfirm={handleApprove}
 *     documentNumber="PI-2024-001"
 *     documentType="Proforma Invoice"
 *     loading={approving}
 * />
 * ```
 */

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Props for the ApprovalDialog component
 */
interface ApprovalDialogProps {
    /** Controls the open/closed state of the dialog */
    open: boolean;

    /** Callback fired when the dialog's open state changes */
    onOpenChange: (open: boolean) => void;

    /** Callback fired when the user confirms approval */
    onConfirm: () => void;

    /** The document number to display in the dialog (e.g., "PI-2024-001") */
    documentNumber: string;

    /** The type of document being approved (e.g., "Proforma Invoice", "Export Order") */
    documentType?: string;

    /** Whether the approval action is in progress (shows loading state) */
    loading?: boolean;
}

export function ApprovalDialog({
    open,
    onOpenChange,
    onConfirm,
    documentNumber,
    documentType = "document",
    loading = false,
}: ApprovalDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Approve {documentType}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will approve {documentType.toLowerCase()} {documentNumber} and mark it as ready for the next stage.
                        This action will be recorded in the audit trail.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {loading ? 'Approving...' : `Approve ${documentType}`}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
