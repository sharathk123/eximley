"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { IncotermSelect } from "@/components/common/IncotermSelect";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import {
    Loader2,
    Plus,
    Search,
    LayoutGrid,
    List,
    Ship,
    Anchor,
    MapPin,
    Package,
    Truck,
    CheckCircle2,
    AlertCircle
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Trash2, Edit } from "lucide-react";
import Link from "next/link";

// Types
type Shipment = {
    id: string;
    shipment_number: string;
    status: string;
    created_at: string;
    shipment_date: string;
    carrier?: string;
    tracking_number?: string;
    port_of_loading?: string;
    port_of_discharge?: string;
    vessel_name?: string;
    total_packages?: number;
    export_orders: {
        order_number: string;
        entities: {
            name: string;
        } | null;
    };
    shipment_items: any[];
};

type Order = {
    id: string;
    order_number: string;
    entities: { name: string } | null;
};

type ShippableItem = {
    id: string; // Order Item ID
    product_id: string;
    products: { name: string };
    skus: { sku_code: string; name: string } | null;
    quantity: number;
    shipped_quantity: number;
    remaining_quantity: number;
};

const createShipmentSchema = z.object({
    order_id: z.string().min(1, "Order is required"),
    items: z.array(z.object({
        order_item_id: z.string(),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
        package_number: z.string().optional()
    })).min(1, "Select at least one item to ship"),
    shipment_date: z.string().optional(),
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
    carrier: z.string().optional(),
    tracking_number: z.string().optional(),
    port_of_loading: z.string().optional(),
    port_of_discharge: z.string().optional(),
    vessel_name: z.string().optional(),
    container_numbers: z.string().optional(), // Transformed in onSubmit
});


