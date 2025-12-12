"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Copy, CheckCircle2, XCircle, Trash2, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useProformaActions } from '@/hooks/useProformaActions';
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
import { ApprovalDialog, RejectionDialog, RevisionDialog } from '@/components/shared';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

interface ProformaHeaderProps {
    invoice: any;
    onEdit: () => void;
    onRefresh?: () => void;
}

export function ProformaHeader({
    invoice,
    onEdit,
    onRefresh
}: ProformaHeaderProps) {
    const router = useRouter();
    const {
        approving,
        rejecting,
        revising,
        updatingStatus,
        handleApprove,
        handleReject,
        handleRevise,
        handleMarkStatus
    } = useProformaActions(invoice, onRefresh);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showReviseDialog, setShowReviseDialog] = useState(false);

    const handleConfirmRevise = async () => {
        await handleRevise();
        setShowReviseDialog(false);
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {DocumentFormatter.formatDocumentNumber(invoice.invoice_number, invoice.version || 1, invoice.status)}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {invoice.entities?.name} • {new Date(invoice.date).toLocaleDateString("en-IN")}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {invoice.status === 'pending' && (
                    <>
                        <Button
                            size="sm"
                            onClick={() => setShowApproveDialog(true)}
                            disabled={approving}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {approving ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
                            ) : (
                                <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</>
                            )}
                        </Button>
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setShowRejectDialog(true)}
                            disabled={rejecting}
                        >
                            {rejecting ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
                            ) : (
                                <><XCircle className="h-4 w-4 mr-2" /> Reject</>
                            )}
                        </Button>
                    </>
                )}

                {invoice.status !== 'converted' && invoice.status !== 'rejected' && invoice.status !== 'revised' && (
                    <Button variant="outline" size="sm" onClick={onEdit}>
                        <Edit className="h-4 w-4 mr-2" /> Edit Invoice
                    </Button>
                )}

                {invoice.status !== 'converted' && invoice.status !== 'rejected' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowReviseDialog(true)}
                        disabled={revising}
                    >
                        {revising ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                        Revise
                    </Button>
                )}

                {/* Status Update Buttons */}
                {(invoice.status === 'draft' || invoice.status === 'revised') && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkStatus('approved')}
                            disabled={updatingStatus}
                            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Approved
                        </Button>
                    </>
                )}

                {invoice.status !== 'rejected' && invoice.status !== 'converted' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkStatus('rejected')}
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleMarkStatus('rejected')}
                            disabled={updatingStatus}
                            className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Mark Rejected
                        </Button>
                    </>
                )}
            </div>

            {/* Approval Dialog */}
            <ApprovalDialog
                open={showApproveDialog}
                onOpenChange={setShowApproveDialog}
                onConfirm={handleApprove}
                documentNumber={invoice.invoice_number}
                documentType="Proforma Invoice"
                loading={approving}
            />

            {/* Rejection Dialog */}
            <RejectionDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                onConfirm={handleReject}
                documentNumber={invoice.invoice_number}
                documentType="Proforma Invoice"
                loading={rejecting}
            />

            {/* Revision Dialog */}
            <RevisionDialog
                open={showReviseDialog}
                onOpenChange={setShowReviseDialog}
                onConfirm={handleConfirmRevise}
                documentNumber={invoice.invoice_number}
                currentVersion={invoice.version || 1}
                documentType="Proforma Invoice"
                loading={revising}
            />
        </div>
    );
}
