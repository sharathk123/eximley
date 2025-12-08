"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, FileText, Download, TrendingUp, DollarSign, CreditCard, LayoutGrid, List, Search, Edit, Ship, Pencil, ShoppingCart } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { IncotermSelect } from "@/components/common/IncotermSelect";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";

const orderSchema = z.object({
    id: z.string().optional(),
    buyer_id: z.string().min(1, "Buyer required"),
    pi_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    order_date: z.string().min(1, "Date required"),
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
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

    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null); // For payments
    const [editingOrder, setEditingOrder] = useState<any>(null); // For editing
    const [deletingOrder, setDeletingOrder] = useState<any>(null); // For deleting
    const [payments, setPayments] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const { toast } = useToast();

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
        fetchFormData();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const fetchFormData = async () => {
        try {
            const [entRes, skuRes, currRes, piRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/invoices/proforma")
            ]);

            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();
            const piData = await piRes.json();

            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
            if (piData.invoices) setInvoices(piData.invoices);
        } catch (err) {
            console.error(err);
        }
    }

    const fetchData = async () => {
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            if (data.orders) setOrders(data.orders);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
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

    const handleCreate = () => {
        setEditingOrder(null);
        form.reset({
            order_date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            status: "pending",
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        });
        setIsOpen(true);
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        form.reset({
            id: order.id,
            buyer_id: order.buyer_id,
            pi_id: order.pi_id || undefined,
            currency_code: order.currency_code,
            order_date: order.order_date.split('T')[0],
            status: order.status,
            items: order.order_items?.map((item: any) => ({
                sku_id: item.sku_id,
                quantity: item.quantity,
                unit_price: item.unit_price
            })) || []
        });
        setIsOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof orderSchema>) => {
        try {
            const method = editingOrder ? "PUT" : "POST";
            const res = await fetch("/api/orders", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                setEditingOrder(null);
                form.reset();
                fetchData();
                toast({ title: "Success", description: `Order ${editingOrder ? 'updated' : 'created'} successfully` });
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!deletingOrder) return;
        try {
            const res = await fetch(`/api/orders?id=${deletingOrder.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete order");

            await fetchData();
            toast({ title: "Success", description: "Order deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
        } finally {
            setDeletingOrder(null);
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
                fetchData(); // Refresh order status (payment status might update via trigger/logic ideally)
                toast({ title: "Success", description: "Payment recorded successfully" });
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
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

    // Auto-fill from PI
    const onPISelect = (piId: string) => {
        const pi = invoices.find(i => i.id === piId);
        if (pi) {
            form.setValue("buyer_id", pi.buyer_id);
            form.setValue("currency_code", pi.currency_code);
            form.setValue("pi_id", pi.id);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            case 'pending': return 'outline';
            default: return 'outline';
        }
    };

    // Calculate dynamic total
    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    // Filtering logic
    const filteredOrders = orders.filter(ord => {
        const matchesSearch =
            ord.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ord.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || ord.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Export Orders</h1>
                    <p className="text-muted-foreground">
                        Manage confirmed Sales Orders and track status.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New Order
                </Button>
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
                            {orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total_amount) : 0), 0).toFixed(0)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                setCurrentPage(1);
            }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                    <TabsTrigger value="shipped">Shipped</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {paginatedOrders.length === 0 ? (
                        <EmptyState
                            icon={ShoppingCart}
                            title="No orders found"
                            description="Create a new export order to start processing a sale."
                            actionLabel="Create Order"
                            onAction={() => setIsOpen(true)}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedOrders.map((ord) => (
                                        <Card key={ord.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg">{ord.order_number}</div>
                                                        <div className="text-sm text-muted-foreground">{ord.entities?.name || 'Unknown Buyer'}</div>
                                                    </div>
                                                    <div className="flex justify-end gap-2">

                                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(ord)}>
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingOrder(ord)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant={getStatusColor(ord.status)}>{ord.status}</Badge>
                                                    <Badge variant="outline">{ord.payment_status || 'unpaid'}</Badge>
                                                </div>

                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <div>Date: {new Date(ord.order_date).toLocaleDateString()}</div>
                                                    <div className="font-semibold text-foreground">
                                                        Total: {ord.currency_code} {Number(ord.total_amount).toFixed(2)}
                                                    </div>
                                                    {ord.proforma_invoices && (
                                                        <div className="pt-1 text-xs">
                                                            PI: <span className="font-medium">{ord.proforma_invoices.invoice_number}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 pt-2">
                                                    <Link href={`/shipments?order_id=${ord.id}&create=true`}>
                                                        <Button size="sm" variant="outline">
                                                            <Ship className="h-3 w-3 mr-1" /> Ship
                                                        </Button>
                                                    </Link>
                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`/api/documents/commercial-invoice/${ord.id}`, '_blank')}>
                                                        <FileText className="h-3 w-3 mr-1" /> Invoice
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="border rounded-md bg-card">
                                    <Table className="table-fixed">
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[140px]">Order #</TableHead>
                                                <TableHead className="w-[200px]">Buyer</TableHead>
                                                <TableHead className="w-[120px]">Date</TableHead>
                                                <TableHead className="w-[150px]">Total</TableHead>
                                                <TableHead className="w-[140px]">Status</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedOrders.map((ord) => (
                                                <TableRow key={ord.id}>
                                                    <TableCell className="font-medium">{ord.order_number}</TableCell>
                                                    <TableCell>{ord.entities?.name}</TableCell>
                                                    <TableCell>{new Date(ord.order_date).toLocaleDateString()}</TableCell>
                                                    <TableCell>{ord.currency_code} {Number(ord.total_amount).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <div className="flex gap-2">
                                                            <Badge variant={getStatusColor(ord.status)}>{ord.status}</Badge>
                                                            <Badge variant="outline" className="text-xs">{ord.payment_status || 'unpaid'}</Badge>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => openPaymentDialog(ord)} title="Payments">
                                                                <CreditCard className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(ord)}>
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setDeletingOrder(ord)}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {totalPages > 1 && (
                                <Pagination className="mt-4">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="cursor-pointer" />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className="cursor-pointer" />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}

                </TabsContent>
            </Tabs>

            {/* Create/Edit Helper Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingOrder ? 'Edit Order' : 'New Sales Order'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            {/* PI Selection Shortcut only on create */}
                            {!editingOrder && (
                                <div className="bg-slate-50 p-4 rounded-md border text-sm">
                                    <div className="mb-2 block font-semibold text-primary">Import from Proforma Invoice</div>
                                    <Select onValueChange={onPISelect}>
                                        <SelectTrigger><SelectValue placeholder="Select a PI to auto-fill..." /></SelectTrigger>
                                        <SelectContent>
                                            {invoices.map(pi => (
                                                <SelectItem key={pi.id} value={pi.id}>{pi.invoice_number} - {pi.entities?.name} ({pi.total_amount})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

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
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Currency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {currencies.map(c => (
                                                        <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <IncotermSelect form={form} name="incoterm" />
                                <FormField
                                    control={form.control}
                                    name="incoterm_place"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Incoterm Place</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Mumbai Port" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
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

                            <Button type="submit" className="w-full">
                                {editingOrder ? 'Update Order' : 'Create Order'}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete order "{deletingOrder?.order_number}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Payment Management Dialog - Reused Logic */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Payment Management - {selectedOrder?.order_number}</DialogTitle>
                    </DialogHeader>

                    {selectedOrder && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Order Total</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold truncate" title={`${selectedOrder.currency_code} ${Number(selectedOrder.total_amount).toFixed(2)}`}>
                                            <span className="text-sm text-muted-foreground mr-1">{selectedOrder.currency_code}</span>
                                            {Number(selectedOrder.total_amount).toFixed(2)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Received</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-green-600 truncate" title={`${selectedOrder.currency_code} ${payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}`}>
                                            <span className="text-sm font-medium mr-1">{selectedOrder.currency_code}</span>
                                            {payments.reduce((sum, p) => sum + Number(p.amount), 0).toFixed(2)}
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Balance</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className={`text-2xl font-bold truncate ${(Number(selectedOrder.total_amount) - payments.reduce((sum, p) => sum + Number(p.amount), 0)) < 0 ? 'text-red-600' : 'text-orange-600'
                                            }`} title={`${selectedOrder.currency_code} ${(Number(selectedOrder.total_amount) - payments.reduce((sum, p) => sum + Number(p.amount), 0)).toFixed(2)}`}>
                                            <span className="text-sm font-medium mr-1">{selectedOrder.currency_code}</span>
                                            {(Number(selectedOrder.total_amount) - payments.reduce((sum, p) => sum + Number(p.amount), 0)).toFixed(2)}
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

            <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete order {deletingOrder?.order_number}.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
