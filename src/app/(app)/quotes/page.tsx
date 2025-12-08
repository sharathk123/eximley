"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
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
import { Search, Plus, Loader2, Edit, Trash2, LayoutGrid, List, FileText, Copy, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { IncotermSelect } from "@/components/common/IncotermSelect";

const quoteSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    quote_date: z.string().min(1, "Date required"),
    valid_until: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0.01),
        description: z.string().optional(),
    })).min(1, "At least one item required"),
});

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [deletingQuote, setDeletingQuote] = useState<any>(null);
    const [convertingQuote, setConvertingQuote] = useState<any>(null);
    const [revisingQuote, setRevisingQuote] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const itemsPerPage = 12;
    const { toast } = useToast();

    // Form Data
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    const form = useForm<z.infer<typeof quoteSchema>>({
        resolver: zodResolver(quoteSchema) as any,
        defaultValues: {
            quote_date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchQuotes();
        fetchFormData();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchFormData() {
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
    }

    async function fetchQuotes() {
        setLoading(true);
        try {
            const res = await fetch("/api/quotes");
            const data = await res.json();
            if (data.quotes) setQuotes(data.quotes);
        } catch (error) {
            console.error("Failed to fetch quotes:", error);
            toast({ title: "Error", description: "Failed to fetch quotes", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!deletingQuote) return;

        try {
            const res = await fetch(`/api/quotes?id=${deletingQuote.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete quote");

            await fetchQuotes();
            toast({ title: "Success", description: "Quote deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete quote", variant: "destructive" });
        } finally {
            setDeletingQuote(null);
        }
    };

    const handleConvertToPI = async () => {
        if (!convertingQuote) return;

        try {
            const res = await fetch("/api/quotes/convert-to-pi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote_id: convertingQuote.id }),
            });

            if (!res.ok) throw new Error("Failed to convert quote");

            const data = await res.json();
            await fetchQuotes();
            toast({
                title: "Success",
                description: `Quote converted to PI successfully! PI Number: ${data.pi?.invoice_number || 'Created'}`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to convert quote", variant: "destructive" });
        } finally {
            setConvertingQuote(null);
        }
    };

    const handleCreateRevision = async () => {
        if (!revisingQuote) return;

        try {
            const res = await fetch("/api/quotes/revise", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote_id: revisingQuote.id }),
            });

            if (!res.ok) throw new Error("Failed to create revision");

            const data = await res.json();
            await fetchQuotes();
            toast({
                title: "Success",
                description: `Revision created: ${data.quote?.quote_number} (v${data.quote?.version})`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create revision", variant: "destructive" });
        } finally {
            setRevisingQuote(null);
        }
    };

    const filteredQuotes = quotes.filter(quote => {
        const matchesSearch = quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quote.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || quote.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = filteredQuotes.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'default';
            case 'revised': return 'outline';
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Quotes</h2>
                    <p className="text-muted-foreground">Manage quotations and convert to Proforma Invoices.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Quote
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create New Quote</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(async (values) => {
                                try {
                                    const res = await fetch("/api/quotes", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify(values),
                                    });
                                    if (!res.ok) throw new Error("Failed to create quote");
                                    await fetchQuotes();
                                    setIsCreateOpen(false);
                                    form.reset();
                                    toast({ title: "Success", description: "Quote created successfully" });
                                } catch (error) {
                                    toast({ title: "Error", description: "Failed to create quote", variant: "destructive" });
                                }
                            })} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="buyer_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Buyer</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Buyer" />
                                                        </SelectTrigger>
                                                    </FormControl>
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
                                        name="quote_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Date</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
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
                                    <FormField
                                        control={form.control}
                                        name="valid_until"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Valid Until</FormLabel>
                                                <FormControl>
                                                    <Input type="date" {...field} />
                                                </FormControl>
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
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-semibold">Items</h4>
                                        <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0 })}>
                                            <Plus className="h-4 w-4 mr-2" /> Add Item
                                        </Button>
                                    </div>
                                    <div className="space-y-2">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                                                <div className="col-span-5">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.sku_id`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Item" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {skus.map(s => (
                                                                            <SelectItem key={s.id} value={s.id}>{s.name} ({s.sku_code})</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="number" placeholder="Qty" {...field} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.unit_price`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormControl>
                                                                    <Input type="number" placeholder="Price" {...field} />
                                                                </FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit">Create Quote</Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search quotes..."
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
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="sent">Sent</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="converted">Converted</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : filteredQuotes.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="No quotes found"
                            description="Create a quote from an enquiry or manually."
                            actionLabel="Create Quote"
                            onAction={() => setIsCreateOpen(true)}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedQuotes.map((quote) => (
                                        <Card key={quote.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg">{quote.quote_number}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {quote.entities?.name || "No buyer"}
                                                        </div>
                                                        {quote.version > 1 && (
                                                            <div className="text-xs text-muted-foreground">Version {quote.version}</div>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => setDeletingQuote(quote)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Badge variant={getStatusColor(quote.status)}>{quote.status}</Badge>
                                                    <Badge variant="outline">{quote.currency_code || 'USD'}</Badge>
                                                </div>

                                                <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                                    <div>Date: {new Date(quote.quote_date).toLocaleDateString()}</div>
                                                    {quote.total_amount > 0 && (
                                                        <div className="font-semibold text-foreground">
                                                            Total: {quote.currency_code || 'USD'} {quote.total_amount.toFixed(2)}
                                                        </div>
                                                    )}
                                                    {quote.quote_items && (
                                                        <div>{quote.quote_items.length} item(s)</div>
                                                    )}
                                                    {quote.enquiries && (
                                                        <div className="pt-1 text-xs">
                                                            Enquiry: <Link href="/enquiries" className="text-primary hover:underline">{quote.enquiries.enquiry_number}</Link>
                                                        </div>
                                                    )}
                                                    {quote.proforma_invoices && (
                                                        <div className="pt-1 text-xs">
                                                            PI: <span className="font-medium">{quote.proforma_invoices.invoice_number}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setConvertingQuote(quote)}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1" /> To PI
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => setRevisingQuote(quote)}
                                                        >
                                                            <Copy className="h-3 w-3 mr-1" /> Revise
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
                                                <TableHead className="w-[140px]">Quote #</TableHead>
                                                <TableHead className="w-[200px]">Buyer</TableHead>
                                                <TableHead className="w-[120px]">Date</TableHead>
                                                <TableHead className="w-[150px]">Total</TableHead>
                                                <TableHead className="w-[140px]">Status</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedQuotes.map((quote) => (
                                                <TableRow key={quote.id}>
                                                    <TableCell className="font-medium">
                                                        {quote.quote_number}
                                                        {quote.version > 1 && <span className="text-xs text-muted-foreground ml-1">(v{quote.version})</span>}
                                                    </TableCell>
                                                    <TableCell>{quote.entities?.name || "—"}</TableCell>
                                                    <TableCell>{new Date(quote.quote_date).toLocaleDateString()}</TableCell>
                                                    <TableCell>
                                                        {quote.total_amount > 0 ? `${quote.currency_code || 'USD'} ${quote.total_amount.toFixed(2)}` : "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(quote.status)}>{quote.status}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                                                <>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setConvertingQuote(quote)}
                                                                    >
                                                                        To PI
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => setRevisingQuote(quote)}
                                                                    >
                                                                        Revise
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => setDeletingQuote(quote)}
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

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingQuote} onOpenChange={(open) => !open && setDeletingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete quote "{deletingQuote?.quote_number}". This action cannot be undone.
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

            {/* Convert to PI Confirmation Dialog */}
            <AlertDialog open={!!convertingQuote} onOpenChange={(open) => !open && setConvertingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert to Proforma Invoice?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a formal Proforma Invoice from quote "{convertingQuote?.quote_number}" and mark the quote as converted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConvertToPI}>
                            Convert to PI
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Create Revision Confirmation Dialog */}
            <AlertDialog open={!!revisingQuote} onOpenChange={(open) => !open && setRevisingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Revision?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new version of quote "{revisingQuote?.quote_number}" with incremented version number. The original quote will be marked as "revised".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateRevision}>
                            Create Revision
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div >
    );
}
