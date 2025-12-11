"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { poSchema, PurchaseOrderFormValues } from "@/lib/schemas/purchase-order";
import { useToast } from "@/components/ui/use-toast";

interface PurchaseOrderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
    onSuccess: () => void;
    vendors: any[];
    skus: any[];
    currencies: any[];
    exportOrders: any[];
}

export function PurchaseOrderDialog({
    open,
    onOpenChange,
    initialData,
    onSuccess,
    vendors,
    skus,
    currencies,
    exportOrders
}: PurchaseOrderDialogProps) {
    const { toast } = useToast();

    const form = useForm<PurchaseOrderFormValues>({
        resolver: zodResolver(poSchema) as any,
        defaultValues: {
            order_date: new Date().toISOString().split('T')[0],
            currency_code: "INR",
            status: "draft",
            items: [{ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    id: initialData.id,
                    vendor_id: initialData.vendor_id,
                    export_order_id: initialData.export_order_id || undefined,
                    currency_code: initialData.currency_code,
                    order_date: initialData.order_date ? initialData.order_date.split('T')[0] : new Date().toISOString().split('T')[0],
                    status: initialData.status,
                    items: initialData.purchase_order_items?.map((item: any) => ({
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        tax_rate: item.tax_rate
                    })) || []
                });
            } else {
                form.reset({
                    order_date: new Date().toISOString().split('T')[0],
                    currency_code: "INR",
                    status: "draft",
                    items: [{ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 }]
                });
            }
        }
    }, [open, initialData, form]);

    const handleOrderSelect = async (orderId: string) => {
        if (!orderId) return;

        try {
            const res = await fetch(`/api/orders?id=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                const order = data.order;
                if (order && order.order_items) {
                    const newItems = order.order_items.map((oi: any) => ({
                        sku_id: oi.sku_id,
                        quantity: oi.quantity,
                        unit_price: oi.unit_price,
                        tax_rate: oi.tax_rate || 0
                    }));

                    if (newItems.length > 0) {
                        form.setValue("items", newItems);
                        if (order.currency_code) form.setValue("currency_code", order.currency_code);
                        toast({ title: "Items Imported", description: `Loaded ${newItems.length} items from Export Order.` });
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch order items", e);
        }
    };

    const onSubmit = async (values: PurchaseOrderFormValues) => {
        try {
            const method = initialData ? "PUT" : "POST";
            const url = initialData ? `/api/purchase-orders?id=${initialData.id}` : "/api/purchase-orders";

            // Temporary handle for PUT as API might expect it.
            // If create-only for now, adjust. But assuming CRUD exists.

            const res = await fetch(url, {
                method: method === "PUT" ? "PUT" : "POST", // Ensure explicit method
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                onSuccess();
                onOpenChange(false);
            } else {
                const err = await res.json();
                toast({ title: "Error", description: err.error, variant: "destructive" });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => {
        const lineTotal = (Number(item.quantity || 0) * Number(item.unit_price || 0));
        const tax = lineTotal * (Number(item.tax_rate || 0) / 100);
        return sum + lineTotal + tax;
    }, 0) || 0;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit PO' : 'New Purchase Order'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="vendor_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Vendor</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Vendor" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {vendors.map(v => (
                                                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="export_order_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Link Export Order (Back-to-Back)</FormLabel>
                                        <Select onValueChange={(val) => {
                                            field.onChange(val);
                                            handleOrderSelect(val);
                                        }} value={field.value || undefined}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Sales Order" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {exportOrders.map(o => (
                                                    <SelectItem key={o.id} value={o.id}>{o.order_number}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="order_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>PO Date</FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="currency_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {currencies.map(c => (
                                                    <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0, tax_rate: 0 })}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                            </div>
                            <div className="space-y-4 max-h-[300px] overflow-y-auto p-1">
                                {fields.map((field, index) => (
                                    <Card key={field.id} className="p-4">
                                        <div className="space-y-3">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.sku_id`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs">Product / SKU</FormLabel>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <FormControl><SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger></FormControl>
                                                            <SelectContent>
                                                                {skus.map(s => (
                                                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.sku_code})</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="grid grid-cols-12 gap-3 items-end">
                                                <div className="col-span-3">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Qty</FormLabel>
                                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.unit_price`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Price</FormLabel>
                                                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.tax_rate`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel className="text-xs">Tax %</FormLabel>
                                                                <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <Button type="button" variant="ghost" size="icon" className="text-destructive h-9 w-9" onClick={() => remove(index)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end items-center gap-4 pt-4 border-t">
                            <div className="text-right">
                                <div className="text-lg font-bold">Total: {form.watch("currency_code")} {previewTotal.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">Includes Tax</div>
                            </div>
                            <Button type="submit">{initialData ? 'Update PO' : 'Create PO'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
