"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sbSchema, ShippingBillFormValues } from "@/lib/schemas/shipping-bill";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface ShippingBillDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
    onSuccess: () => void;
    orders: any[]; // List of available orders
}

export function ShippingBillDialog({
    open,
    onOpenChange,
    initialData,
    onSuccess,
    orders
}: ShippingBillDialogProps) {
    const form = useForm<ShippingBillFormValues>({
        resolver: zodResolver(sbSchema) as any,
        defaultValues: {
            sb_number: "",
            sb_date: new Date().toISOString().split('T')[0],
            export_order_id: "",
            port_code: "",
            customs_house: "",
            fob_value: 0,
            freight_value: 0,
            insurance_value: 0,
            currency_code: "USD",
            let_export_order_number: "",
            let_export_date: "",
            notes: ""
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    id: initialData.id,
                    sb_number: initialData.sb_number,
                    sb_date: new Date(initialData.sb_date).toISOString().split('T')[0],
                    export_order_id: initialData.export_order_id,
                    port_code: initialData.port_code || "",
                    customs_house: initialData.customs_house || "",
                    fob_value: Number(initialData.fob_value),
                    freight_value: Number(initialData.freight_value || 0),
                    insurance_value: Number(initialData.insurance_value || 0),
                    currency_code: initialData.currency_code || "USD",
                    let_export_order_number: initialData.let_export_order_number || "",
                    let_export_date: initialData.let_export_date ? new Date(initialData.let_export_date).toISOString().split('T')[0] : "",
                    notes: initialData.notes || ""
                });
            } else {
                form.reset({
                    sb_number: "",
                    sb_date: new Date().toISOString().split('T')[0],
                    export_order_id: "",
                    port_code: "",
                    customs_house: "",
                    fob_value: 0,
                    freight_value: 0,
                    insurance_value: 0,
                    currency_code: "USD",
                    let_export_order_number: "",
                    let_export_date: "",
                    notes: ""
                });
            }
        }
    }, [open, initialData, form]);

    // Construct derived items for creation if needed, but the original code did it in submit handler
    // We will keep similar logic here but inside onSubmit

    const onSubmit = async (data: ShippingBillFormValues) => {
        try {
            const isEdit = !!initialData;
            const method = isEdit ? "PUT" : "POST";

            // Prepare payload
            let payload: any = { ...data };

            // If creating, we might need to attach items from the selected order
            if (!isEdit && data.export_order_id) {
                const order = orders.find(o => o.id === data.export_order_id);
                if (order && order.order_items) {
                    const items = order.order_items.map((item: any) => ({
                        hsn_code: item.skus?.hsn_code || item.skus?.products?.hsn_code || "000000",
                        description: item.skus?.name || "Item",
                        quantity: item.quantity,
                        unit: item.skus?.unit || "PCS",
                        unit_price: item.unit_price,
                        order_item_id: item.id
                    }));
                    payload.items = items;
                }
            }

            const res = await fetch("/api/shipping-bills", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Failed to save shipping bill");

            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
            // Error handling usually done via toast in parent or we could add toast here
            // But stick to props for simplicity if possible, or useToast hook
        }
    };

    const handleOrderSelect = (orderId: string) => {
        form.setValue("export_order_id", orderId);
        const order = orders.find(o => o.id === orderId);
        if (order) {
            form.setValue("fob_value", Number(order.total_amount || 0));
            form.setValue("currency_code", order.currency_code || "USD");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Shipping Bill' : 'New Shipping Bill'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name="export_order_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sales Order *</FormLabel>
                                            <Select
                                                onValueChange={handleOrderSelect}
                                                value={field.value}
                                                disabled={!!initialData} // Disable changing order on edit to prevent data mismatch
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select order" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {orders.length === 0 ? (
                                                        <div className="p-2 text-sm text-muted-foreground text-center">
                                                            No orders available
                                                        </div>
                                                    ) : (
                                                        orders.map(order => (
                                                            <SelectItem key={order.id} value={order.id}>
                                                                {order.order_number} - {order.entities?.name} ({order.currency_code} {Number(order.total_amount).toFixed(2)})
                                                            </SelectItem>
                                                        ))
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="sb_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SB Number *</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="sb_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SB Date *</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="port_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Port Code</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="e.g. INMAA1" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="customs_house"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customs House</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="fob_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>FOB Value * ({form.watch('currency_code')})</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="freight_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Freight Value</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="insurance_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Insurance Value</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="let_export_order_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>LEO Number</FormLabel>
                                        <FormControl>
                                            <Input {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="let_export_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>LEO Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">{initialData ? 'Update' : 'Create'}</Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
