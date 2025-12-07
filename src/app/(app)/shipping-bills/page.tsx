"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Pencil, Trash2, ChevronLeft, ChevronRight, Search, FileCheck } from "lucide-react";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

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
        sb.sb_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sb.export_orders?.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sb.export_orders?.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
    const paginatedBills = filteredBills.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

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
        <div className="space-y-6">
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

            {/* SEARCH BOX */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by SB number or order..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* TABLE */}
            <div className="border rounded-md">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead>SB Number</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>FOB Value</TableHead>
                            <TableHead>Port</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={8} className="h-24 text-center"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                        ) : paginatedBills.length === 0 ? (
                            <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No shipping bills found.</TableCell></TableRow>
                        ) : (
                            paginatedBills.map(sb => (
                                <TableRow key={sb.id}>
                                    <TableCell className="font-medium">{sb.sb_number}</TableCell>
                                    <TableCell>{new Date(sb.sb_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{sb.export_orders?.order_number || '-'}</TableCell>
                                    <TableCell>{sb.export_orders?.entities?.name || '-'}</TableCell>
                                    <TableCell>{sb.currency_code} {Number(sb.fob_value).toFixed(2)}</TableCell>
                                    <TableCell>{sb.port_code || '-'}</TableCell>
                                    <TableCell>{getStatusBadge(sb.status)}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            {sb.status === 'drafted' && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => startEdit(sb)}>
                                                        <Pencil className="w-4 h-4 text-primary" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleMarkAsFiled(sb.id)} title="Mark as Filed">
                                                        <FileCheck className="w-4 h-4 text-green-600" />
                                                    </Button>
                                                </>
                                            )}
                                            {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                                <Button variant="ghost" size="icon" onClick={() => setDeletingSB(sb)}>
                                                    <Trash2 className="w-4 h-4 text-red-600" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION CONTROLS */}
            {!loading && filteredBills.length > 0 && (
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
