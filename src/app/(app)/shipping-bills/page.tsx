"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { SearchInput } from "@/components/ui/search-input";
import { Plus, Loader2, Ship, BarChart3 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PageHeader } from "@/components/ui/page-header";
import { PageContainer } from "@/components/ui/page-container";
import { useToast } from "@/components/ui/use-toast";
import { ShippingBillList } from "@/components/shipping-bills/ShippingBillList";
import { ShippingBillAnalytics } from "@/components/shipping-bills/ShippingBillAnalytics";
import { LoadingState } from "@/components/ui/loading-state";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function ShippingBillsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [deletingSB, setDeletingSB] = useState<any>(null);

    // Pagination & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [activeTab, setActiveTab] = useState("all");
    const itemsPerPage = 12;

    const filteredBills = shippingBills.filter(sb => {
        const matchesSearch = sb.sb_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sb.export_orders?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            sb.export_orders?.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || sb.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
    const paginatedBills = filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const fetchData = () => {
        setLoading(true);
        fetch("/api/shipping-bills")
            .then(res => res.json())
            .then(data => {
                if (data.shippingBills) setShippingBills(data.shippingBills);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const onDelete = async () => {
        if (!deletingSB) return;
        try {
            const res = await fetch(`/api/shipping-bills?id=${deletingSB.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setDeletingSB(null);
            fetchData();
            toast({ title: "Success", description: "Shipping bill deleted successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Error deleting shipping bill", variant: "destructive" });
        }
    };

    const handleMarkAsFiled = async (id: string) => {
        try {
            const res = await fetch(`/api/shipping-bills/${id}/approve`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to file shipping bill");
            fetchData();
            toast({ title: "Success", description: "Shipping bill filed successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Error filing shipping bill", variant: "destructive" });
        }
    };

    const handleEdit = (sb: any) => {
        router.push(`/shipping-bills/${sb.id}`);
    };

    const handleCreate = () => {
        router.push('/shipping-bills/create');
    };

    return (
        <PageContainer className="space-y-6 max-w-7xl mx-auto p-6">
            <PageHeader
                title="Shipping Bills"
                description="Manage customs export declarations and compliance documents."
            >
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Add Shipping Bill
                </Button>
            </PageHeader>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Search shipping bills..."
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
                <ShippingBillAnalytics />
            ) : (
                <>
                    <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }}>
                        <TabsList>
                            {['all', 'drafted', 'filed', 'cleared', 'shipped'].map(tab => (
                                <TabsTrigger key={tab} value={tab} className="capitalize">
                                    {tab}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    {loading ? (
                        <LoadingState message="Loading shipping bills..." size="sm" />
                    ) : filteredBills.length === 0 ? (
                        <EmptyState
                            icon={Ship}
                            title="No shipping bills found"
                            description="Create your first shipping bill to track customs export declarations."
                            actionLabel="Add Shipping Bill"
                            onAction={handleCreate}
                            iconColor="text-primary"
                            iconBgColor="bg-primary/10"
                        />
                    ) : (
                        <>
                            <ShippingBillList
                                shippingBills={paginatedBills}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={setDeletingSB}
                                onFile={handleMarkAsFiled}
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
                                        <PaginationItem>
                                            <span className="px-4 text-sm text-muted-foreground">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                        </PaginationItem>
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
                </>
            )}

            <AlertDialog open={!!deletingSB} onOpenChange={() => setDeletingSB(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Shipping Bill?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete shipping bill {deletingSB?.sb_number}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </PageContainer>
    );
}
