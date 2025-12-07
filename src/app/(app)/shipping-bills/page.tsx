"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Edit, Trash2, ChevronLeft, ChevronRight, Search, FileCheck, LayoutGrid, List, Ship } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShippingBillsPage() {
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [deletingSB, setDeletingSB] = useState<any>(null);

    // Selection
    const [editingSB, setEditingSB] = useState<any>(null);

    // Pagination & Search State
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const itemsPerPage = 12;

    // Form Data
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

    // Derived State
    const filteredBills = shippingBills.filter(sb =>
        sb.sb_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sb.export_orders?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sb.export_orders?.entities?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                if (data.orders) setOrders(data.orders);
            });
    };

    useEffect(() => {
        fetchData();
        fetchOrders();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const handleOrderSelect = (orderId: string) => {
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

    const onAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.export_order_id) {
            alert("Please select an order");
            return;
        }

        try {
            const order = orders.find(o => o.id === formData.export_order_id);
            if (!order || !order.order_items) {
                alert("Order items not found");
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

            const res = await fetch("/api/shipping-bills", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, items })
            });

            if (!res.ok) throw new Error("Failed to create");
            setOpenAdd(false);
            resetForm();
            fetchData();
        } catch (error) {
            alert("Error creating shipping bill");
        }
    };

    const onEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/shipping-bills", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editingSB.id, ...formData })
            });

            if (!res.ok) throw new Error("Failed to update");
            setOpenEdit(false);
            resetForm();
            fetchData();
        } catch (error) {
            alert("Error updating shipping bill");
        }
    };

    const startEdit = (sb: any) => {
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
        setOpenEdit(true);
    };

    const onDelete = async () => {
        if (!deletingSB) return;
        try {
            const res = await fetch(`/api/shipping-bills?id=${deletingSB.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete");
            setDeletingSB(null);
            fetchData();
        } catch (error) {
            alert("Error deleting shipping bill");
        }
    };

    const handleMarkAsFiled = async (id: string) => {
        try {
            const res = await fetch(`/api/shipping-bills/${id}/file`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to mark as filed");
            fetchData();
        } catch (error) {
            alert("Error marking as filed");
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

    const getStatusBadge = (status: string) => {
        const variants: any = {
            drafted: 'secondary',
            filed: 'default',
            cleared: 'default',
            shipped: 'default',
            cancelled: 'destructive'
        };
        return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Shipping Bills</h1>
                <Dialog open={openAdd} onOpenChange={(open) => { setOpenAdd(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" /> Add Shipping Bill
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Add New Shipping Bill</DialogTitle></DialogHeader>
                        <form onSubmit={onAddSubmit} className="space-y-4 pt-4">
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
                                    <Input value={formData.sb_number} onChange={(e) => setFormData(prev => ({ ...prev, sb_number: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>SB Date *</Label>
                                    <Input type="date" value={formData.sb_date} onChange={(e) => setFormData(prev => ({ ...prev, sb_date: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Port Code</Label>
                                    <Input value={formData.port_code} onChange={(e) => setFormData(prev => ({ ...prev, port_code: e.target.value }))} placeholder="e.g., INMAA1" />
                                </div>
                                <div>
                                    <Label>Customs House</Label>
                                    <Input value={formData.customs_house} onChange={(e) => setFormData(prev => ({ ...prev, customs_house: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>FOB Value *</Label>
                                    <Input type="number" step="0.01" value={formData.fob_value} onChange={(e) => setFormData(prev => ({ ...prev, fob_value: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Freight Value</Label>
                                    <Input type="number" step="0.01" value={formData.freight_value} onChange={(e) => setFormData(prev => ({ ...prev, freight_value: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Insurance Value</Label>
                                    <Input type="number" step="0.01" value={formData.insurance_value} onChange={(e) => setFormData(prev => ({ ...prev, insurance_value: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>LEO Number</Label>
                                    <Input value={formData.let_export_order_number} onChange={(e) => setFormData(prev => ({ ...prev, let_export_order_number: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setOpenAdd(false); resetForm(); }}>Cancel</Button>
                                <Button type="submit">Create</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Dialog */}
                <Dialog open={openEdit} onOpenChange={(open) => { setOpenEdit(false); if (!open) resetForm(); }}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader><DialogTitle>Edit Shipping Bill</DialogTitle></DialogHeader>
                        <form onSubmit={onEditSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>SB Number *</Label>
                                    <Input value={formData.sb_number} onChange={(e) => setFormData(prev => ({ ...prev, sb_number: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>SB Date *</Label>
                                    <Input type="date" value={formData.sb_date} onChange={(e) => setFormData(prev => ({ ...prev, sb_date: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Port Code</Label>
                                    <Input value={formData.port_code} onChange={(e) => setFormData(prev => ({ ...prev, port_code: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Customs House</Label>
                                    <Input value={formData.customs_house} onChange={(e) => setFormData(prev => ({ ...prev, customs_house: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>FOB Value *</Label>
                                    <Input type="number" step="0.01" value={formData.fob_value} onChange={(e) => setFormData(prev => ({ ...prev, fob_value: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Freight Value</Label>
                                    <Input type="number" step="0.01" value={formData.freight_value} onChange={(e) => setFormData(prev => ({ ...prev, freight_value: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Insurance Value</Label>
                                    <Input type="number" step="0.01" value={formData.insurance_value} onChange={(e) => setFormData(prev => ({ ...prev, insurance_value: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>LEO Number</Label>
                                    <Input value={formData.let_export_order_number} onChange={(e) => setFormData(prev => ({ ...prev, let_export_order_number: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => { setOpenEdit(false); resetForm(); }}>Cancel</Button>
                                <Button type="submit">Update</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* SEARCH & VIEW TOGGLE */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search shipping bills..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex gap-1 border rounded-md p-1">
                    <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : filteredBills.length === 0 ? (
                <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                        <Ship className="h-6 w-6 text-blue-600 dark:text-blue-200" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">No shipping bills found</h3>
                    <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                        Create your first shipping bill to track customs export declarations.
                    </p>
                    <Button onClick={() => setOpenAdd(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Add Shipping Bill
                    </Button>
                </div>
            ) : (
                <>
                    {viewMode === 'card' ? (
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {paginatedBills.map((sb) => (
                                <Card key={sb.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                        <div className="space-y-1">
                                            <CardTitle className="text-base font-bold">{sb.sb_number}</CardTitle>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(sb.sb_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {getStatusBadge(sb.status)}
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Buyer</p>
                                            <p className="font-medium">{sb.export_orders?.entities?.name || '—'}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <p className="text-xs text-muted-foreground">Order</p>
                                                <p className="font-mono text-xs">{sb.export_orders?.order_number || '—'}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-muted-foreground">Port</p>
                                                <p className="text-xs">{sb.port_code || '—'}</p>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">FOB Value</p>
                                            <p className="text-lg font-bold">{sb.currency_code} {Number(sb.fob_value).toFixed(2)}</p>
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            {sb.status === 'drafted' && (
                                                <>
                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => startEdit(sb)}>
                                                        <Edit className="h-3 w-3 mr-1" /> Edit
                                                    </Button>
                                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleMarkAsFiled(sb.id)}>
                                                        <FileCheck className="h-3 w-3 mr-1" /> File
                                                    </Button>
                                                </>
                                            )}
                                            {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingSB(sb)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded-md bg-card">
                            <Table className="table-fixed">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[140px]">SB Number</TableHead>
                                        <TableHead className="w-[110px]">Date</TableHead>
                                        <TableHead className="w-[130px]">Order</TableHead>
                                        <TableHead className="w-[180px]">Buyer</TableHead>
                                        <TableHead className="w-[130px]">FOB Value</TableHead>
                                        <TableHead className="w-[100px]">Port</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedBills.map(sb => (
                                        <TableRow key={sb.id}>
                                            <TableCell className="font-medium">{sb.sb_number}</TableCell>
                                            <TableCell>{new Date(sb.sb_date).toLocaleDateString()}</TableCell>
                                            <TableCell>{sb.export_orders?.order_number || '—'}</TableCell>
                                            <TableCell>{sb.export_orders?.entities?.name || '—'}</TableCell>
                                            <TableCell>{sb.currency_code} {Number(sb.fob_value).toFixed(2)}</TableCell>
                                            <TableCell>{sb.port_code || '—'}</TableCell>
                                            <TableCell>{getStatusBadge(sb.status)}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2 justify-end">
                                                    {sb.status === 'drafted' && (
                                                        <>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(sb)}>
                                                                <Edit className="h-4 w-4 text-primary" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleMarkAsFiled(sb.id)} title="Mark as Filed">
                                                                <FileCheck className="h-4 w-4 text-green-600" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeletingSB(sb)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <div className="text-muted-foreground mr-4">
                                Page {currentPage} of {totalPages} ({filteredBills.length} total)
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}

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
                        <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
