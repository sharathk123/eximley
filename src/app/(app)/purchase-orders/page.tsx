"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, FileText, Download, TrendingUp, DollarSign, CreditCard, LayoutGrid, List, Search, Edit, ShoppingCart, Link as LinkIcon, ExternalLink } from "lucide-react";
import Link from "next/link"; // Standard Next.js Link

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

const poSchema = z.object({
    id: z.string().optional(),
    vendor_id: z.string().min(1, "Vendor required"),
    export_order_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    order_date: z.string().min(1, "Date required"),
    status: z.enum(['draft', 'issued', 'confirmed', 'received', 'completed', 'cancelled']).default('draft'),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
        tax_rate: z.coerce.number().min(0).optional(),
    })).min(1, "At least one item required"),
});

export default function PurchaseOrdersPage() {
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);
    const [exportOrders, setExportOrders] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    // UI State
    const [isOpen, setIsOpen] = useState(false);
    const [editingPO, setEditingPO] = useState<any>(null);
    const [deletingPO, setDeletingPO] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Payment State
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [newPayment, setNewPayment] = useState({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "Bank Transfer",
        reference_number: "",
        notes: ""
    });

    const { toast } = useToast();

    const form = useForm<z.infer<typeof poSchema>>({
        resolver: zodResolver(poSchema) as any,
        defaultValues: {
            order_date: new Date().toISOString().split('T')[0],
            currency_code: "INR",
            status: "draft",
            items: [{ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
        },
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchFormData();
    }, []);

    useEffect(() => {
        fetchData();
    }, [currentPage]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const fetchFormData = async () => {
        try {
            const [entRes, skuRes, currRes, ordRes] = await Promise.all([
                fetch("/api/entities?type=supplier"), // Ideally filter for vendors
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/orders")
            ]);

            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();
            const ordData = await ordRes.json();

            // Filter for suppliers if API doesn't do it perfectly yet, assuming entData.entities
            // For now, let's assume user picks from any entity, but in prod should be type='supplier'
            if (entData.entities) setVendors(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
            if (ordData.orders) setExportOrders(ordData.orders);
        } catch (err) {
            console.error(err);
        }
    }

    const fetchData = async () => {
        try {
            const res = await fetch("/api/purchase-orders");
            if (res.ok) {
                const data = await res.json();
                setPurchaseOrders(data.purchase_orders || []);
            } else {
                console.warn("API Error, setting empty");
                setPurchaseOrders([]);
            }
        } catch (err) {
            console.error("Failed to fetch POs:", err);
            setPurchaseOrders([]);
        }
    };

    const handleCreate = () => {
        setEditingPO(null);
        form.reset({
            order_date: new Date().toISOString().split('T')[0],
            currency_code: "INR",
            status: "draft",
            items: [{ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
        });
        setIsOpen(true);
    };

    const handleEdit = (po: any) => {
        setEditingPO(po);
        form.reset({
            id: po.id,
            vendor_id: po.vendor_id,
            export_order_id: po.export_order_id || undefined,
            currency_code: po.currency_code,
            order_date: po.order_date.split('T')[0],
            status: po.status,
            items: po.purchase_order_items?.map((item: any) => ({
                sku_id: item.sku_id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                tax_rate: item.tax_rate
            })) || []
        });
        setIsOpen(true);
    };

    const handleOrderSelect = async (orderId: string) => {
        if (!orderId) return;
        // Don't overwrite if editing existing PO with items, unless explicit user action?
        // For now, only if items list is empty or default.

        try {
            // Need an endpoint to fetch order items.
            // Using existing /api/orders?id=xxx returns order with items.
            const res = await fetch(`/api/orders?id=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                const order = data.order;
                if (order && order.order_items) {
                    const newItems = order.order_items.map((oi: any) => ({
                        sku_id: oi.sku_id,
                        quantity: oi.quantity,
                        unit_price: oi.unit_price, // Or 0 if buying price differs, but good default
                        tax_rate: oi.tax_rate || 0
                    }));

                    if (newItems.length > 0) {
                        // Confirm replacement? For now just do it.
                        form.setValue("items", newItems);
                        // Also set currency to match order if unset?
                        if (order.currency_code) form.setValue("currency_code", order.currency_code);

                        toast({ title: "Items Imported", description: `Loaded ${newItems.length} items from Export Order.` });
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch order items", e);
        }
    };

    const onSubmit = async (values: z.infer<typeof poSchema>) => {
        try {
            const method = editingPO ? "PUT" : "POST"; // Note: PUT not fully implemented in API yet, but POST works for Create
            const url = editingPO ? `/api/purchase-orders?id=${editingPO.id}` : "/api/purchase-orders";

            // MVP API only has POST for now, let's stick to create or basic create logic
            // Actually I implemented GET/POST/DELETE. Update logic would need PUT.
            // For MVP let's assume create only or add PUT to API later.
            // I'll use POST for Create.

            if (method === "PUT") {
                const res = await fetch(`/api/purchase-orders?id=${editingPO.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(values),
                });

                if (res.ok) {
                    setIsOpen(false);
                    setEditingPO(null);
                    form.reset();
                    fetchData();
                    toast({ title: "Success", description: "Purchase Order updated successfully" });
                } else {
                    const err = await res.json();
                    toast({ title: "Error", description: err.error, variant: "destructive" });
                }
                return;
            }

            const res = await fetch("/api/purchase-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                setEditingPO(null);
                form.reset();
                fetchData();
                toast({ title: "Success", description: `Purchase Order created successfully` });
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (po: any) => {
        if (!confirm("Are you sure you want to delete this PO?")) return;
        try {
            const res = await fetch(`/api/purchase-orders?id=${po.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete PO");

            await fetchData();
            toast({ title: "Success", description: "PO deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete PO", variant: "destructive" });
        }
    };

    const handleOpenPayments = async (po: any) => {
        setSelectedPO(po);
        setPayments([]);
        setNewPayment({
            amount: "",
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: "Bank Transfer",
            reference_number: "",
            notes: ""
        });
        setIsPaymentOpen(true);
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
        if (!selectedPO || !newPayment.amount) return;
        try {
            const res = await fetch("/api/purchase-orders/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    purchase_order_id: selectedPO.id,
                    ...newPayment,
                    currency_code: selectedPO.currency_code
                })
            });

            if (res.ok) {
                const data = await res.json();
                setPayments([data.payment, ...payments]);
                setNewPayment(prev => ({ ...prev, amount: "", reference_number: "", notes: "" }));
                toast({ title: "Payment Recorded", description: "Payment added successfully." });
                fetchData(); // Refresh list to update status
            } else {
                toast({ title: "Error", description: "Failed to record payment", variant: "destructive" });
            }
        } catch (e) {
            console.error("Failed to record payment", e);
        }
    };

    // Calculate dynamic total
    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => {
        const lineTotal = (Number(item.quantity || 0) * Number(item.unit_price || 0));
        const tax = lineTotal * (Number(item.tax_rate || 0) / 100);
        return sum + lineTotal + tax;
    }, 0) || 0;

    // Filtering logic
    const filteredPOs = purchaseOrders.filter(po => {
        const matchesSearch =
            po.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            po.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || po.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredPOs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedPOs = filteredPOs.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'received': return 'success';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'success';
            case 'partial': return 'warning';
            default: return 'secondary'; // unpaid
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
                    <p className="text-muted-foreground">
                        Manage procurement from suppliers.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New PO
                </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search POs..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex gap-1 border rounded-md p-1">
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                setCurrentPage(1);
            }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="issued">Issued</TabsTrigger>
                    <TabsTrigger value="received">Received</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {paginatedPOs.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border rounded-md bg-card">
                            No Purchase Orders found.
                        </div>
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedPOs.map((po) => (
                                        <Card key={po.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="font-semibold text-lg">{po.po_number}</div>
                                                        <div className="text-sm text-muted-foreground">{po.entities?.name || 'Unknown Vendor'}</div>
                                                    </div>
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <Badge variant={getStatusColor(po.status) as any}>{po.status}</Badge>
                                                        {po.payment_status && <Badge variant={getPaymentStatusColor(po.payment_status) as any} className="text-[10px] h-5">{po.payment_status}</Badge>}
                                                    </div>
                                                </div>
                                                <div className="text-sm text-muted-foreground space-y-1">
                                                    <div>Date: {new Date(po.order_date).toLocaleDateString()}</div>
                                                    <div className="font-semibold text-foreground">
                                                        Total: {po.currency_code} {Number(po.total_amount).toFixed(2)}
                                                    </div>
                                                    {po.export_orders && (
                                                        <div className="pt-1 text-xs flex items-center gap-1">
                                                            <ExternalLink className="h-3 w-3" />
                                                            For Order: <Link href="/orders" className="text-primary hover:underline">{po.export_orders.order_number}</Link>
                                                        </div>
                                                    )}
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
                                                <TableHead className="w-[120px]">PO #</TableHead>
                                                <TableHead className="w-[180px]">Vendor</TableHead>
                                                <TableHead className="w-[110px]">Date</TableHead>
                                                <TableHead className="w-[150px]">Export Order</TableHead>
                                                <TableHead className="w-[130px]">Total</TableHead>
                                                <TableHead className="w-[120px]">Status</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedPOs.map((po) => (
                                                <TableRow key={po.id}>
                                                    <TableCell className="font-medium">{po.po_number}</TableCell>
                                                    <TableCell>{po.entities?.name}</TableCell>
                                                    <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {po.export_orders ? (
                                                            <Link href="/orders" className="flex items-center gap-1 text-primary hover:underline">
                                                                {po.export_orders.order_number} <ExternalLink className="h-3 w-3" />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{po.currency_code} {Number(po.total_amount).toFixed(2)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(po.status) as any}>{po.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button variant="ghost" size="icon" onClick={() => handleOpenPayments(po)} title="Payments">
                                                                <CreditCard className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(po)}><Edit className="h-4 w-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(po)}>
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

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPO ? 'Edit PO' : 'New Purchase Order'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="vendor_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vendor</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {vendors.map(v => (
                                                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="export_order_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Link Export Order (Back-to-Back)</FormLabel>
                                            <Select onValueChange={(val) => {
                                                field.onChange(val);
                                                handleOrderSelect(val);
                                            }} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Sales Order" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    {exportOrders.map(o => (
                                                        <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="order_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>PO Date</FormLabel>
                                            <FormControl><Input type="date" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="currency_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger></FormControl>
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
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold">Items</h3>
                                    <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 })}>
                                        <Plus className="mr-2 h-4 w-4" /> Add Item
                                    </Button>
                                </div>
                                <div className="space-y-4 max-h-[300px] overflow-y-auto p-1">
                                    {fields.map((field, index) => (
                                        <Card key={field.id} className="p-4">
                                            <div className="space-y-3">
                                                <FormField
                                                    control={form.control}
                                                    name={`items.${index}.sku_id`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs">Product / SKU</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    {skus.map(s => (
                                                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.sku_code})</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="grid grid-cols-12 gap-3 items-end">
                                                    <div className="col-span-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Qty</FormLabel>
                                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-4">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.unit_price`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Price</FormLabel>
                                                                    <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.tax_rate`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-xs">Tax %</FormLabel>
                                                                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                    <div className="col-span-2 text-right">
                                                        <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => remove(index)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end items-center gap-4 pt-4 border-t">
                                <div className="text-right">
                                    <div className="text-lg font-bold">Total: {form.watch("currency_code")} {previewTotal.toFixed(2)}</div>
                                    <div className="text-xs text-muted-foreground">Includes Tax</div>
                                </div>
                                <Button type="submit">{editingPO ? 'Update PO' : 'Create PO'}</Button>
                            </div>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Payment Dialog */}
            <Dialog open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Manage Payments - {selectedPO?.po_number}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Add Payment Form */}
                        <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/20">
                            <div className="col-span-2 font-medium text-sm">Record New Payment</div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium">Amount ({selectedPO?.currency_code})</label>
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
                                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
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
        </div>
    );
}
