"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, CheckCircle2, XCircle, Trash2, RefreshCw, FileDown, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePurchaseOrderActions } from '@/hooks/use-purchase-order-actions';
import { usePurchaseOrderPdf } from '@/hooks/use-purchase-order-pdf';
import { useState } from 'react';
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PurchaseOrderHeaderProps {
    po: any;
}

export function PurchaseOrderHeader({ po }: PurchaseOrderHeaderProps) {
    const router = useRouter();
    const { loading, approvePO, rejectPO, revisePO, deletePO } = usePurchaseOrderActions(po.id);
    const { generatingPdf, exportingToDms, generatePdf, exportToDms } = usePurchaseOrderPdf(
        po.id,
        po.po_number,
        po.version
    );

    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showReviseDialog, setShowReviseDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleConfirmApprove = async () => {
        const success = await approvePO();
        if (success) setShowApproveDialog(false);
    };

    const handleConfirmReject = async () => {
        const success = await rejectPO(rejectionReason);
        if (success) {
            setShowRejectDialog(false);
            setRejectionReason("");
        }
    };

    const handleConfirmRevise = async () => {
        const success = await revisePO();
        if (success) setShowReviseDialog(false);
    };

    const handleConfirmDelete = async () => {
        const success = await deletePO();
        if (success) setShowDeleteDialog(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-gray-100 text-gray-800",
            pending: "bg-yellow-100 text-yellow-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800",
            revised: "bg-purple-100 text-purple-800",
        };
        return <Badge className={styles[status] || ""}>{status?.toUpperCase()}</Badge>;
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-9 w-9"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold">
                            {po.po_number}
                            {po.version > 1 && <span className="text-muted-foreground"> V{po.version}</span>}
                        </h2>
                        {getStatusBadge(po.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {po.entities?.name} • {new Date(po.order_date).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {/* Approve/Reject for pending POs */}
                {po.status === 'pending' && (
                    <>
                        <Button
                            size="sm"
                            onClick={() => setShowApproveDialog(true)}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setShowRejectDialog(true)}
                            disabled={loading}
                        >
                            <XCircle className="h-4 w-4 mr-2" /> Reject
                        </Button>
                    </>
                )}

                {/* Edit button */}
                {po.status !== 'approved' && po.status !== 'revised' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/purchase-orders/${po.id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                )}

                {/* Revise button */}
                {po.status !== 'revised' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReviseDialog(true)}
                        disabled={loading}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" /> Revise
                    </Button>
                )}

                {/* PDF actions */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={generatePdf}
                    disabled={generatingPdf}
                >
                    {generatingPdf ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                    ) : (
                        <><FileDown className="h-4 w-4 mr-2" /> Download PDF</>
                    )}
                </Button>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={exportToDms}
                    disabled={exportingToDms}
                >
                    {exportingToDms ? (
                        <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Exporting...</>
                    ) : (
                        <><Upload className="h-4 w-4 mr-2" /> Export to DMS</>
                    )}
                </Button>

                {/* Delete button */}
                {po.status === 'draft' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                )}
            </div>

            {/* Approve Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will approve PO {po.po_number} and change its status to approved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmApprove} disabled={loading}>
                            {loading ? "Approving..." : "Approve"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a reason for rejecting PO {po.po_number}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4">
                        <Label htmlFor="reason">Rejection Reason</Label>
                        <Input
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Enter rejection reason..."
                            className="mt-2"
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmReject}
                            disabled={loading || !rejectionReason.trim()}
                            className="bg-destructive text-destructive-foreground"
                        >
                            {loading ? "Rejecting..." : "Reject"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Revise Dialog */}
            <AlertDialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Revision?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new version V{(po.version || 1) + 1} of PO {po.po_number}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRevise} disabled={loading}>
                            {loading ? "Creating..." : "Create Revision"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete PO {po.po_number}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={loading}
                            className="bg-destructive text-destructive-foreground"
                        >
                            {loading ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
