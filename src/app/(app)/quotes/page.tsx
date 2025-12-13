"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
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
import { QuoteList } from "@/components/quotes/QuoteList";
import { QuoteBulkActions } from "@/components/quotes/QuoteBulkActions";
import { LoadingState } from "@/components/ui/loading-state";
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
import { useQuoteManagement } from "@/hooks/use-quote-management";
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

import { useRouter, useSearchParams } from "next/navigation";

export default function QuotesPage() {
    const router = useRouter();
    const {
        quotes,
        loading,
        searchQuery,
        activeTab,
        selectedQuotes,
        currentPage,
        totalPages,
        bulkActionLoading,
        generatingPdf,
        setSearchQuery,
        setActiveTab,
        setSelectedQuotes,
        setCurrentPage,
        setGeneratingPdf,
        refresh,
        updateStatus,
        deleteQuotes,
        convertToPI,
        createRevision
    } = useQuoteManagement();

    const searchParams = useSearchParams();

    useEffect(() => {
        const statusParam = searchParams.get('status');
        if (statusParam) {
            setActiveTab(statusParam); // This sets the state in the hook/component
        }
    }, [searchParams, setActiveTab]);

    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [showAnalytics, setShowAnalytics] = useState(false);

    // Dialog States
    // const [isCreateOpen, setIsCreateOpen] = useState(false); // REMOVED
    const [isTemplateOpen, setIsTemplateOpen] = useState(false);
    const [templateSelection, setTemplateSelection] = useState<any>(null);


    // const [editingQuote, setEditingQuote] = useState<any>(null); // REMOVED
    const [deletingQuote, setDeletingQuote] = useState<any>(null);
    const [convertingQuote, setConvertingQuote] = useState<any>(null);
    const [revisingQuote, setRevisingQuote] = useState<any>(null);

    const { toast } = useToast();

    // Handlers (Wrapper to adapt hook to component needs)
    const handleGeneratePdf = async (quoteId: string) => {
        setGeneratingPdf(quoteId);
        try {
            const quote = quotes.find(q => q.id === quoteId);
            const res = await fetch(`/api/quotes/${quoteId}/generate-pdf`, { method: "POST" });
            if (!res.ok) throw new Error((await res.json()).error || "Failed");

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Generate proper filename
            let fileName = `Quote-${quoteId}.pdf`;

            // 1. Try server header
            const contentDisposition = res.headers.get('Content-Disposition');
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    fileName = match[1];
                }
            } else if (quote) {
                // 2. Fallback to local formatting
                fileName = DocumentFormatter.formatDocumentName(quote.quote_number, quote.version || 1, quote.status);
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Small timeout to ensure download starts before revoking
            setTimeout(() => window.URL.revokeObjectURL(url), 100);

            toast({ title: "Success", description: "PDF downloaded successfully" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setGeneratingPdf(null);
        }
    };

    return (
        <PageContainer>
            <PageHeader
                title="Quotes"
                description="Manage quotations and convert to Proforma Invoices."
            >
                <Button variant="outline" onClick={() => setIsTemplateOpen(true)}>
                    <LayoutTemplate className="h-4 w-4 mr-2" /> Use Template
                </Button>
                <Button onClick={() => router.push('/quotes/create')}>
                    <Plus className="mr-2 h-4 w-4" /> New Quote
                </Button>
            </PageHeader>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Search quotes..."
                />
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
                            <LoadingState message="Loading quotes..." size="sm" />
                        ) : quotes.length === 0 ? (
                            <EmptyState
                                icon={FileText}
                                title="No quotes found"
                                description="Create a quote from an enquiry or manually."
                                actionLabel="Create Quote"
                                onAction={() => router.push('/quotes/create')}
                            />
                        ) : (
                            <>
                                <QuoteList
                                    quotes={quotes}
                                    viewMode={viewMode}
                                    selectedQuotes={selectedQuotes}
                                    onSelectQuote={(id) => setSelectedQuotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                    onSelectAll={(checked) => setSelectedQuotes(checked ? quotes.map(q => q.id) : [])}
                                    onEdit={(quote) => router.push(`/quotes/${quote.id}/edit`)}
                                    onDelete={setDeletingQuote}
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
                onDelete={() => deleteQuotes(selectedQuotes)}
                onClearSelection={() => setSelectedQuotes([])}
            />

            {/* Dialogs */}
            <QuoteTemplateDialog
                open={isTemplateOpen}
                onOpenChange={setIsTemplateOpen}
                onSelectTemplate={(data) => {
                    setTemplateSelection(data);
                    // Store template data in sessionStorage for the create page to pick up
                    sessionStorage.setItem('quoteTemplate', JSON.stringify(data));
                    router.push('/quotes/create?from=template');
                    setIsTemplateOpen(false);
                }}
            />

            {/* Creade/Edit Dialog REMOVED */}



            {/* Confirmation Dialogs - Kept locally as they are UI specific */}
            <AlertDialog open={!!deletingQuote} onOpenChange={(open) => !open && setDeletingQuote(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>Permanently delete quote "{deletingQuote?.quote_number}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => { deleteQuotes([deletingQuote.id]); setDeletingQuote(null); }} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
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
                        <AlertDialogAction onClick={() => { convertToPI(convertingQuote.id); setConvertingQuote(null); }}>Convert to PI</AlertDialogAction>
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
                        <AlertDialogAction onClick={() => { createRevision(revisingQuote.id); setRevisingQuote(null); }}>Create Revision</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
