"use client";

import { useEffect, useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { useToast } from "@/components/ui/use-toast";
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

import { OrderFormValues } from "@/lib/schemas/order";
import { OrderList } from "@/components/orders/OrderList";
import { OrderFormDialog } from "@/components/orders/OrderFormDialog";
import { PaymentDialog } from "@/components/orders/PaymentDialog";
import { OrderStats } from "@/components/orders/OrderStats";

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

    // UI State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isPaymentOpen, setIsPaymentOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<any>(null); // For payments
    const [editingOrder, setEditingOrder] = useState<any>(null); // For editing
    const [deletingOrder, setDeletingOrder] = useState<any>(null); // For deleting

    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [currentPage, setCurrentPage] = useState(1);
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
            const [entRes, skuRes, currRes, piRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/invoices/proforma")
            ]);

            if (entRes.ok) setBuyers((await entRes.json()).entities || []);
            if (skuRes.ok) setSkus((await skuRes.json()).skus || []);
            if (currRes.ok) setCurrencies((await currRes.json()).currencies || []);
            if (piRes.ok) setInvoices((await piRes.json()).invoices || []);
        } catch (err) {
            console.error(err);
        }
    }

    const fetchData = async () => {
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            if (data.orders) setOrders(data.orders);
        } catch (err) {
            console.error("Failed to fetch orders:", err);
            toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
        }
    };

    const handleCreate = () => {
        setEditingOrder(null);
        setIsCreateOpen(true);
    };

    const handleEdit = (order: any) => {
        setEditingOrder(order);
        setIsCreateOpen(true);
    };

    const onFormSubmit = async (values: OrderFormValues) => {
        try {
            const method = editingOrder ? "PUT" : "POST";
            const res = await fetch("/api/orders", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsCreateOpen(false);
                setEditingOrder(null);
                fetchData();
                toast({ title: "Success", description: `Order ${editingOrder ? 'updated' : 'created'} successfully` });
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save order", variant: "destructive" });
        }
    };

    const handleDelete = async () => {
        if (!deletingOrder) return;
        try {
            const res = await fetch(`/api/orders?id=${deletingOrder.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete order");

            await fetchData();
            toast({ title: "Success", description: "Order deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete order", variant: "destructive" });
        } finally {
            setDeletingOrder(null);
        }
    };

    const openPaymentDialog = (order: any) => {
        setSelectedOrder(order);
        setIsPaymentOpen(true);
    };

    // Filtering logic
    const filteredOrders = orders.filter(ord => {
        const matchesSearch =
            ord.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ord.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || ord.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Export Orders</h1>
                    <p className="text-muted-foreground">
                        Manage confirmed Sales Orders and track status.
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> New Order
                </Button>
            </div>

            <OrderStats orders={orders} />

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search orders..."
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
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                    <TabsTrigger value="shipped">Shipped</TabsTrigger>
                    <TabsTrigger value="completed">Completed</TabsTrigger>
                    <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {paginatedOrders.length === 0 ? (
                        <EmptyState
                            icon={ShoppingCart}
                            title="No orders found"
                            description="Create a new export order to start processing a sale."
                            actionLabel="Create Order"
                            onAction={handleCreate}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            <OrderList
                                orders={paginatedOrders}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={setDeletingOrder}
                                onPayment={openPaymentDialog}
                            />

                            {totalPages > 1 && (
                                <Pagination className="mt-4">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                                                    {page}
                                                </PaginationLink>
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

            <OrderFormDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                initialData={editingOrder}
                buyers={buyers}
                skus={skus}
                currencies={currencies}
                invoices={invoices}
                onSubmit={onFormSubmit}
            />

            <PaymentDialog
                open={isPaymentOpen}
                onOpenChange={setIsPaymentOpen}
                order={selectedOrder}
                onSuccess={fetchData}
            />

            <AlertDialog open={!!deletingOrder} onOpenChange={(open) => !open && setDeletingOrder(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete order "{deletingOrder?.order_number}". This action cannot be undone.
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
        </div>
    );
}
