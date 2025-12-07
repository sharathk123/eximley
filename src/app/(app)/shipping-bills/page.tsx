"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, FileCheck, Trash2, Search, Ship, Grid3x3, List, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function ShippingBillsPage() {
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [currentPage, setCurrentPage] = useState(1);
    const [deletingSB, setDeletingSB] = useState<any>(null);
    const [editingSB, setEditingSB] = useState<any>(null);
    const itemsPerPage = 10;

    const [formData, setFormData] = useState({
        sb_number: "",
        sb_date: new Date().toISOString().split('T')[0],
        export_order_id: "",
        port_code: "",
        customs_house: "",
        fob_value: "",
        freight_value: "0",
        insurance_value: "0",
        currency_code: "USD",
        let_export_order_number: "",
        let_export_date: "",
        notes: ""
    });

    const { toast } = useToast();

    useEffect(() => {
        fetchData();
        fetchOrders();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch("/api/shipping-bills");
            const data = await res.json();
            setShippingBills(data.shippingBills || []);
        } catch (error) {
            toast({ title: "Error fetching shipping bills", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch("/api/orders");
            const data = await res.json();
            setOrders(data.orders || []);
        } catch (error) {
            console.error("Error fetching orders:", error);
        }
    };

    const handleOrderSelect = async (orderId: string) => {
        setFormData(prev => ({ ...prev, export_order_id: orderId }));

        const order = orders.find(o => o.id === orderId);
        if (order) {
            setFormData(prev => ({
                ...prev,
                fob_value: order.total_amount?.toString() || "",
                currency_code: order.currency_code || "USD"
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.export_order_id) {
            toast({ title: "Please select an order", variant: "destructive" });
            return;
        }

        try {
            const order = orders.find(o => o.id === formData.export_order_id);
            if (!order || !order.order_items) {
                toast({ title: "Order items not found", variant: "destructive" });
                return;
            }

            const items = order.order_items.map((item: any) => ({
                hsn_code: item.skus?.hsn_code || item.skus?.products?.hsn_code || "000000",
                description: item.skus?.name || "Item",
                quantity: item.quantity,
                unit: item.skus?.unit || "PCS",
                unit_price: item.unit_price,
                order_item_id: item.id
            }));

            const url = editingSB ? `/api/shipping-bills` : "/api/shipping-bills";
            const method = editingSB ? "PUT" : "POST";
            const body = editingSB
                ? { id: editingSB.id, ...formData }
                : { ...formData, items };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to save shipping bill");
            }

            toast({ title: editingSB ? "Shipping bill updated" : "Shipping bill created successfully" });
            setIsCreateOpen(false);
            setIsEditOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            toast({ title: error.message, variant: "destructive" });
        }
    };

    const handleEdit = (sb: any) => {
        setEditingSB(sb);
        setFormData({
            sb_number: sb.sb_number,
            sb_date: sb.sb_date,
            export_order_id: sb.export_order_id || "",
            port_code: sb.port_code || "",
            customs_house: sb.customs_house || "",
            fob_value: sb.fob_value?.toString() || "",
            freight_value: sb.freight_value?.toString() || "0",
            insurance_value: sb.insurance_value?.toString() || "0",
            currency_code: sb.currency_code || "USD",
            let_export_order_number: sb.let_export_order_number || "",
            let_export_date: sb.let_export_date || "",
            notes: sb.notes || ""
        });
        setIsEditOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingSB) return;

        try {
            const res = await fetch(`/api/shipping-bills?id=${deletingSB.id}`, {
                method: "DELETE"
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }

            toast({ title: "Shipping bill deleted" });
            fetchData();
        } catch (error: any) {
            toast({ title: error.message, variant: "destructive" });
        } finally {
            setDeletingSB(null);
        }
    };

    const handleMarkAsFiled = async (id: string) => {
        try {
            const res = await fetch(`/api/shipping-bills/${id}/file`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Failed to mark as filed");

            toast({ title: "Marked as filed with customs" });
            fetchData();
        } catch (error: any) {
            toast({ title: error.message, variant: "destructive" });
        }
    };

    const resetForm = () => {
        setEditingSB(null);
        setFormData({
            sb_number: "",
            sb_date: new Date().toISOString().split('T')[0],
            export_order_id: "",
            port_code: "",
            customs_house: "",
            fob_value: "",
            freight_value: "0",
            insurance_value: "0",
            currency_code: "USD",
            let_export_order_number: "",
            let_export_date: "",
            notes: ""
        });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'drafted': return 'secondary';
            case 'filed': return 'default';
            case 'cleared': return 'default';
            case 'shipped': return 'default';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const filteredBills = shippingBills.filter(sb => {
        const matchesSearch = sb.sb_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            sb.export_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || sb.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedBills = filteredBills.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Shipping Bills</h2>
                    <p className="text-muted-foreground">Customs export declarations for all shipments</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> New Shipping Bill
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Create Shipping Bill</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Sales Order *</Label>
                                    <Select value={formData.export_order_id} onValueChange={handleOrderSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select order" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orders.map(order => (
                                                <SelectItem key={order.id} value={order.id}>
                                                    {order.order_number} - {order.entities?.name} ({order.currency_code} {Number(order.total_amount).toFixed(2)})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>SB Number *</Label>
                                    <Input
                                        value={formData.sb_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sb_number: e.target.value }))}
                                        placeholder="e.g., SB/2024/001"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>SB Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.sb_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sb_date: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Port Code</Label>
                                    <Input
                                        value={formData.port_code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, port_code: e.target.value }))}
                                        placeholder="e.g., INMAA1 (Chennai)"
                                    />
                                </div>
                                <div>
                                    <Label>Customs House</Label>
                                    <Input
                                        value={formData.customs_house}
                                        onChange={(e) => setFormData(prev => ({ ...prev, customs_house: e.target.value }))}
                                        placeholder="e.g., Chennai Customs"
                                    />
                                </div>
                                <div>
                                    <Label>FOB Value *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.fob_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, fob_value: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Freight Value</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.freight_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, freight_value: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Insurance Value</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.insurance_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, insurance_value: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>LEO Number</Label>
                                    <Input
                                        value={formData.let_export_order_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, let_export_order_number: e.target.value }))}
                                        placeholder="Let Export Order"
                                    />
                                </div>
                                <div>
                                    <Label>LEO Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.let_export_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, let_export_date: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                    placeholder="Additional notes"
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create Shipping Bill</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={isEditOpen} onOpenChange={(open) => { setIsEditOpen(open); if (!open) resetForm(); }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Edit Shipping Bill</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>SB Number *</Label>
                                    <Input
                                        value={formData.sb_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sb_number: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>SB Date *</Label>
                                    <Input
                                        type="date"
                                        value={formData.sb_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, sb_date: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Port Code</Label>
                                    <Input
                                        value={formData.port_code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, port_code: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Customs House</Label>
                                    <Input
                                        value={formData.customs_house}
                                        onChange={(e) => setFormData(prev => ({ ...prev, customs_house: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>FOB Value *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.fob_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, fob_value: e.target.value }))}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label>Freight Value</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.freight_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, freight_value: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>Insurance Value</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.insurance_value}
                                        onChange={(e) => setFormData(prev => ({ ...prev, insurance_value: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>LEO Number</Label>
                                    <Input
                                        value={formData.let_export_order_number}
                                        onChange={(e) => setFormData(prev => ({ ...prev, let_export_order_number: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <Label>LEO Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.let_export_date}
                                        onChange={(e) => setFormData(prev => ({ ...prev, let_export_date: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <Label>Notes</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>
                                    Cancel
                                </Button>
                                <Button type="submit">Update Shipping Bill</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="p-4">
                <div className="flex gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by SB number or order..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="drafted">Drafted</SelectItem>
                            <SelectItem value="filed">Filed</SelectItem>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                        <Button
                            variant={viewMode === 'list' ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === 'grid' ? 'default' : 'outline'}
                            size="icon"
                            onClick={() => setViewMode('grid')}
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No shipping bills found</p>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="border rounded-md">
                        <Table className="table-fixed">
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="w-[140px]">SB Number</TableHead>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead className="w-[150px]">Order</TableHead>
                                    <TableHead className="w-[180px]">Buyer</TableHead>
                                    <TableHead className="w-[120px]">FOB Value</TableHead>
                                    <TableHead className="w-[100px]">Port</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="w-[150px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedBills.map((sb) => (
                                    <TableRow key={sb.id}>
                                        <TableCell className="font-medium">{sb.sb_number}</TableCell>
                                        <TableCell>{new Date(sb.sb_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{sb.export_orders?.order_number || "—"}</TableCell>
                                        <TableCell>{sb.export_orders?.entities?.name || "—"}</TableCell>
                                        <TableCell>
                                            {sb.currency_code} {Number(sb.fob_value).toFixed(2)}
                                        </TableCell>
                                        <TableCell>{sb.port_code || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusColor(sb.status)}>{sb.status}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {sb.status === 'drafted' && (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(sb)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleMarkAsFiled(sb.id)}
                                                        >
                                                            <FileCheck className="h-4 w-4 mr-1" />
                                                            File
                                                        </Button>
                                                    </>
                                                )}
                                                {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => setDeletingSB(sb)}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {paginatedBills.map((sb) => (
                            <Card key={sb.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {sb.sb_number}
                                    </CardTitle>
                                    <Badge variant={getStatusColor(sb.status)}>{sb.status}</Badge>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{sb.export_orders?.entities?.name || "—"}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {sb.export_orders?.order_number} • {new Date(sb.sb_date).toLocaleDateString()}
                                    </p>
                                    <div className="mt-4 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">FOB Value:</span>
                                            <span className="font-medium">{sb.currency_code} {Number(sb.fob_value).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Port:</span>
                                            <span>{sb.port_code || "—"}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        {sb.status === 'drafted' && (
                                            <>
                                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(sb)}>
                                                    <Edit className="h-4 w-4 mr-1" />
                                                    Edit
                                                </Button>
                                                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleMarkAsFiled(sb.id)}>
                                                    <FileCheck className="h-4 w-4 mr-1" />
                                                    File
                                                </Button>
                                            </>
                                        )}
                                        {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeletingSB(sb)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Page {currentPage} of {totalPages} ({filteredBills.length} total)
                        </p>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="h-4 w-4 mr-1" />
                                        Previous
                                    </Button>
                                </PaginationItem>
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                        <PaginationLink
                                            onClick={() => setCurrentPage(page)}
                                            isActive={currentPage === page}
                                        >
                                            {page}
                                        </PaginationLink>
                                    </PaginationItem>
                                ))}
                                <PaginationItem>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRight className="h-4 w-4 ml-1" />
                                    </Button>
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                )}
            </Card>

            {/* Delete Confirmation Dialog */}
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
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
