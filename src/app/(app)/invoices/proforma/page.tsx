"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Search, Plus, Loader2, FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { SearchInput } from "@/components/ui/search-input";
import { useProformaManagement } from "@/hooks/use-proforma-management";

import { ProformaList } from "@/components/invoices/ProformaList";
import { LoadingState } from "@/components/ui/loading-state";
import { useRouter } from "next/navigation";

export default function ProformaPage() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

    const {
        invoices,
        loading,
        searchQuery,
        activeTab,
        currentPage,
        totalPages,
        deletingPI,
        convertingPI,
        setDeletingPI,
        setConvertingPI,
        setSearchQuery,
        setActiveTab,
        setCurrentPage,
        handleDelete,
        handleConvertToOrder
    } = useProformaManagement();

    const itemsPerPage = 12;

    const handleEdit = (pi: any) => {
        router.push(`/invoices/proforma/${pi.id}/edit`);
    };

    const handleCreate = () => {
        router.push('/invoices/proforma/create');
    };

    // Pagination logic is now handled in the hook, but we need to pass these to UI
    // Hook already returns paginated invoices.

    return (
        <PageContainer>
            <PageHeader
                title="Proforma Invoices"
                description="Manage Proforma Invoices and convert to Confirmed Orders."
            >
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New Invoice
                </Button>
            </PageHeader>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Search invoices..."
                />
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                setCurrentPage(1);
            }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="draft">Draft</TabsTrigger>
                    <TabsTrigger value="approved">Approved</TabsTrigger>
                    <TabsTrigger value="revised">Revised</TabsTrigger>
                    <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    <TabsTrigger value="converted">Converted</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <LoadingState message="Loading invoices..." size="sm" />
                    ) : invoices.length === 0 ? (
                        <EmptyState
                            icon={FileText}
                            title="No proforma invoices found"
                            description="Create one manually or convert from a Quote."
                            actionLabel="Create Proforma"
                            onAction={handleCreate}

                        />
                    ) : (
                        <>
                            <ProformaList
                                invoices={invoices}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={setDeletingPI}
                                onConvert={setConvertingPI}
                            />

                            {totalPages > 1 && (
                                <Pagination className="mt-4">
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
                        <AlertDialogAction onClick={() => handleDelete(deletingPI)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                        <AlertDialogAction onClick={() => handleConvertToOrder(convertingPI)}>
                            Convert to Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