function ShipmentsPage() {
    const { toast } = useToast();
    const [viewMode, setViewMode] = useState<"list" | "card">("list");
    const [activeTab, setActiveTab] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

    // Create Flow State
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [shippableItems, setShippableItems] = useState<ShippableItem[]>([]);
    const [isFetchingItems, setIsFetchingItems] = useState(false);

    // Pagination & Actions State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;
    const [deletingShipment, setDeletingShipment] = useState<Shipment | null>(null);
    const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

    const searchParams = useSearchParams();

    const form = useForm<z.infer<typeof createShipmentSchema>>({
        resolver: zodResolver(createShipmentSchema) as any,
        defaultValues: {
            order_id: "",
            items: [] as any,
            container_numbers: "",
            shipment_date: new Date().toISOString().split('T')[0],
            carrier: "",
            tracking_number: "",
            port_of_loading: "",
            port_of_discharge: "",
            vessel_name: "",
        } as any
    });

    useEffect(() => {
        fetchShipments();
        fetchOrders();
    }, []);

    useEffect(() => {
        const createMode = searchParams.get('create');
        const orderId = searchParams.get('order_id');
        if (createMode === 'true') {
            setIsCreateOpen(true);
            if (orderId) {
                form.setValue('order_id', orderId);
                // We need to wait for orders or just trigger fetch items directly
                // Calling handleOrderSelect directly might be safe if defined
                handleOrderSelect(orderId);
            }
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
                // Allow confirmed, in_production, pending (manual), and drafts for flexibility
                setOrders(data.filter((o: any) => ['confirmed', 'in_production', 'pending', 'draft'].includes(o.status)));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleOrderSelect = async (orderId: string) => {
        setSelectedOrderId(orderId);
        setIsFetchingItems(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/shippable-items`);
            if (res.ok) {
                const items: ShippableItem[] = await res.json();
                setShippableItems(items);
                // Reset form items
                form.setValue("items", []);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch items" });
        } finally {
            setIsFetchingItems(false);
        }
    };

    const handleAddItem = (item: ShippableItem) => {
        const currentItems = form.getValues("items") || [];
        // Check if already added
        if (currentItems.find(i => i.order_item_id === item.id)) return;

        form.setValue("items", [
            ...currentItems,
            { order_item_id: item.id, quantity: item.remaining_quantity, package_number: "" }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        const currentItems = form.getValues("items");
        form.setValue("items", currentItems.filter((_, i) => i !== index));
    };

    const onSubmit = async (values: z.infer<typeof createShipmentSchema>) => {
        try {
            const payload = {
                ...values,
                container_numbers: values.container_numbers ? [values.container_numbers] : []
            };

            const res = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create shipment");
            }

            toast({ title: "Success", description: "Shipment created successfully" });
            setIsCreateOpen(false);
            form.reset();
            setSelectedOrderId(null);
            fetchShipments();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
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

    // Derived state
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'drafted': return 'secondary';
            case 'shipped': return 'default';
            case 'in_transit': return 'outline';
            case 'delivered': return 'secondary'; // using green usually but secondary is grey
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
                    <p className="text-muted-foreground">Manage logistics, packing lists, and delivery tracking.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={isCreateOpen} onOpenChange={(open) => {
                        setIsCreateOpen(open);
                        if (!open) {
                            form.reset();
                            setSelectedOrderId(null);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Shipment
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Create New Shipment</DialogTitle>
                                <DialogDescription>Select an order and items to ship.</DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="order_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Select Order</FormLabel>
                                                <Select onValueChange={(val) => { field.onChange(val); handleOrderSelect(val); }} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Select confirmed order..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {orders.map(o => (
                                                            <SelectItem key={o.id} value={o.id}>{o.order_number} - {o.entities?.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    {selectedOrderId && (
                                        <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                                            <h4 className="font-semibold text-sm">Select Items to Ship</h4>
                                            {isFetchingItems ? (
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading items...</div>
                                            ) : (
                                                <div className="space-y-4">
                                                    {/* Available Items List */}
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                                        {shippableItems.map(item => (
                                                            <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleAddItem(item)}>
                                                                <CardContent className="p-3">
                                                                    <div className="font-medium truncate">{item.products?.name}</div>
                                                                    <div className="text-xs text-muted-foreground">{item.skus?.sku_code}</div>
                                                                    <div className="mt-2 text-sm">
                                                                        Remaining: <Badge variant="secondary">{item.remaining_quantity}</Badge>
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        ))}
                                                        {shippableItems.length === 0 && <div className="text-sm text-muted-foreground p-2">No shippable items found.</div>}
                                                    </div>

                                                    <Separator />

                                                    {/* Selected Items Table */}
                                                    <div className="space-y-2">
                                                        <Label>Items in this Shipment</Label>
                                                        {form.watch("items")?.length === 0 ? (
                                                            <div className="text-sm text-muted-foreground italic">No items selected. Click cards above to add.</div>
                                                        ) : (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow>
                                                                        <TableHead>Item</TableHead>
                                                                        <TableHead className="w-[100px]">Qty</TableHead>
                                                                        <TableHead>Package #</TableHead>
                                                                        <TableHead className="w-[50px]"></TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {form.watch("items").map((fieldItem, index) => {
                                                                        const originalItem = shippableItems.find(i => i.id === fieldItem.order_item_id);
                                                                        return (
                                                                            <TableRow key={index}>
                                                                                <TableCell className="text-sm">
                                                                                    {originalItem?.products?.name} <span className="text-muted-foreground">({originalItem?.skus?.sku_code})</span>
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Input
                                                                                        type="number"
                                                                                        className="h-8"
                                                                                        {...form.register(`items.${index}.quantity` as const)}
                                                                                        defaultValue={fieldItem.quantity}
                                                                                        max={originalItem?.remaining_quantity}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Input
                                                                                        placeholder="Box 1"
                                                                                        className="h-8"
                                                                                        {...form.register(`items.${index}.package_number` as const)}
                                                                                    />
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(index)}>
                                                                                        <Plus className="h-4 w-4 rotate-45" />
                                                                                    </Button>
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        );
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        )}
                                                        <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="shipment_date" render={({ field }) => (
                                            <FormItem><FormLabel>Shipment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                                        )} />
                                        <IncotermSelect form={form} name="incoterm" />
                                        <FormField control={form.control} name="incoterm_place" render={({ field }) => (
                                            <FormItem><FormLabel>Incoterm Place</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="carrier" render={({ field }) => (
                                            <FormItem><FormLabel>Carrier / Forwarder</FormLabel><FormControl><Input placeholder="DHL, Maersk, etc." {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="tracking_number" render={({ field }) => (
                                            <FormItem><FormLabel>Tracking / Container #</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl></FormItem>
                                        )} />
                                        <FormField control={form.control} name="port_of_loading" render={({ field }) => (
                                            <FormItem><FormLabel>Port of Loading</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl></FormItem>
                                        )} />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Shipment
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setCurrentPage(1); }} className="w-full md:w-auto">
                    <TabsList>
                        <TabsTrigger value="all">All</TabsTrigger>
                        <TabsTrigger value="drafted">Drafted</TabsTrigger>
                        <TabsTrigger value="shipped">Shipped</TabsTrigger>
                        <TabsTrigger value="delivered">Delivered</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search shipments..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        />
                    </div>
                    <div className="flex items-center border rounded-md bg-background">
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`h-9 w-9 rounded-none ${viewMode === 'card' ? 'bg-muted' : ''}`}
                            onClick={() => setViewMode('card')}
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : filteredShipments.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Ship className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-medium">No shipments found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                        Get started by creating a shipment from your confirmed orders.
                    </p>
                </div>
            ) : viewMode === 'list' ? (
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shipment #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Order</TableHead>
                                <TableHead>Buyer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedShipments.map((ship) => (
                                <TableRow key={ship.id}>
                                    <TableCell className="font-medium">{ship.shipment_number}</TableCell>
                                    <TableCell>{new Date(ship.shipment_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{ship.export_orders?.order_number}</TableCell>
                                    <TableCell>{ship.export_orders?.entities?.name}</TableCell>
                                    <TableCell><Badge variant={getStatusColor(ship.status) as any}>{ship.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setSelectedShipment(ship)}>View</Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { /* Edit Placeholder */ }}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingShipment(ship)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedShipments.map((ship) => (
                        <Card key={ship.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    {ship.shipment_number}
                                </CardTitle>
                                <Badge variant={getStatusColor(ship.status) as any}>{ship.status}</Badge>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{ship.export_orders?.entities?.name}</div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    <Link href="/orders" className="hover:underline text-primary">{ship.export_orders?.order_number}</Link> • {new Date(ship.shipment_date).toLocaleDateString()}
                                </p>
                                <div className="mt-4 space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-muted-foreground" />
                                        <span>{ship.carrier || 'Not specified'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span>{ship.port_of_loading || '-'} → {ship.port_of_discharge || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        <span>{ship.total_packages || 0} Packages</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="gap-2">
                                <Button variant="outline" className="w-full" onClick={() => setSelectedShipment(ship)}>View</Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingShipment(ship)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
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

            {/* View Shipment Dialog */}
            <Dialog open={!!selectedShipment} onOpenChange={(open) => !open && setSelectedShipment(null)}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Shipment Details - {selectedShipment?.shipment_number}</DialogTitle>
                        <DialogDescription>
                            Order: {selectedShipment?.export_orders?.order_number}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedShipment && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <div className="font-semibold text-muted-foreground">Logistics</div>
                                    <div className="grid grid-cols-[100px_1fr] gap-1">
                                        <span className="text-muted-foreground">Carrier:</span> <span>{selectedShipment.carrier || '-'}</span>
                                        <span className="text-muted-foreground">Tracking:</span> <span>{selectedShipment.tracking_number || '-'}</span>
                                        <span className="text-muted-foreground">Vessel:</span> <span>{selectedShipment.vessel_name || '-'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="font-semibold text-muted-foreground">Route</div>
                                    <div className="grid grid-cols-[100px_1fr] gap-1">
                                        <span className="text-muted-foreground">From:</span> <span>{selectedShipment.port_of_loading || '-'}</span>
                                        <span className="text-muted-foreground">To:</span> <span>{selectedShipment.port_of_discharge || '-'}</span>
                                        <span className="text-muted-foreground">Date:</span> <span>{new Date(selectedShipment.shipment_date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h4 className="font-semibold mb-2 flex items-center gap-2"><List className="h-4 w-4" /> Packing List</h4>
                                <div className="border rounded-md bg-card">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Package #</TableHead>
                                                <TableHead>Item / SKU</TableHead>
                                                <TableHead className="text-right">Quantity</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedShipment.shipment_items?.map((item: any) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{item.package_number || '-'}</TableCell>
                                                    <TableCell>
                                                        <div className="font-medium">{item.order_items?.products?.name || 'Unknown Product'}</div>
                                                        <div className="text-xs text-muted-foreground">{item.order_items?.skus?.sku_code || 'No SKU'}</div>
                                                    </TableCell>
                                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingShipment} onOpenChange={(open) => !open && setDeletingShipment(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete shipment {deletingShipment?.shipment_number}.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function ShipmentsPageWrapper() {
    return (
        <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
            <ShipmentsPage />
        </Suspense>
    );
}
