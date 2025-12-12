/**
 * ApprovalDialog Component
 * 
 * Reusable approval confirmation dialog for any document type
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

interface ApprovalDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    documentNumber: string;
    documentType?: string;
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
