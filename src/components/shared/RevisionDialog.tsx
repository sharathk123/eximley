/**
 * RevisionDialog Component
 * 
 * A reusable confirmation dialog for creating new document revisions.
 * Automatically calculates and displays the next version number.
 * 
 * @example
 * ```tsx
 * <RevisionDialog
 *     open={showReviseDialog}
 *     onOpenChange={setShowReviseDialog}
 *     onConfirm={handleRevise}
 *     documentNumber="QT-2024-089"
 *     currentVersion={2}
 *     documentType="Quote"
 *     loading={revising}
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
 * Props for the RevisionDialog component
 */
interface RevisionDialogProps {
    /** Controls the open/closed state of the dialog */
    open: boolean;

    /** Callback fired when the dialog's open state changes */
    onOpenChange: (open: boolean) => void;

    /** Callback fired when the user confirms creating a revision */
    onConfirm: () => void;

    /** The document number to display in the dialog (e.g., "ENQ-2024-156") */
    documentNumber: string;

    /** The current version number of the document (e.g., 1, 2, 3) */
    currentVersion: number;

    /** The type of document being revised (e.g., "Enquiry", "Proforma Invoice") */
    documentType?: string;

    /** Whether the revision action is in progress (shows loading state) */
    loading?: boolean;
}

export function RevisionDialog({
    open,
    onOpenChange,
    onConfirm,
    documentNumber,
    currentVersion,
    documentType = "document",
    loading = false,
}: RevisionDialogProps) {
    const nextVersion = currentVersion + 1;

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Create New Revision?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will create version {nextVersion} of {documentType.toLowerCase()} {documentNumber}.
                        The current version (V{currentVersion}) will be marked as 'revised'.
                        You will be redirected to the new revision.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Revision'}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
