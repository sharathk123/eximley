"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

interface PaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    order: any;
    onSuccess: () => void; // Triggered after successful payment
}

export function PaymentDialog({ open, onOpenChange, order, onSuccess }: PaymentDialogProps) {
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && order) {
            fetchPayments(order.id);
        }
    }, [open, order]);

    const fetchPayments = async (orderId: string) => {
        try {
            const res = await fetch(`/api/payments?order_id=${orderId}`);
            const data = await res.json();
            if (data.payments) setPayments(data.payments);
        } catch (err) {
            console.error(err);
        }
    };

    const onPaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!order) return;

        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: order.id,
                    payment_date: formData.get("payment_date"),
                    amount: Number(formData.get("amount")),
                    currency_code: formData.get("currency_code") || order.currency_code,
                    exchange_rate: Number(formData.get("exchange_rate")) || 1,
                    payment_method: formData.get("payment_method"),
                    reference_number: formData.get("reference_number"),
                    remarks: formData.get("remarks")
                }),
            });

            if (res.ok) {
                onSuccess();
                toast({ title: "Success", description: "Payment recorded successfully" });
                onOpenChange(false);
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    if (!order) return null;

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingBalance = Number(order.total_amount) - totalPaid;
    const isOverdue = pendingBalance > 0 && new Date() > new Date(order.order_date); // Simple overdue logic, ideally based on payment terms

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Payment Management - {order.order_number}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold truncate" title={`${order.currency_code} ${Number(order.total_amount).toFixed(2)}`}>
                                    <span className="text-sm text-muted-foreground mr-1">{order.currency_code}</span>
                                    {Number(order.total_amount).toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600 truncate" title={`${order.currency_code} ${totalPaid.toFixed(2)}`}>
                                    <span className="text-sm font-medium mr-1">{order.currency_code}</span>
                                    {totalPaid.toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold truncate ${pendingBalance > 0 ? 'text-orange-600' : 'text-green-600'
                                    }`} title={`${order.currency_code} ${pendingBalance.toFixed(2)}`}>
                                    <span className="text-sm font-medium mr-1">{order.currency_code}</span>
                                    {Math.max(0, pendingBalance).toFixed(2)}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Record Payment Form */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Record New Payment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={onPaymentSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Payment Date</label>
                                        <Input type="date" name="payment_date" defaultValue={new Date().toISOString().split('T')[0]} required />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Amount</label>
                                        <Input type="number" name="amount" step="0.01" placeholder="0.00" required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium">Payment Method</label>
                                        <Select name="payment_method">
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Wire Transfer (SWIFT)">Wire Transfer (SWIFT)</SelectItem>
                                                <SelectItem value="Letter of Credit (LC)">Letter of Credit (LC)</SelectItem>
                                                <SelectItem value="Advance Payment">Advance Payment</SelectItem>
                                                <SelectItem value="Documents Against Payment (D/P)">Documents Against Payment (D/P)</SelectItem>
                                                <SelectItem value="Documents Against Acceptance (D/A)">Documents Against Acceptance (D/A)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium">Reference #</label>
                                        <Input name="reference_number" placeholder="Transaction ID" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium">Remarks</label>
                                    <Input name="remarks" placeholder="Optional notes" />
                                </div>

                                <Button type="submit" disabled={loading} className="w-full">
                                    {loading ? "Recording..." : "Record Payment"}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Payment History List */}
                    {payments.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="font-semibold text-lg">Payment History</h3>
                            <div className="border rounded-md">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted">
                                        <tr>
                                            <th className="p-2 text-left">Date</th>
                                            <th className="p-2 text-left">Amount</th>
                                            <th className="p-2 text-left">Method</th>
                                            <th className="p-2 text-left">Ref</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map(p => (
                                            <tr key={p.id} className="border-t">
                                                <td className="p-2">{new Date(p.payment_date).toLocaleDateString()}</td>
                                                <td className="p-2 font-medium">{order.currency_code} {Number(p.amount).toFixed(2)}</td>
                                                <td className="p-2">{p.payment_method}</td>
                                                <td className="p-2">{p.reference_number || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
