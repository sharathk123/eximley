"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Plus, Loader2, FileText, BarChart3, LayoutTemplate } from "lucide-react";

import { QuoteAnalytics } from "@/components/quotes/QuoteAnalytics";
import { QuoteTemplateDialog } from "@/components/quotes/QuoteTemplateDialog";
import { QuoteDetailsDialog } from "@/components/quotes/QuoteDetailsDialog";
import { QuoteEditDialog } from "@/components/quotes/QuoteEditDialog";
import { QuoteList } from "@/components/quotes/QuoteList";
import { QuoteBulkActions } from "@/components/quotes/QuoteBulkActions";

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

import { useToast } from "@/components/ui/use-toast";

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Selection & View State
    const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Action States
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [templateSelection, setTemplateSelection] = useState<any>(null);

    const [selectedQuote, setSelectedQuote] = useState<any>(null); // For View Details
    const [editingQuote, setEditingQuote] = useState<any>(null);

    const [deletingQuote, setDeletingQuote] = useState<any>(null);
    const [convertingQuote, setConvertingQuote] = useState<any>(null);
    const [revisingQuote, setRevisingQuote] = useState<any>(null);

    const itemsPerPage = 12;
    const { toast } = useToast();

    // -- Data Fetching --

    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

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

    // -- Actions --

    const updateStatus = async (ids: string[], status: string) => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                ids.map(id =>
                    fetch(`/api/quotes/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                )
            );
            toast({ title: "Success", description: `${ids.length} quote(s) updated to ${status}` });
            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleDelete = async () => {
        // Single delete via Dialog
        if (!deletingQuote) return;
        try {
            const res = await fetch(`/api/quotes?id=${deletingQuote.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete quote");
            await fetchQuotes();
            toast({ title: "Success", description: "Quote deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete quote", variant: "destructive" });
        } finally {
            setDeletingQuote(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedQuotes.length} quotes?`)) return;
        setBulkActionLoading(true);
        try {
            await Promise.all(selectedQuotes.map(id => fetch(`/api/quotes?id=${id}`, { method: 'DELETE' })));
            toast({ title: "Success", description: `${selectedQuotes.length} quotes deleted` });
            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete quotes", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const handleGeneratePdf = async (quoteId: string) => {
        setGeneratingPdf(quoteId);
        try {
            const res = await fetch(`/api/quotes/${quoteId}/generate-pdf`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error || "Failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Quote-${quoteId}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            toast({ title: "Success", description: "PDF downloaded successfully" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingPdf(null);
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
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            await fetchQuotes();
            toast({ title: "Success", description: `Quote converted to PI: ${data.pi?.invoice_number || 'Created'}` });
        } catch (error) {
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
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            await fetchQuotes();
            toast({ title: "Success", description: `Revision created: ${data.quote?.quote_number} (v${data.quote?.version})` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create revision", variant: "destructive" });
        } finally {
            setRevisingQuote(null);
        }
    };

    // -- Derived State --

    const filteredQuotes = quotes.filter(quote => {
        const matchesSearch = quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quote.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || quote.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = filteredQuotes.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Quotes</h2>
                    <p className="text-muted-foreground">Manage quotations and convert to Proforma Invoices.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>
                        <LayoutTemplate className="h-4 w-4 mr-2" /> Use Template
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
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
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
                <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => { setActiveTab(value); setCurrentPage(1); }}>
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
                                <QuoteList
                                    quotes={paginatedQuotes}
                                    viewMode={viewMode}
                                    selectedQuotes={selectedQuotes}
                                    onSelectQuote={(id) => setSelectedQuotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    onSelectAll={(checked) => setSelectedQuotes(checked ? filteredQuotes.map(q => q.id) : [])}
                                    onEdit={setEditingQuote}
                                    onDelete={setDeletingQuote}
                                    onViewDetails={setSelectedQuote}
                                    onGeneratePdf={handleGeneratePdf}
                                    generatingPdfId={generatingPdf}
                                    onConvertToPI={setConvertingQuote}
                                    onRevise={setRevisingQuote}
                                    onMarkSent={(q) => updateStatus([q.id], 'sent')}
                                    onMarkApproved={(q) => updateStatus([q.id], 'approved')}
                                />

                                {totalPages > 1 && (
                                    <Pagination className="mt-4">
                                        <PaginationContent>
                                            <PaginationItem>
                                                <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                            </PaginationItem>
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                                <PaginationItem key={page}>
                                                    <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">{page}</PaginationLink>
                                                </PaginationItem>
                                            ))}
                                            <PaginationItem>
                                                <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                            </PaginationItem>
                                        </PaginationContent>
                                    </Pagination>
                                )}
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            )}

            <QuoteBulkActions
                selectedCount={selectedQuotes.length}
                loading={bulkActionLoading}
                onApprove={() => updateStatus(selectedQuotes, 'approved')}
                onSend={() => updateStatus(selectedQuotes, 'sent')}
                onDelete={handleBulkDelete}
                onClearSelection={() => setSelectedQuotes([])}
            />

            {/* Dialogs */}

            <QuoteTemplateDialog
                open={isTemplateOpen}
                onOpenChange={setIsTemplateOpen}
                onSelectTemplate={(data) => { setTemplateSelection(data); setIsCreateOpen(true); setIsTemplateOpen(false); }}
            />

            <QuoteEditDialog
                quote={editingQuote}
                open={!!editingQuote}
                onOpenChange={(open) => !open && setEditingQuote(null)}
                onSuccess={fetchQuotes}
            />
            {/* Create Dialog */}
            <QuoteEditDialog
                quote={null}
                initialValues={templateSelection}
                open={isCreateOpen}
                onOpenChange={(open) => { setIsCreateOpen(open); if (!open) setTemplateSelection(null); }}
                onSuccess={fetchQuotes}
            />

            <QuoteDetailsDialog
                quote={selectedQuote}
                open={!!selectedQuote}
                onOpenChange={(open) => !open && setSelectedQuote(null)}
                onRefresh={fetchQuotes}
            />

            {/* Confirmation Dialogs */}
            <AlertDialog open={!!deletingQuote} onOpenChange={(open) => !open && setDeletingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete quote "{deletingQuote?.quote_number}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!convertingQuote} onOpenChange={(open) => !open && setConvertingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert to Proforma Invoice?</AlertDialogTitle>
                        <AlertDialogDescription>Create Proforma Invoice from "{convertingQuote?.quote_number}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConvertToPI}>Convert to PI</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!revisingQuote} onOpenChange={(open) => !open && setRevisingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create New Revision?</AlertDialogTitle>
                        <AlertDialogDescription>Create a new version of "{revisingQuote?.quote_number}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCreateRevision}>Create Revision</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
