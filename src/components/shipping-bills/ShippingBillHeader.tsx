"use client";

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, CheckCircle2, XCircle, Trash2, RefreshCw, FileDown, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useShippingBillActions } from '@/hooks/use-shipping-bill-actions';
import { useShippingBillPdf } from '@/hooks/use-shipping-bill-pdf';
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

interface ShippingBillHeaderProps {
    sb: any;
}

export function ShippingBillHeader({ sb }: ShippingBillHeaderProps) {
    const router = useRouter();
    const { loading, approveSB, rejectSB, reviseSB, deleteSB } = useShippingBillActions(sb.id);
    const { generatingPdf, exportingToDms, generatePdf, exportToDms } = useShippingBillPdf(
        sb.id,
        sb.sb_number,
        sb.version
    );

    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showReviseDialog, setShowReviseDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");

    const handleConfirmApprove = async () => {
        const success = await approveSB();
        if (success) setShowApproveDialog(false);
    };

    const handleConfirmReject = async () => {
        const success = await rejectSB(rejectionReason);
        if (success) {
            setShowRejectDialog(false);
            setRejectionReason("");
        }
    };

    const handleConfirmRevise = async () => {
        const success = await reviseSB();
        if (success) setShowReviseDialog(false);
    };

    const handleConfirmDelete = async () => {
        const success = await deleteSB();
        if (success) setShowDeleteDialog(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            drafted: "bg-gray-100 text-gray-800",
            pending: "bg-yellow-100 text-yellow-800",
            filed: "bg-blue-100 text-blue-800",
            cleared: "bg-green-100 text-green-800",
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
                            {sb.sb_number}
                            {sb.version > 1 && <span className="text-muted-foreground"> V{sb.version}</span>}
                        </h2>
                        {getStatusBadge(sb.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        {new Date(sb.sb_date).toLocaleDateString()} • Port: {sb.port_code}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                {/* Approve/Reject for drafted/pending */}
                {(sb.status === 'drafted' || sb.status === 'pending') && (
                    <>
                        <Button
                            size="sm"
                            onClick={() => setShowApproveDialog(true)}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" /> File
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
                {sb.status !== 'filed' && sb.status !== 'cleared' && sb.status !== 'revised' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/shipping-bills/${sb.id}/edit`)}
                    >
                        <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                )}

                {/* Revise button */}
                {sb.status !== 'revised' && (
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
                {sb.status === 'drafted' && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                )}
            </div>

            {/* Dialogs */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>File Shipping Bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will file SB {sb.sb_number} with customs and change its status to filed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmApprove} disabled={loading}>
                            {loading ? "Filing..." : "File with Customs"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Reject Shipping Bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Provide a reason for rejecting SB {sb.sb_number}
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

            <AlertDialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Revision?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new version V{(sb.version || 1) + 1} of SB {sb.sb_number}
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

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Shipping Bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete SB {sb.sb_number}. This action cannot be undone.
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
