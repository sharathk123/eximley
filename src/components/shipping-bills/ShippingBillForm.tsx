"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

interface ShippingBillFormProps {
    initialData?: any;
    mode: "create" | "edit";
}

export function ShippingBillForm({ initialData, mode }: ShippingBillFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        sb_number: initialData?.sb_number || "",
        sb_date: initialData?.sb_date || new Date().toISOString().split('T')[0],
        port_code: initialData?.port_code || "",
        customs_house: initialData?.customs_house || "",
        currency_code: initialData?.currency_code || "USD",
        vessel_name: initialData?.vessel_name || "",
        voyage_number: initialData?.voyage_number || "",
        port_of_loading: initialData?.port_of_loading || "",
        port_of_discharge: initialData?.port_of_discharge || "",
        consignee_name: initialData?.consignee_name || "",
        consignee_country: initialData?.consignee_country || "",
        notes: initialData?.notes || "",
        status: initialData?.status || "drafted",
    });

    const [items, setItems] = useState(initialData?.shipping_bill_items || [
        { hsn_code: "", description: "", quantity: 1, unit_price: 0, fob_value: 0 }
    ]);

    const handleAddItem = () => {
        setItems([...items, { hsn_code: "", description: "", quantity: 1, unit_price: 0, fob_value: 0 }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_: any, i: number) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };

        // Auto-calculate FOB value
        if (field === 'quantity' || field === 'unit_price') {
            const qty = field === 'quantity' ? value : newItems[index].quantity;
            const price = field === 'unit_price' ? value : newItems[index].unit_price;
            newItems[index].fob_value = qty * price;
        }

        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = mode === "create"
                ? "/api/shipping-bills"
                : `/api/shipping-bills?id=${initialData.id}`;

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
                throw new Error(error.error || "Failed to save shipping bill");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: `Shipping bill ${mode === "create" ? "created" : "updated"} successfully`,
            });

            router.push(`/shipping-bills/${mode === "create" ? data.shipping_bill.id : initialData.id}`);
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
        return items.reduce((sum: number, item: any) => sum + (item.fob_value || 0), 0);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button type="button" variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">
                    {mode === "create" ? "Create Shipping Bill" : "Edit Shipping Bill"}
                </h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Shipping Bill Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="sb_number">SB Number *</Label>
                            <Input
                                id="sb_number"
                                value={formData.sb_number}
                                onChange={(e) => setFormData({ ...formData, sb_number: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="sb_date">SB Date *</Label>
                            <Input
                                id="sb_date"
                                type="date"
                                value={formData.sb_date}
                                onChange={(e) => setFormData({ ...formData, sb_date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="port_code">Port Code *</Label>
                            <Input
                                id="port_code"
                                value={formData.port_code}
                                onChange={(e) => setFormData({ ...formData, port_code: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="customs_house">Customs House</Label>
                            <Input
                                id="customs_house"
                                value={formData.customs_house}
                                onChange={(e) => setFormData({ ...formData, customs_house: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="vessel_name">Vessel Name</Label>
                            <Input
                                id="vessel_name"
                                value={formData.vessel_name}
                                onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
                            />
                        </div>
                        <div>
                            <Label htmlFor="consignee_name">Consignee Name</Label>
                            <Input
                                id="consignee_name"
                                value={formData.consignee_name}
                                onChange={(e) => setFormData({ ...formData, consignee_name: e.target.value })}
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
                        <div key={index} className="grid grid-cols-6 gap-4 items-end border-b pb-4">
                            <div>
                                <Label>HSN Code</Label>
                                <Input
                                    value={item.hsn_code}
                                    onChange={(e) => handleItemChange(index, "hsn_code", e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label>Description</Label>
                                <Input
                                    value={item.description}
                                    onChange={(e) => handleItemChange(index, "description", e.target.value)}
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
                                <Label>FOB Value</Label>
                                <Input type="number" step="0.01" value={item.fob_value?.toFixed(2)} readOnly disabled />
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
                            <p className="text-sm text-muted-foreground">Total FOB</p>
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
                    {loading ? "Saving..." : mode === "create" ? "Create SB" : "Update SB"}
                </Button>
            </div>
        </form>
    );
}
