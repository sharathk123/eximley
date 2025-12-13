"use client";

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { CreditCard } from "lucide-react";

interface PurchaseOrderPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    po: any | null;
    onPaymentRecorded: () => void;
}

export function PurchaseOrderPaymentDialog({
    open,
    onOpenChange,
    po,
    onPaymentRecorded
}: PurchaseOrderPaymentDialogProps) {
    const { toast } = useToast();
    const [payments, setPayments] = useState<any[]>([]);
    const [newPayment, setNewPayment] = useState({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "Bank Transfer",
        reference_number: "",
        notes: ""
    });

    useEffect(() => {
        if (open && po) {
            fetchPayments();
            setNewPayment({
                amount: "",
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: "Bank Transfer",
                reference_number: "",
                notes: ""
            });
        }
    }, [open, po]);

    const fetchPayments = async () => {
        if (!po) return;
        try {
            const res = await fetch(`/api/purchase-orders/payments?purchase_order_id=${po.id}`);
            if (res.ok) {
                const data = await res.json();
                setPayments(data.payments || []);
            }
        } catch (e) {
            console.error("Failed to fetch payments", e);
        }
    };

    const handleRecordPayment = async () => {
        if (!po || !newPayment.amount) return;
        try {
            const res = await fetch("/api/purchase-orders/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    purchase_order_id: po.id,
                    ...newPayment,
                    currency_code: po.currency_code
                })
            });

            if (res.ok) {
                const data = await res.json();
                setPayments([data.payment, ...payments]);
                setNewPayment(prev => ({ ...prev, amount: "", reference_number: "", notes: "" }));
                toast({ title: "Payment Recorded", description: "Payment added successfully." });
                onPaymentRecorded();
            } else {
                toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
            }
        } catch (e) {
            console.error("Failed to record payment", e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Manage Payments - {po?.po_number}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                    {/* Add Payment Form */}
                    <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
                        <div className="col-span-2 font-medium text-sm">Record New Payment</div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Amount ({po?.currency_code})</label>
                            <Input
                                type="number"
                                value={newPayment.amount}
                                onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                                placeholder="0.00"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Date</label>
                            <Input
                                type="date"
                                value={newPayment.payment_date}
                                onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Method</label>
                            <Select
                                value={newPayment.payment_method}
                                onValueChange={(val) => setNewPayment({ ...newPayment, payment_method: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                    <SelectItem value="Check">Check</SelectItem>
                                    <SelectItem value="Cash">Cash</SelectItem>
                                    <SelectItem value="Card">Card</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium">Reference / Note</label>
                            <Input
                                value={newPayment.reference_number}
                                onChange={(e) => setNewPayment({ ...newPayment, reference_number: e.target.value })}
                                placeholder="Ref #"
                            />
                        </div>
                        <div className="col-span-2 flex justify-end">
                            <Button size="sm" onClick={handleRecordPayment} disabled={!newPayment.amount}>Record Payment</Button>
                        </div>
                    </div>

                    {/* Payment History */}
                    <div>
                        <h4 className="font-medium text-sm mb-2">Payment History</h4>
                        {payments.length === 0 ? (
                            <EmptyState
                                icon={CreditCard}
                                title="No payments"
                                description="No payments have been recorded for this purchase order yet."
                            />
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Ref</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payments.map((p: any) => (
                                        <TableRow key={p.id}>
                                            <TableCell>{new Date(p.payment_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{p.currency_code} {Number(p.amount).toFixed(2)}</TableCell>
                                            <TableCell>{p.payment_method}</TableCell>
                                            <TableCell>{p.reference_number || '-'}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
