/**
 * RevisionDialog Component
 * 
 * Reusable revision confirmation dialog for any document type
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

interface RevisionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    documentNumber: string;
    currentVersion: number;
    documentType?: string;
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
