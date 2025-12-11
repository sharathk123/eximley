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
import { Search, Plus, Loader2, Edit, Trash2, LayoutGrid, List, FileText, Copy, ArrowRight, Download, CheckCircle2, X, BarChart3, LayoutTemplate, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { QuoteAnalytics } from "@/components/quotes/QuoteAnalytics";
import { QuoteTemplateDialog } from "@/components/quotes/QuoteTemplateDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SaveTemplateDialog } from "@/components/quotes/SaveTemplateDialog"; // Import for edit dialog if we add it there, or main page

import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { IncotermSelect } from "@/components/common/IncotermSelect"; // Should be unused now, check usage
import { QuoteDetailsDialog } from "@/components/quotes/QuoteDetailsDialog";
import { QuoteEditDialog } from "@/components/quotes/QuoteEditDialog";



export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [deletingQuote, setDeletingQuote] = useState<any>(null);
    const [convertingQuote, setConvertingQuote] = useState<any>(null);
    const [revisingQuote, setRevisingQuote] = useState<any>(null);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [selectedQuote, setSelectedQuote] = useState<any>(null);
    const [editingQuote, setEditingQuote] = useState<any>(null);
    const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const itemsPerPage = 12;
    const { toast } = useToast();

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [templateSelection, setTemplateSelection] = useState<any>(null);



    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchFormData() {
        // Buyers etc might still be needed if we pass them to EditDialog? 
        // QuoteEditDialog fetches its own data.
        // So we might not need to fetch them here anymore unless we use them for filters?
        // Let's check usage. existing code used 'buyers' to populate select. 
        // If we don't have filters using buyers, we can remove this.
        // For now, let's keep it minimal or remove if unused.
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

    const handleGeneratePdf = async (quoteId: string) => {
        setGeneratingPdf(quoteId);
        try {
            const res = await fetch(`/api/quotes/${quoteId}/generate-pdf`, {
                method: "POST",
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to generate PDF");
            }

            // Get PDF as blob
            const blob = await res.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quote-${quoteId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast({
                title: "Success",
                description: "PDF downloaded successfully"
            });
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to generate PDF",
                variant: "destructive"
            });
        } finally {
            setGeneratingPdf(null);
        }
    };

    const toggleQuoteSelection = (quoteId: string) => {
        setSelectedQuotes(prev =>
            prev.includes(quoteId)
                ? prev.filter(id => id !== quoteId)
                : [...prev, quoteId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedQuotes.length === filteredQuotes.length) {
            setSelectedQuotes([]);
        } else {
            setSelectedQuotes(filteredQuotes.map(q => q.id));
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedQuotes.length} quotes?`)) return;

        setBulkActionLoading(true);
        try {
            await Promise.all(
                selectedQuotes.map(id =>
                    fetch(`/api/quotes?id=${id}`, { method: 'DELETE' })
                )
            );

            toast({
                title: "Success",
                description: `${selectedQuotes.length} quotes deleted`
            });

            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete quotes", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleBulkStatusUpdate = async (newStatus: string) => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                selectedQuotes.map(id =>
                    fetch(`/api/quotes/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus })
                    })
                )
            );

            toast({
                title: "Success",
                description: `${selectedQuotes.length} quotes updated to ${newStatus}`
            });

            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update quotes", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
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
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>
                        <LayoutTemplate className="h-4 w-4 mr-2" />
                        Use Template
                    </Button>
                    <Button onClick={() => setIsCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Quote
                    </Button>
                </div>
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
                <div className="flex items-center gap-2">
                    <Button
                        variant={showAnalytics ? "default" : "outline"}
                        size="icon"
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        title="Toggle Analytics Dashboard"
                    >
                        <BarChart3 className="h-4 w-4" />
                    </Button>
                    {!showAnalytics && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
                </div>
            </div>

            {showAnalytics ? (
                <QuoteAnalytics />
            ) : (
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
                                            <Card key={quote.id} className={`shadow-sm hover:shadow-md transition-shadow relative ${selectedQuotes.includes(quote.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                                                <div className="absolute top-3 right-3 z-10">
                                                    <Checkbox
                                                        checked={selectedQuotes.includes(quote.id)}
                                                        onCheckedChange={() => toggleQuoteSelection(quote.id)}
                                                    />
                                                </div>
                                                <CardContent className="p-5 space-y-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1 pr-6">
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
                                                                onClick={() => setEditingQuote(quote)}
                                                                title="Edit"
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
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

                                                    <div className="flex gap-2 pt-2">
                                                        <Button
                                                            size="sm"
                                                            variant="default"
                                                            onClick={() => setSelectedQuote(quote)}
                                                        >
                                                            <FileText className="h-3 w-3 mr-1" />
                                                            View Details
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleGeneratePdf(quote.id)}
                                                            disabled={generatingPdf === quote.id}
                                                        >
                                                            {generatingPdf === quote.id ? (
                                                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                                            ) : (
                                                                <Download className="h-3 w-3 mr-1" />
                                                            )}
                                                            PDF
                                                        </Button>
                                                        {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                                            <>
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
                                                            </>
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
                                                    <TableHead className="w-[50px]">
                                                        <Checkbox
                                                            checked={selectedQuotes.length === filteredQuotes.length && filteredQuotes.length > 0}
                                                            onCheckedChange={toggleSelectAll}
                                                            aria-label="Select all"
                                                        />
                                                    </TableHead>
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
                                                    <TableRow key={quote.id} className={selectedQuotes.includes(quote.id) ? "bg-muted/50" : ""}>
                                                        <TableCell>
                                                            <Checkbox
                                                                checked={selectedQuotes.includes(quote.id)}
                                                                onCheckedChange={() => toggleQuoteSelection(quote.id)}
                                                                aria-label={`Select quote ${quote.quote_number}`}
                                                            />
                                                        </TableCell>
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
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setSelectedQuote(quote)}
                                                                    title="View Details"
                                                                >
                                                                    <FileText className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => setEditingQuote(quote)}
                                                                    title="Edit"
                                                                >
                                                                    <Edit className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => handleGeneratePdf(quote.id)}
                                                                    disabled={generatingPdf === quote.id}
                                                                    title="Download PDF"
                                                                >
                                                                    {generatingPdf === quote.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Download className="h-4 w-4" />
                                                                    )}
                                                                </Button>

                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreHorizontal className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate('sent')} disabled={quote.status === 'sent'}>
                                                                            <ArrowRight className="h-4 w-4 mr-2" /> Mark as Sent
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuItem onClick={() => handleBulkStatusUpdate('approved')} disabled={quote.status === 'approved'}>
                                                                            <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Approved
                                                                        </DropdownMenuItem>
                                                                        {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                                                            <>
                                                                                <DropdownMenuItem onClick={() => setConvertingQuote(quote)}>
                                                                                    <FileText className="h-4 w-4 mr-2" /> Convert to PI
                                                                                </DropdownMenuItem>
                                                                                <DropdownMenuItem onClick={() => setRevisingQuote(quote)}>
                                                                                    <Copy className="h-4 w-4 mr-2" /> Create Revision
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletingQuote(quote)}>
                                                                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
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

                                {/* Bulk Actions Floating Bar */}
                                {selectedQuotes.length > 0 && (
                                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-full shadow-lg z-50 animate-in slide-in-from-bottom-5">
                                        <div className="font-medium text-sm whitespace-nowrap">
                                            {selectedQuotes.length} selected
                                        </div>
                                        <div className="h-4 w-px bg-background/20" />
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-background/20 hover:text-background text-background h-8"
                                                onClick={() => handleBulkStatusUpdate('approved')}
                                                disabled={bulkActionLoading}
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Approve
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-background/20 hover:text-background text-background h-8"
                                                onClick={() => handleBulkStatusUpdate('sent')}
                                                disabled={bulkActionLoading}
                                            >
                                                <ArrowRight className="h-4 w-4 mr-2" />
                                                Send
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="hover:bg-destructive/90 hover:text-white text-destructive-foreground h-8"
                                                onClick={handleBulkDelete}
                                                disabled={bulkActionLoading}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </Button>
                                        </div>
                                        <div className="h-4 w-px bg-background/20" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-background/20 hover:text-background text-background rounded-full"
                                            onClick={() => setSelectedQuotes([])}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}

                            </>
                        )}
                    </TabsContent>
                </Tabs>
            )}

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

            <QuoteTemplateDialog
                open={isTemplateOpen}
                onOpenChange={setIsTemplateOpen}
                onSelectTemplate={(data) => {
                    setTemplateSelection(data);
                    setIsCreateOpen(true);
                    setIsTemplateOpen(false);
                }}
            />

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

            {/* Quote Details Dialog */}
            <QuoteDetailsDialog
                quote={selectedQuote}
                open={!!selectedQuote}
                onOpenChange={(open) => !open && setSelectedQuote(null)}
                onRefresh={fetchQuotes}
            />

            {/* Quote Edit Dialog */}
            <QuoteEditDialog
                quote={editingQuote}
                open={!!editingQuote}
                onOpenChange={(open) => !open && setEditingQuote(null)}
                onSuccess={fetchQuotes}
            />
            {/* Quote Edit Dialog for Creation */}
            <QuoteEditDialog
                quote={null}
                initialValues={templateSelection}
                open={isCreateOpen}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) setTemplateSelection(null);
                }}
                onSuccess={fetchQuotes}
            />
        </div >
    );
}
