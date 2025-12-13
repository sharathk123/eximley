/**
 * DeleteDialog Component
 * 
 * A reusable confirmation dialog for permanently deleting documents.
 * Features destructive styling and clear warning about permanent deletion.
 * 
 * @example
 * ```tsx
 * <DeleteDialog
 *     open={showDeleteDialog}
 *     onOpenChange={setShowDeleteDialog}
 *     onConfirm={handleDelete}
 *     documentNumber="PO-2024-023"
 *     documentType="Purchase Order"
 *     loading={deleting}
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
 * Props for the DeleteDialog component
 */
interface DeleteDialogProps {
    /** Controls the open/closed state of the dialog */
    open: boolean;

    /** Callback fired when the dialog's open state changes */
    onOpenChange: (open: boolean) => void;

    /** Callback fired when the user confirms deletion */
    onConfirm: () => void;

    /** The document number to display in the dialog (e.g., "SB-2024-008") */
    documentNumber: string;

    /** The type of document being deleted (e.g., "Shipping Bill", "Purchase Order") */
    documentType?: string;

    /** Whether the deletion action is in progress (shows loading state) */
    loading?: boolean;
}

export function DeleteDialog({
    open,
    onOpenChange,
    onConfirm,
    documentNumber,
    documentType = "document",
    loading = false,
}: DeleteDialogProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete {documentType}?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete {documentType.toLowerCase()} {documentNumber}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                        {loading ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
