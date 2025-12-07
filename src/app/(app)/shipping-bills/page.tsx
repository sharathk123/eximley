"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, FileCheck, Trash2, Search, Ship } from "lucide-react";
import { Label } from "@/components/ui/label";

export default function ShippingBillsPage() {
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

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

        // Fetch order details to auto-populate
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
            // Get order items with HSN codes
            const order = orders.find(o => o.id === formData.export_order_id);
            if (!order || !order.order_items) {
                toast({ title: "Order items not found", variant: "destructive" });
                return;
            }

            // Build items array from order items
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
                body: JSON.stringify({
                    ...formData,
                    items
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create shipping bill");
            }

            toast({ title: "Shipping bill created successfully" });
            setIsCreateOpen(false);
            fetchData();
            resetForm();
        } catch (error: any) {
            toast({ title: error.message, variant: "destructive" });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this shipping bill?")) return;

        try {
            const res = await fetch(`/api/shipping-bills?id=${id}`, {
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Shipping Bills</h2>
                    <p className="text-muted-foreground">Customs export declarations for all shipments</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
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
                                <div>
                                    <Label>Sales Order *</Label>
                                    <Select value={formData.export_order_id} onValueChange={handleOrderSelect}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select order" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {orders.map(order => (
                                                <SelectItem key={order.id} value={order.id}>
                                                    {order.order_number} - {order.entities?.name}
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
                                        placeholder="e.g., INMAA1"
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
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">Create Shipping Bill</Button>
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
                </div>

                {loading ? (
                    <div className="text-center py-8">Loading...</div>
                ) : filteredBills.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No shipping bills found</p>
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
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
                                {filteredBills.map((sb) => (
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
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleMarkAsFiled(sb.id)}
                                                    >
                                                        <FileCheck className="h-4 w-4 mr-1" />
                                                        File
                                                    </Button>
                                                )}
                                                {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(sb.id)}
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
                )}
            </Card>
        </div>
    );
}
