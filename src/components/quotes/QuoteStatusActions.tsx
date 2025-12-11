"use client";

import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2, XCircle, Send, RotateCcw, Loader2, ShieldCheck, TicketCheck } from 'lucide-react';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface QuoteStatusActionsProps {
    quote: any;
    onSuccess?: () => void;
}

export function QuoteStatusActions({ quote, onSuccess }: QuoteStatusActionsProps) {
    const [loading, setLoading] = useState(false);
    const [isRejectOpen, setIsRejectOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [confirmAction, setConfirmAction] = useState<{
        label: string;
        status: string;
        actionType?: 'status' | 'approval'; // To distinguish normal status update vs approval workflow
        icon?: any;
        description?: string;
    } | null>(null);
    const { toast } = useToast();

    // Check if approval is required (Value > 10k or Discount > 10%)
    const isApprovalRequired = () => {
        if (!quote) return false;
        const totalAmount = parseFloat(quote.total_amount || 0);
        const subtotal = parseFloat(quote.subtotal || 0);
        const discountAmount = parseFloat(quote.discount_amount || 0);

        // Rule 1: Total Value > 10,000
        if (totalAmount > 10000) return true;

        // Rule 2: Discount > 10%
        if (subtotal > 0 && (discountAmount / subtotal) > 0.10) return true;

        return false;
    };

    const handleApprovalAction = async (action: 'submit' | 'approve' | 'reject', reason?: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/quotes/${quote.id}/approval`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, reason })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to process approval action');
            }

            toast({
                title: 'Success',
                description: `Action ${action} completed successfully`
            });

            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process action',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
            setConfirmAction(null);
            setIsRejectOpen(false);
            setRejectionReason('');
        }
    };

    const handleStatusChange = async (newStatus: string) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/quotes/${quote.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to update status');
            }

            toast({
                title: 'Success',
                description: `Quote marked as ${newStatus}`
            });

            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to update status',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
            setConfirmAction(null);
        }
    };

    const getAvailableActions = () => {
        const actions = [];
        const needsApproval = isApprovalRequired();

        if (quote.status === 'draft' || quote.status === 'rejected') {
            if (needsApproval && quote.status !== 'rejected') { // Can resubmit rejected? Yes.
                actions.push({
                    label: 'Submit for Approval',
                    status: 'pending_approval',
                    actionType: 'approval' as const,
                    icon: ShieldCheck,
                    description: 'Submit this quote for internal approval before sending to buyer.'
                });
            } else {
                actions.push({
                    label: 'Mark as Sent',
                    status: 'sent',
                    actionType: 'status' as const,
                    icon: Send,
                    description: 'Mark this quote as sent to the buyer'
                });
            }
        }

        if (quote.status === 'pending_approval') {
            // Admin actions ideally, but we show buttons and let backend block if not admin
            actions.push({
                label: 'Approve Quote',
                status: 'approved',
                actionType: 'approval' as const,
                icon: TicketCheck,
                description: 'Approve this quote to be sent to the buyer.'
            });
            actions.push({
                label: 'Reject Quote',
                status: 'rejected',
                actionType: 'approval' as const,
                icon: XCircle,
                description: 'Reject this quote. You will be asked for a reason.'
            });
        }

        if (quote.status === 'approved' || (quote.status === 'sent' && !needsApproval) || (quote.status === 'draft' && !needsApproval)) {
            // Allow marking as sent if approved or didn't need approval (caught above for draft)
            if (quote.status === 'approved') {
                actions.push({
                    label: 'Mark as Sent',
                    status: 'sent',
                    actionType: 'status' as const,
                    icon: Send,
                    description: 'Mark this quote as sent to the buyer'
                });
            }
        }

        if (quote.status === 'sent') {
            actions.push({
                label: 'Mark as Accepted',
                status: 'converted', // Or separate accepted status? Using 'converted' or keeping 'approved' (by buyer) separate?
                // Existing code used 'approved' for buyer approval, now 'approved' is internal.
                // Let's stick to existing: "Mark as Approved" (by buyer) -> maybe rename label to "Client Accepted"
                // Wait, original code had 'Mark as Approved' setting status to 'approved'.
                // If we use 'approved' for internal approval, we have a conflict.
                // Schema check: status IN ('draft', 'pending_approval', 'approved', 'rejected', 'sent', 'converted', 'revised')
                // 'approved' usually means internal approval. 'converted' means they bought it.
                // If quote is sent, next step is converted/accepted.
                // Let's use 'converted' for Won/Accepted.
                // And maybe 'rejected' for Client Rejected (same status).
                // Logic: Internal Approval -> Approved -> Sent -> Converted/Rejected.

                // Existing code:
                // label: 'Mark as Approved', status: 'approved' (Buyer approval?)
                // If we change 'approved' meaning to Internal, we need a new status for Buyer Acceptance?
                // Or just skip straight to 'converted' (Won)?
                // Let's assume 'Mark as Accepted' -> 'converted'.
            });
            actions.push({
                label: 'Mark as Accepted',
                status: 'converted',
                actionType: 'status' as const,
                icon: CheckCircle2,
                description: 'Mark this quote as accepted by the buyer'
            });
            actions.push({
                label: 'Mark as Rejected',
                status: 'rejected',
                actionType: 'status' as const,
                icon: XCircle,
                description: 'Mark this quote as rejected by the buyer'
            });
        }

        // Reopen Logic
        if (quote.status === 'sent' || quote.status === 'rejected' || quote.status === 'approved') {
            actions.push({
                label: 'Reopen as Draft',
                status: 'draft',
                actionType: 'status' as const,
                icon: RotateCcw,
                description: 'Reopen this quote for editing'
            });
        }

        return actions;
    };

    const actions = getAvailableActions();

    if (actions.length === 0) {
        return null;
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            'Change Status'
                        )}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {actions.map((action, index) => (
                        <div key={action.status}>
                            {index > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuItem
                                onClick={() => setConfirmAction(action)}
                            >
                                {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                                {action.label}
                            </DropdownMenuItem>
                        </div>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {confirmAction?.label === 'Reject Quote' ? 'Confirm Rejection' : 'Confirm Status Change'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmAction?.description}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (confirmAction?.label === 'Reject Quote') {
                                    setConfirmAction(null); // Close this dialog
                                    setIsRejectOpen(true);  // Open reason dialog
                                } else if (confirmAction?.status === 'pending_approval') {
                                    handleApprovalAction('submit');
                                } else if (confirmAction?.status === 'approved' && confirmAction.actionType === 'approval') {
                                    handleApprovalAction('approve');
                                } else {
                                    confirmAction && handleStatusChange(confirmAction.status);
                                }
                            }}
                        >
                            Confirm
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rejection Reason</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this quote.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Label htmlFor="reason">Reason</Label>
                        <Textarea
                            id="reason"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejection..."
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRejectOpen(false)}>Cancel</Button>
                        <Button onClick={() => handleApprovalAction('reject', rejectionReason)}>Reject</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
