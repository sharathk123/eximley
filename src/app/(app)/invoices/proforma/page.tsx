"use client";

import { useEffect, useState } from "react";
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
import { useToast } from "@/components/ui/use-toast";

import { ProformaList } from "@/components/invoices/ProformaList";
import { ProformaDialog } from "@/components/invoices/ProformaDialog";

export default function ProformaPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

    // Actions State
    const [isOpen, setIsOpen] = useState(false);
    const [editingPI, setEditingPI] = useState<any>(null);
    const [deletingPI, setDeletingPI] = useState<any>(null);
    const [convertingPI, setConvertingPI] = useState<any>(null);

    // Data for forms
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [luts, setLuts] = useState<any[]>([]);

    const itemsPerPage = 12;
    const { toast } = useToast();

    useEffect(() => {
        fetchData();
        fetchFormData();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const fetchFormData = async () => {
        try {
            const [entRes, skuRes, currRes, lutRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/compliance/lut?status=active")
            ]);
            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();
            const lutData = await lutRes.json();

            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
            if (lutData.luts) setLuts(lutData.luts);
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
        setIsOpen(true);
    };

    const handleCreate = () => {
        setEditingPI(null);
        setIsOpen(true);
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
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
                        <EmptyState
                            icon={FileText}
                            title="No proforma invoices found"
                            description="Create one manually or convert from a Quote."
                            actionLabel="Create Proforma"
                            onAction={() => setIsOpen(true)}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            <ProformaList
                                invoices={paginatedInvoices}
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

            <ProformaDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                initialData={editingPI}
                onSuccess={() => {
                    fetchData();
                    toast({ title: "Success", description: `Invoice ${editingPI ? 'updated' : 'created'} successfully` });
                }}
                buyers={buyers}
                skus={skus}
                currencies={currencies}
                luts={luts}
            />

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
