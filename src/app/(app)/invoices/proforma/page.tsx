"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Plus, Loader2, Edit, Trash2, LayoutGrid, List, FileText, Download, ScrollText, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
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
import { Separator } from "@/components/ui/separator";

const invoiceSchema = z.object({
    id: z.string().optional(),
    buyer_id: z.string().min(1, "Buyer required"),
    currency_code: z.string().min(1, "Currency required"),
    date: z.string().min(1, "Date required"),
    conversion_rate: z.coerce.number().min(0.0001),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
    })).min(1, "At least one item required"),
});

export default function ProformaPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [deletingPI, setDeletingPI] = useState<any>(null);
    const [convertingPI, setConvertingPI] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [isOpen, setIsOpen] = useState(false);
    const [editingPI, setEditingPI] = useState<any>(null);

    // Data for forms
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);

    const itemsPerPage = 12;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof invoiceSchema>>({
        resolver: zodResolver(invoiceSchema) as any,
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            conversion_rate: 1,
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
            const [entRes, skuRes, currRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies")
            ]);
            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();

            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/invoices/proforma");
            const data = await res.json();
            if (data.invoices) setInvoices(data.invoices);
        } catch (error) {
            console.error("Failed to fetch PIs:", error);
            toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (pi: any) => {
        setEditingPI(pi);
        form.reset({
            id: pi.id,
            buyer_id: pi.buyer_id,
            currency_code: pi.currency_code,
            date: pi.date.split('T')[0],
            conversion_rate: pi.conversion_rate,
            items: pi.proforma_items.map((item: any) => ({
                sku_id: item.sku_id,
                quantity: item.quantity,
                unit_price: item.unit_price
            }))
        });
        setIsOpen(true);
    };

    const handleCreate = () => {
        setEditingPI(null);
        form.reset({
            date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            conversion_rate: 1,
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        });
        setIsOpen(true);
    };

    const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
        try {
            const method = editingPI ? "PUT" : "POST";
            const res = await fetch("/api/invoices/proforma", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                setEditingPI(null);
                form.reset();
                fetchData();
                toast({ title: "Success", description: `Invoice ${editingPI ? 'updated' : 'created'} successfully` });
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!deletingPI) return;

        try {
            const res = await fetch(`/api/invoices/proforma?id=${deletingPI.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete PI");

            await fetchData();
            toast({ title: "Success", description: "Invoice deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
        } finally {
            setDeletingPI(null);
        }
    };

    const handleConvertToOrder = async () => {
        if (!convertingPI) return;

        try {
            const res = await fetch("/api/invoices/proforma/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pi_id: convertingPI.id }),
            });

            if (!res.ok) throw new Error("Failed to convert PI");

            const data = await res.json();
            await fetchData();
            toast({
                title: "Success",
                description: `Order created successfully! Order #: ${data.order?.order_number || 'Created'}`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to convert PI", variant: "destructive" });
        } finally {
            setConvertingPI(null);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || inv.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'default';
            case 'converted': return 'default'; // Using default (primary) for completed states
            default: return 'outline';
        }
    };

    // Calculate dynamic total for preview
    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Proforma Invoices</h2>
                    <p className="text-muted-foreground">Manage PIs and convert to confirmed orders.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New Invoice
                </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search invoices..."
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
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
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
                    <TabsTrigger value="converted">Converted</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : filteredInvoices.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border rounded-md bg-card">
                            No invoices found. Create one manually or convert from a Quote.
                        </div>
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedInvoices.map((inv) => (
                                        <Card key={inv.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg">{inv.invoice_number}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {inv.entities?.name || "No buyer"}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(inv)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setDeletingPI(inv)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Badge variant={getStatusColor(inv.status)}>{inv.status}</Badge>
                                                    <Badge variant="outline">{inv.currency_code}</Badge>
                                                </div>

                                                <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                                    <div>Date: {new Date(inv.date).toLocaleDateString()}</div>
                                                    <div className="font-semibold text-foreground">
                                                        Total: {inv.currency_code} {inv.total_amount.toFixed(2)}
                                                    </div>
                                                    {inv.proforma_items && (
                                                        <div>{inv.proforma_items.length} item(s)</div>
                                                    )}
                                                    {inv.quotes && inv.quotes.length > 0 && (
                                                        <div className="pt-1">
                                                            From Quote: <Link href="/quotes" className="text-primary hover:underline">{inv.quotes[0].quote_number}</Link>
                                                        </div>
                                                    )}
                                                    {inv.export_orders && inv.export_orders.length > 0 && (
                                                        <div className="pt-1">
                                                            To Order: <Link href="/orders" className="text-primary hover:underline">{inv.export_orders[0].order_number}</Link>
                                                        </div>
                                                    )}
                                                </div>

                                                {inv.status !== 'converted' && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setConvertingPI(inv)}
                                                            className="w-full"
                                                        >
                                                            <ScrollText className="h-3 w-3 mr-1" /> To Order
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="border rounded-md bg-card">
                                    <Table className="table-fixed">
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[140px]">Invoice #</TableHead>
                                                <TableHead className="w-[200px]">Buyer</TableHead>
                                                <TableHead className="w-[120px]">Date</TableHead>
                                                <TableHead className="w-[150px]">Total</TableHead>
                                                <TableHead className="w-[140px]">Status</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedInvoices.map((inv) => (
                                                <TableRow key={inv.id}>
                                                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                                    <TableCell>{inv.entities?.name || "—"}</TableCell>
                                                    <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {inv.currency_code} {inv.total_amount.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(inv.status)}>{inv.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {inv.status !== 'converted' && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setConvertingPI(inv)}
                                                                >
                                                                    To Order
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEdit(inv)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => setDeletingPI(inv)}
                                                            >
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
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(page)}
                                                    isActive={currentPage === page}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Create/Edit Dialog */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPI ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</DialogTitle>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="buyer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Buyer</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    name="date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Date</FormLabel>
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
                                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                                <FormField
                                    control={form.control}
                                    name="conversion_rate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Exchange Rate (to Local)</FormLabel>
                                            <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
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
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                {editingPI ? 'Update Invoice' : 'Create Invoice'}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingPI} onOpenChange={(open) => !open && setDeletingPI(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete invoice "{deletingPI?.invoice_number}". This action cannot be undone.
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

            {/* Convert to Order Confirmation Dialog */}
            <AlertDialog open={!!convertingPI} onOpenChange={(open) => !open && setConvertingPI(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert into Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a confirmed Export Order from PI "{convertingPI?.invoice_number}" and mark the PI as converted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConvertToOrder}>
                            Convert to Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
