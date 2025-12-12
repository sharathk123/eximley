"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Separator } from "@/components/ui/separator";
import { IncotermSelect } from "@/components/common/IncotermSelect";
import { orderSchema, OrderFormValues } from "@/lib/schemas/order";

interface OrderFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any; // The order object being edited or null
    buyers: any[];
    skus: any[];
    currencies: any[];
    invoices: any[]; // Proforma invoices for auto-fill
    onSubmit: (values: OrderFormValues) => Promise<void>;
}

export function OrderFormDialog({
    open,
    onOpenChange,
    initialData,
    buyers,
    skus,
    currencies,
    invoices,
    onSubmit
}: OrderFormDialogProps) {
    const defaultValues: Partial<OrderFormValues> = {
        order_date: new Date().toISOString().split('T')[0],
        currency_code: "USD",
        status: "pending",
        items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
    };

    const form = useForm<OrderFormValues>({
        resolver: zodResolver(orderSchema) as any,
        defaultValues
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                form.reset({
                    id: initialData.id,
                    buyer_id: initialData.buyer_id,
                    pi_id: initialData.pi_id || undefined,
                    currency_code: initialData.currency_code,
                    order_date: initialData.order_date.split('T')[0],
                    status: (initialData.status || 'pending') as any, // Cast to ensure it matches the enum type
                    incoterm: initialData.incoterm || undefined,
                    incoterm_place: initialData.incoterm_place || undefined,
                    items: initialData.order_items?.map((item: any) => ({
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    })) || []
                });
            } else {
                form.reset(defaultValues);
            }
        }
    }, [open, initialData, form]);

    const onPISelect = (piId: string) => {
        const pi = invoices.find(i => i.id === piId);
        if (pi) {
            form.setValue("buyer_id", pi.buyer_id);
            form.setValue("currency_code", pi.currency_code);
            form.setValue("pi_id", pi.id);

            if (pi.proforma_items) {
                const mappedItems = pi.proforma_items.map((item: any) => ({
                    sku_id: item.sku_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }));
                replace(mappedItems);
            }
        }
    };

    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    const handleSubmit = async (values: OrderFormValues) => {
        await onSubmit(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Order' : 'New Sales Order'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        {/* PI Selection Shortcut only on create */}
                        {!initialData && (
                            <div className="bg-slate-50 p-4 rounded-md border text-sm">
                                <div className="mb-2 block font-semibold text-primary">Import from Proforma Invoice</div>
                                <Select onValueChange={onPISelect}>
                                    <SelectTrigger><SelectValue placeholder="Select a PI to auto-fill..." /></SelectTrigger>
                                    <SelectContent>
                                        {invoices.map(pi => (
                                            <SelectItem key={pi.id} value={pi.id}>{pi.invoice_number} - {pi.entities?.name} ({pi.total_amount})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="buyer_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buyer <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select Buyer" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {buyers.map(b => (
                                                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="order_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Order Date <span className="text-destructive">*</span></FormLabel>
                                        <FormControl><Input type="date" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="currency_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Currency" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {currencies.map(c => (
                                                    <SelectItem key={c.code} value={c.code}>{c.code} - {c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <IncotermSelect form={form} name="incoterm" />
                            <FormField
                                control={form.control}
                                name="incoterm_place"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Incoterm Place</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Mumbai Port" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="pending">Pending</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="in_production">In Production</SelectItem>
                                            <SelectItem value="ready">Ready</SelectItem>
                                            <SelectItem value="shipped">Shipped</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                            <SelectItem value="cancelled">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="payment_method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Method</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select payment method" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="LC">LC (Letter of Credit)</SelectItem>
                                                <SelectItem value="TT">TT (Telegraphic Transfer)</SelectItem>
                                                <SelectItem value="DA">DA (Documents Against Acceptance)</SelectItem>
                                                <SelectItem value="DP">DP (Documents Against Payment)</SelectItem>
                                                <SelectItem value="CAD">CAD (Cash Against Documents)</SelectItem>
                                                <SelectItem value="Advance">Advance Payment</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="shipment_period"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Shipment Period</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Within 30 days" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <Separator />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold">Line Items</h3>
                                <Button type="button" variant="outline" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0 })}>
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                        <div className="flex gap-2 items-end">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.sku_id`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-1">
                                                        <FormLabel className="text-sm">Product/SKU <span className="text-destructive">*</span></FormLabel>
                                                        <FormControl>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                                <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                                                                <SelectContent>
                                                                    {skus.map(s => (
                                                                        <SelectItem key={s.id} value={s.id}>{s.sku_code} - {s.name}</SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="w-24">
                                                        <FormLabel className="text-sm">Qty <span className="text-destructive">*</span></FormLabel>
                                                        <FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unit_price`}
                                                render={({ field }) => (
                                                    <FormItem className="w-32">
                                                        <FormLabel className="text-sm">Price <span className="text-destructive">*</span></FormLabel>
                                                        <FormControl><Input type="number" placeholder="Price" {...field} /></FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                                                <Trash2 className="h-4 w-4 text-red-500" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end text-lg font-bold border-t pt-2">
                                Total: {watchCurrency} {previewTotal.toFixed(2)}
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            {initialData ? 'Update Order' : 'Create Order'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog >
    );
}
