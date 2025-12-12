"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface PurchaseOrderFormProps {
    initialData?: any;
    mode: "create" | "edit";
}

export function PurchaseOrderForm({ initialData, mode }: PurchaseOrderFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        vendor_id: initialData?.vendor_id || "",
        order_date: initialData?.order_date || new Date().toISOString().split('T')[0],
        currency_code: initialData?.currency_code || "USD",
        delivery_date: initialData?.delivery_date || "",
        notes: initialData?.notes || "",
        status: initialData?.status || "draft",
    });

    const [items, setItems] = useState(initialData?.purchase_order_items || [
        { sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }
    ]);

    const handleAddItem = () => {
        setItems([...items, { sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_: any, i: number) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = mode === "create"
                ? "/api/purchase-orders"
                : `/api/purchase-orders?id=${initialData.id}`;

            const method = mode === "create" ? "POST" : "PUT";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    items,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Failed to save purchase order");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: `Purchase order ${mode === "create" ? "created" : "updated"} successfully`,
            });

            router.push(`/purchase-orders/${mode === "create" ? data.purchase_order.id : initialData.id}`);
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        return items.reduce((sum: number, item: any) => {
            const lineTotal = item.quantity * item.unit_price;
            const tax = lineTotal * (item.tax_rate / 100);
            return sum + lineTotal + tax;
        }, 0);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">
                    {mode === "create" ? "Create Purchase Order" : "Edit Purchase Order"}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="vendor">Vendor *</Label>
                            <Input
                                id="vendor"
                                value={formData.vendor_id}
                                onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="order_date">Order Date *</Label>
                            <Input
                                id="order_date"
                                type="date"
                                value={formData.order_date}
                                onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="currency">Currency *</Label>
                            <Input
                                id="currency"
                                value={formData.currency_code}
                                onChange={(e) => setFormData({ ...formData, currency_code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="delivery_date">Delivery Date</Label>
                            <Input
                                id="delivery_date"
                                type="date"
                                value={formData.delivery_date}
                                onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea
                            id="notes"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Items</CardTitle>
                    <Button type="button" onClick={handleAddItem} size="sm">
                        <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {items.map((item: any, index: number) => (
                        <div key={index} className="grid grid-cols-5 gap-4 items-end border-b pb-4">
                            <div>
                                <Label>SKU</Label>
                                <Input
                                    value={item.sku_id}
                                    onChange={(e) => handleItemChange(index, "sku_id", e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label>Quantity</Label>
                                <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                                    required
                                    min="1"
                                />
                            </div>
                            <div>
                                <Label>Unit Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(e) => handleItemChange(index, "unit_price", Number(e.target.value))}
                                    required
                                    min="0"
                                />
                            </div>
                            <div>
                                <Label>Tax %</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={item.tax_rate}
                                    onChange={(e) => handleItemChange(index, "tax_rate", Number(e.target.value))}
                                    min="0"
                                    max="100"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(index)}
                                disabled={items.length === 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <div className="flex justify-end">
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground">Total</p>
                            <p className="text-2xl font-bold">{formData.currency_code} {calculateTotal().toFixed(2)}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => router.back()}>
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : mode === "create" ? "Create PO" : "Update PO"}
                </Button>
            </div>
        </form>
    );
}
