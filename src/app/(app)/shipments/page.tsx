"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/use-toast";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import {
    Loader2,
    Plus,
    Ship,
} from "lucide-react";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import { ShipmentList } from "@/components/shipments/ShipmentList";
import { ShipmentDialog } from "@/components/shipments/ShipmentDialog";
import { ShipmentDetailsDialog } from "@/components/shipments/ShipmentDetailsDialog";
import { DeleteDialog } from "@/components/shared";

function ShipmentsPage() {
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<"list" | "card">("list");
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [shipments, setShipments] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<any | null>(null);
    const [deletingShipment, setDeletingShipment] = useState<any | null>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const searchParams = useSearchParams();
    const initialOrderId = searchParams.get('order_id');

    useEffect(() => {
        fetchShipments();
        fetchOrders();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    useEffect(() => {
        const createMode = searchParams.get('create');
        if (createMode === 'true') {
            setIsCreateOpen(true);
        }
        
        const statusParam = searchParams.get('status');
        if (statusParam) {
            setActiveTab(statusParam);
        }
    }, [searchParams]);

    const fetchShipments = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/shipments");
            if (!res.ok) throw new Error("Failed to fetch shipments");
            const data = await res.json();
            setShipments(data);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error",
                description: "Could not load shipments."
            });
        } finally {
            setIsLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders");
            if (res.ok) {
                const data = await res.json();
                if (data.orders) {
                    setOrders(data.orders.filter((o: any) => ['confirmed', 'in_production', 'pending', 'draft'].includes(o.status)));
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async () => {
        if (!deletingShipment) return;
        try {
            const res = await fetch(`/api/shipments?id=${deletingShipment.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete shipment");

            toast({ title: "Success", description: "Shipment deleted successfully" });
            fetchShipments();
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to delete shipment" });
        } finally {
            setDeletingShipment(null);
        }
    };

    const filteredShipments = shipments.filter(ship => {
        const matchesSearch =
            ship.shipment_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ship.export_orders?.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ship.export_orders?.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());

        if (activeTab === "all") return matchesSearch;
        return matchesSearch && ship.status === activeTab;
    });

    const totalPages = Math.ceil(filteredShipments.length / itemsPerPage);
    const paginatedShipments = filteredShipments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <PageContainer>
            <PageHeader
                title="Shipments"
                description="Manage logistics, packing lists, and delivery tracking."
            >
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> New Shipment
                </Button>
            </PageHeader>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search shipments..."
                />
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="drafted">Drafted</TabsTrigger>
                    <TabsTrigger value="shipped">Shipped</TabsTrigger>
                    <TabsTrigger value="delivered">Delivered</TabsTrigger>
                </TabsList>
            </Tabs>

            {isLoading ? (
                <LoadingState message="Loading shipments..." />
            ) : filteredShipments.length === 0 ? (
                <EmptyState
                    icon={Ship}
                    title="No shipments found"
                    description="Get started by creating a shipment from your confirmed orders."
                    actionLabel="New Shipment"
                    onAction={() => setIsCreateOpen(true)}
                    iconColor="text-blue-600 dark:text-blue-200"
                    iconBgColor="bg-blue-100 dark:bg-blue-900"
                />
            ) : (
                <>
                    <ShipmentList
                        shipments={paginatedShipments}
                        viewMode={viewMode}
                        onView={setSelectedShipment}
                        onDelete={setDeletingShipment}
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

            <ShipmentDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                orders={orders}
                initialOrderId={initialOrderId}
                onSuccess={() => {
                    fetchShipments();
                }}
            />

            <ShipmentDetailsDialog
                shipment={selectedShipment}
                open={!!selectedShipment}
                onOpenChange={(open) => !open && setSelectedShipment(null)}
            />

            {/* Delete Dialog */}
            <DeleteDialog
                open={!!deletingShipment}
                onOpenChange={(open) => !open && setDeletingShipment(null)}
                onConfirm={handleDelete}
                documentNumber={deletingShipment?.shipment_number || ''}
                documentType="Shipment"
                loading={false}
            />
        </PageContainer>
    );
}

export default function ShipmentsPageWrapper() {
    return (
        <Suspense fallback={<LoadingState />}>
            <ShipmentsPage />
        </Suspense>
    );
}
