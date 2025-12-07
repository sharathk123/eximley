"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, FileText, Download, TrendingUp, DollarSign, CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const orderSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    pi_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    order_date: z.string().min(1, "Date required"),
    status: z.enum(['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'completed', 'cancelled']).default('pending'),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
    })).min(1, "At least one item required"),
});

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);

    const form = useForm<z.infer<typeof orderSchema>>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues: {
            order_date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            status: "pending",
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordRes, entRes, skuRes, currRes, piRes] = await Promise.all([
                fetch("/api/orders"),
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/invoices/proforma")
            ]);

            const ordData = await ordRes.json();
            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();
            const piData = await piRes.json();

            if (ordData.orders) setOrders(ordData.orders);
            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
            if (piData.invoices) setInvoices(piData.invoices);

        } catch (err) {
            console.error(err);
        }
    };

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
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch("/api/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    order_id: selectedOrder.id,
                    payment_date: formData.get("payment_date"),
                    amount: Number(formData.get("amount")),
                    currency_code: formData.get("currency_code") || selectedOrder.currency_code,
                    exchange_rate: Number(formData.get("exchange_rate")) || 1,
                    payment_method: formData.get("payment_method"),
                    reference_number: formData.get("reference_number"),
                    remarks: formData.get("remarks")
                }),
            });

            if (res.ok) {
                setIsPaymentOpen(false);
                fetchData();
                if (selectedOrder) fetchPayments(selectedOrder.id);
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        }
    };


    const openPaymentDialog = (order: any) => {
        setSelectedOrder(order);
        fetchPayments(order.id);
        setIsPaymentOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof orderSchema>) => {
        try {
            const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                form.reset();
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Auto-fill from PI
    const onPISelect = (piId: string) => {
        const pi = invoices.find(i => i.id === piId);
        if (pi) {
            form.setValue("buyer_id", pi.buyer_id);
            form.setValue("currency_code", pi.currency_code);
            form.setValue("pi_id", pi.id);

            // Map items if available (requires fetching expanded PI details or ensuring PI list has items)
            if (pi.proforma_items) {
                const mappedItems = pi.proforma_items.map((item: any) => ({
                    sku_id: item.sku_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }));
                replace(mappedItems);
            }
        }
    };

    // Calculate dynamic total
    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Export Orders</h1>
                    <p className="text-muted-foreground">
                        Manage confirmed Sales Orders and track status.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Order
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>New Sales Order</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                {/* PI Selection Shortcut */}
                                <div className="bg-slate-50 p-4 rounded-md border text-sm">
                                    <Label className="mb-2 block font-semibold text-primary">Import from Proforma Invoice</Label>
                                    <Select onValueChange={onPISelect}>
                                        <SelectTrigger><SelectValue placeholder="Select a PI to auto-fill..." /></SelectTrigger>
                                        <SelectContent>
                                            {invoices.map(pi => (
                                                <SelectItem key={pi.id} value={pi.id}>{pi.invoice_number} - {pi.entities?.name} ({pi.total_amount})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="buyer_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Buyer</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select Buyer" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {buyers.map(b => (
                                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="order_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Order Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="currency_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Currency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {currencies.map(c => (
                                                            <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="pending">Pending</SelectItem>
                                                        <SelectItem value="confirmed">Confirmed</SelectItem>
                                                        <SelectItem value="in_production">In Production</SelectItem>
                                                        <SelectItem value="ready">Ready</SelectItem>
                                                        <SelectItem value="shipped">Shipped</SelectItem>
                                                        <SelectItem value="completed">Completed</SelectItem>
                                                        <SelectItem value="cancelled">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-semibold">Line Items</h3>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0 })}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="flex gap-2 items-end">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.sku_id`}
                                                    render={({ field }) => (
                                                        <FormItem className="flex-1">
                                                            <FormControl>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                                    <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                                                                    <SelectContent>
                                                                        {skus.map(s => (
                                                                            <SelectItem key={s.id} value={s.id}>{s.sku_code} - {s.name}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-24">
                                                            <FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.unit_price`}
                                                    render={({ field }) => (
                                                        <FormItem className="w-32">
                                                            <FormControl><Input type="number" placeholder="Price" {...field} /></FormControl>
                                                        </FormItem>
                                                    )}
                                                />
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end text-lg font-bold border-t pt-2">
                                        Total: {watchCurrency} {previewTotal.toFixed(2)}
                                    </div>
                                </div>

                                <Button type="submit" className="w-full">Create Order</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="bg-card p-4 rounded-md border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-accent rounded-full"><FileText className="h-6 w-6 text-primary" /></div>
                    <div>
                        <div className="text-sm text-muted-foreground">Total Orders</div>
                        <div className="text-2xl font-bold">{orders.length}</div>
                    </div>
                </div>
                <div className="bg-card p-4 rounded-md border shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full"><TrendingUp className="h-6 w-6 text-green-600" /></div>
                    <div>
                        <div className="text-sm text-muted-foreground">Confirmed Revenue</div>
                        <div className="text-2xl font-bold">
                            {/* Simple sum assuming mostly USD for demo */}
                            {orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total_amount : 0), 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No orders found.</TableCell></TableRow>
                        ) : (
                            orders.map((ord) => (
                                <TableRow key={ord.id}>
                                    <TableCell className="font-medium">{ord.order_number}</TableCell>
                                    <TableCell>{new Date(ord.order_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{ord.entities?.name || 'Unknown'}</TableCell>
                                    <TableCell>{ord.currency_code} {ord.total_amount}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            ord.payment_status === 'paid' ? 'default' :
                                                ord.payment_status === 'partial' ? 'secondary' : 'outline'
                                        }>
                                            {ord.payment_status || 'unpaid'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            ord.status === 'confirmed' ? 'default' :
                                                ord.status === 'completed' ? 'secondary' :
                                                    ord.status === 'cancelled' ? 'destructive' : 'outline'
                                        }>
                                            {ord.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex gap-2 justify-end">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => window.open(`/api/documents/commercial-invoice/${ord.id}`, '_blank')}
                                                title="Download Commercial Invoice"
                                            >
                                                <FileText className="h-4 w-4 mr-2" /> Invoice
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => openPaymentDialog(ord)}>
                                                <CreditCard className="h-4 w-4 mr-2" /> Payments
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Payment Management Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Payment Management - {selectedOrder?.order_number}</DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{selectedOrder.currency_code} {Number(selectedOrder.total_amount).toFixed(2)}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600">
                                            {selectedOrder.currency_code} {payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-orange-600">
                                            {selectedOrder.currency_code} {(Number(selectedOrder.total_amount) - payments.reduce((sum, p) => sum + Number(p.amount), 0)).toFixed(2)}
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
                                                        <SelectItem value="Export Credit">Export Credit</SelectItem>
                                                        <SelectItem value="Cash">Cash</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium">Reference Number</label>
                                                <Input type="text" name="reference_number" placeholder="TXN-12345" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium">Remarks</label>
                                            <Input type="text" name="remarks" placeholder="Optional notes" />
                                        </div>
                                        <Button type="submit" className="w-full">
                                            <DollarSign className="mr-2 h-4 w-4" /> Record Payment
                                        </Button>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Payment History */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Payment History</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {payments.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-8">No payments recorded yet.</div>
                                    ) : (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Amount</TableHead>
                                                    <TableHead>Method</TableHead>
                                                    <TableHead>Reference</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map((payment) => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                                        <TableCell className="font-medium">
                                                            {payment.currencies?.symbol || payment.currency_code} {Number(payment.amount).toFixed(2)}
                                                        </TableCell>
                                                        <TableCell>{payment.payment_method || '-'}</TableCell>
                                                        <TableCell>{payment.reference_number || '-'}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Label({ className, children }: { className?: string, children: React.ReactNode }) {
    // Reusing label component import or simple div
    return <div className={`text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 ${className}`}>{children}</div>
}
