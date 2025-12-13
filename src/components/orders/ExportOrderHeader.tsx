/**
 * ExportOrderHeader Component
 * 
 * Header with order information and action buttons (approve, reject, revise, status updates)
 */

"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, CheckCircle2, XCircle, Copy, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ApprovalDialog, RejectionDialog, RevisionDialog } from '@/components/shared';

interface ExportOrderHeaderProps {
    order: any;
    onEdit: () => void;
    onRefresh: () => void;
    onApprove: () => Promise<void>;
    onReject: (reason: string) => Promise<void>;
    onRevise: () => Promise<void>;
    onMarkStatus: (status: string) => Promise<void>;
    approving: boolean;
    rejecting: boolean;
    revising: boolean;
}

export function ExportOrderHeader({
    order,
    onEdit,
    onRefresh,
    onApprove,
    onReject,
    onRevise,
    onMarkStatus,
    approving,
    rejecting,
    revising
}: ExportOrderHeaderProps) {
    const router = useRouter();
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showReviseDialog, setShowReviseDialog] = useState(false);

    const handleConfirmApprove = async () => {
        await onApprove();
        setShowApproveDialog(false);
    };

    const handleConfirmReject = async (reason: string) => {
        await onReject(reason);
        setShowRejectDialog(false);
    };

    const handleConfirmRevise = async () => {
        await onRevise();
        setShowReviseDialog(false);
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
            revised: 'bg-gray-100 text-gray-800',
            confirmed: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            completed: 'bg-gray-100 text-gray-800',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const canApprove = order.status === 'pending';
    const canReject = order.status === 'pending';
    const canRevise = ['approved', 'rejected', 'pending'].includes(order.status);
    const canConfirm = order.status === 'approved';
    const canShip = order.status === 'confirmed';
    const canComplete = order.status === 'shipped';

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Refresh"
                    onClick={() => router.push('/orders')}
                    className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">
                            {DocumentFormatter.formatDocumentNumber(order.order_number, order.version || 1, order.status)}
                        </h2>
                        <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {order.entities?.name} • Created {new Date(order.order_date).toLocaleDateString("en-IN")}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                {canApprove && (
                    <Button
                        size="sm"
                        onClick={() => setShowApproveDialog(true)}
                        disabled={approving}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        {approving ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
                        ) : (
                            <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve</>
                        )}
                    </Button>
                )}

                {canReject && (
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={rejecting}
                    >
                        {rejecting ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
                        ) : (
                            <><XCircle className="h-4 w-4 mr-2" /> Reject</>
                        )}
                    </Button>
                )}

                {canRevise && (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowReviseDialog(true)}
                        disabled={revising}
                    >
                        {revising ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</>
                        ) : (
                            <><Copy className="h-4 w-4 mr-2" /> Create Revision</>
                        )}
                    </Button>
                )}

                {canConfirm && (
                    <Button size="sm" onClick={() => onMarkStatus('confirmed')}>
                        Mark as Confirmed
                    </Button>
                )}

                {canShip && (
                    <Button size="sm" onClick={() => onMarkStatus('shipped')}>
                        Mark as Shipped
                    </Button>
                )}

                {canComplete && (
                    <Button size="sm" onClick={() => onMarkStatus('completed')}>
                        Mark as Completed
                    </Button>
                )}

                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
            </div>

            {/* Approval Dialog */}
            <ApprovalDialog
                open={showApproveDialog}
                onOpenChange={setShowApproveDialog}
                onConfirm={handleConfirmApprove}
                documentNumber={order.order_number}
                documentType="Export Order"
                loading={approving}
            />

            {/* Rejection Dialog */}
            <RejectionDialog
                open={showRejectDialog}
                onOpenChange={setShowRejectDialog}
                onConfirm={handleConfirmReject}
                documentNumber={order.order_number}
                documentType="Export Order"
                loading={rejecting}
            />

            {/* Revision Dialog */}
            <RevisionDialog
                open={showReviseDialog}
                onOpenChange={setShowReviseDialog}
                onConfirm={handleConfirmRevise}
                documentNumber={order.order_number}
                currentVersion={order.version || 1}
                documentType="Export Order"
                loading={revising}
            />
        </div>
    );
}
