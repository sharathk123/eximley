"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, CheckCircle2, XCircle, Trash2, RefreshCw, FileDown, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { usePurchaseOrderActions } from '@/hooks/use-purchase-order-actions';
import { usePurchaseOrderPdf } from '@/hooks/use-purchase-order-pdf';
import { useState } from 'react';
import { ApprovalDialog, RejectionDialog, RevisionDialog, DeleteDialog } from '@/components/shared';

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

    const handleConfirmApprove = async () => {
        const success = await approvePO();
        if (success) setShowApproveDialog(false);
    };

    const handleConfirmReject = async (reason: string) => {
        const success = await rejectPO(reason);
        if (success) {
            setShowRejectDialog(false);
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

            {/* Approval Dialog */}
            <ApprovalDialog
                open={showApproveDialog}
                onOpenChange={setShowApproveDialog}
                onConfirm={handleConfirmApprove}
                documentNumber={po.po_number}
                documentType="Purchase Order"
                loading={loading}
            />

            {/* Rejection Dialog */}
            <RejectionDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                onConfirm={handleConfirmReject}
                documentNumber={po.po_number}
                documentType="Purchase Order"
                loading={loading}
            />

            {/* Revision Dialog */}
            <RevisionDialog
                open={showReviseDialog}
                onOpenChange={setShowReviseDialog}
                onConfirm={handleConfirmRevise}
                documentNumber={po.po_number}
                currentVersion={po.version || 1}
                documentType="Purchase Order"
                loading={loading}
            />

            {/* Delete Dialog */}
            <DeleteDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
                onConfirm={handleConfirmDelete}
                documentNumber={po.po_number}
                documentType="Purchase Order"
                loading={loading}
            />
        </div>
    );
}
