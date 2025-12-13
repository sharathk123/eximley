"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ShoppingCart } from "lucide-react";
import { SearchInput } from "@/components/ui/search-input";
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
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { useToast } from "@/components/ui/use-toast";

import { PurchaseOrderList } from "@/components/purchase-orders/PurchaseOrderList";
import { PurchaseOrderPaymentDialog } from "@/components/purchase-orders/PurchaseOrderPaymentDialog";
import { LoadingState } from "@/components/ui/loading-state";

export default function PurchaseOrdersPage() {
    const router = useRouter();
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);

    // UI State
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Payment State
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedPO, setSelectedPO] = useState<any>(null);

    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const fetchData = async () => {
        setLoading(true);
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
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        router.push('/purchase-orders/create');
    };

    const handleEdit = (po: any) => {
        router.push(`/purchase-orders/${po.id}`);
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
        setIsPaymentOpen(true);
    };

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

    return (
        <PageContainer>
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
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Search POs..."
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
                    <TabsTrigger value="issued">Issued</TabsTrigger>
                    <TabsTrigger value="received">Received</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <LoadingState message="Loading purchase orders..." size="sm" />
                    ) : paginatedPOs.length === 0 ? (
                        <EmptyState
                            icon={ShoppingCart}
                            title="No Purchase Orders found"
                            description="Manage procurement from suppliers."
                            actionLabel="New PO"
                            onAction={handleCreate}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            <PurchaseOrderList
                                purchaseOrders={paginatedPOs}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onPayments={handleOpenPayments}
                            />

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

            <PurchaseOrderPaymentDialog
                open={isPaymentOpen}
                onOpenChange={setIsPaymentOpen}
                po={selectedPO}
                onPaymentRecorded={fetchData}
            />
        </PageContainer>
    );
}
