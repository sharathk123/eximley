"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Plus, Loader2, Search, Ship } from "lucide-react";
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
import { useToast } from "@/components/ui/use-toast";
import { ShippingBillList } from "@/components/shipping-bills/ShippingBillList";
import { ShippingBillDialog } from "@/components/shipping-bills/ShippingBillDialog";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

export default function ShippingBillsPage() {
    const { toast } = useToast();
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [openDialog, setOpenDialog] = useState(false);
    const [deletingSB, setDeletingSB] = useState<any>(null);
    const [editingSB, setEditingSB] = useState<any>(null);

    // Pagination & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
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

    const fetchOrders = () => {
        fetch("/api/orders")
            .then(res => res.json())
            .then(data => {
                if (data.orders) {
                    setOrders(data.orders);
                }
            })
            .catch(err => {
                console.error("Error fetching orders:", err);
            });
    };

    useEffect(() => {
        fetchData();
        fetchOrders();
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
            const res = await fetch(`/api/shipping-bills/${id}/file`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to mark as filed");
            fetchData();
            toast({ title: "Success", description: "Marked as filed successfully" });
        } catch (error) {
            toast({ title: "Error", description: "Error marking as filed", variant: "destructive" });
        }
    };

    const handleEdit = (sb: any) => {
        setEditingSB(sb);
        setOpenDialog(true);
    };

    const handleCreate = () => {
        setEditingSB(null);
        setOpenDialog(true);
    };

    const handleSuccess = () => {
        fetchData();
        toast({ title: "Success", description: `Shipping bill ${editingSB ? 'updated' : 'created'} successfully` });
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Shipping Bills</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage customs export declarations and compliance documents.</p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="w-4 h-4 mr-2" /> Add Shipping Bill
                </Button>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search shipping bills..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 bg-card border-border"
                    />
                </div>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }}>
                <TabsList className="bg-muted">
                    {['all', 'drafted', 'filed', 'cleared', 'shipped'].map(tab => (
                        <TabsTrigger key={tab} value={tab} className="capitalize data-[state=active]:bg-background data-[state=active]:text-foreground">
                            {tab}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
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

            <ShippingBillDialog
                open={openDialog}
                onOpenChange={setOpenDialog}
                initialData={editingSB}
                onSuccess={handleSuccess}
                orders={orders}
            />

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
        </div>
    );
}
