"use client";

import { useEffect, useState } from "react";
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
    FormDescription,
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
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { invoiceSchema, InvoiceFormValues } from "@/lib/schemas/invoice";

interface ProformaDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: any;
    onSuccess: () => void;
    buyers: any[];
    skus: any[];
    currencies: any[];
    luts: any[];
}

export function ProformaDialog({
    open,
    onOpenChange,
    initialData,
    onSuccess,
    buyers,
    skus,
    currencies,
    luts
}: ProformaDialogProps) {
    const form = useForm<InvoiceFormValues>({
        resolver: zodResolver(invoiceSchema) as any,
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            conversion_rate: 1,
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }],
            lut_id: ""
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
                    buyer_id: initialData.buyer_id,
                    currency_code: initialData.currency_code,
                    date: initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
                    conversion_rate: initialData.conversion_rate,
                    lut_id: initialData.lut_id || "",
                    items: initialData.proforma_items.map((item: any) => ({
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price
                    }))
                });
            } else {
                form.reset({
                    date: new Date().toISOString().split('T')[0],
                    currency_code: "USD",
                    conversion_rate: 1,
                    items: [{ sku_id: "", quantity: 1, unit_price: 0 }],
                    lut_id: ""
                });
            }
        }
    }, [open, initialData, form]);

    const onSubmit = async (values: InvoiceFormValues) => {
        try {
            const method = initialData ? "PUT" : "POST";
            const res = await fetch("/api/invoices/proforma", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                onSuccess();
                onOpenChange(false);
            } else {
                const err = await res.json();
                console.error(err);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Proforma Invoice' : 'New Proforma Invoice'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="buyer_id"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buyer</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
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
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Date</FormLabel>
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
                                        <FormLabel>Currency</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
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
                            <FormField
                                control={form.control}
                                name="conversion_rate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Exchange Rate (to Local)</FormLabel>
                                        <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="lut_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Letter of Undertaking (LUT)</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || " "}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select active LUT for zero-rated export" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value=" ">None (IGST Paid)</SelectItem>
                                            {luts.map(lut => (
                                                <SelectItem key={lut.id} value={lut.id}>
                                                    {lut.lut_number} (FY {lut.financial_year})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription className="text-xs text-muted-foreground">
                                        Select LUT to export without paying IGST. Leave empty if paying IGST.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

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
                                    <div key={field.id} className="flex gap-2 items-end">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.sku_id`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormControl>
                                                        <Select onValueChange={field.onChange} value={field.value}>
                                                            <SelectTrigger><SelectValue placeholder="Select SKU" /></SelectTrigger>
                                                            <SelectContent>
                                                                {skus.map(s => (
                                                                    <SelectItem key={s.id} value={s.id}>{s.sku_code} - {s.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem className="w-24">
                                                    <FormControl><Input type="number" placeholder="Qty" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.unit_price`}
                                            render={({ field }) => (
                                                <FormItem className="w-32">
                                                    <FormControl><Input type="number" placeholder="Price" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end text-lg font-bold border-t pt-2">
                                Total: {watchCurrency} {previewTotal.toFixed(2)}
                            </div>
                        </div>

                        <Button type="submit" className="w-full">
                            {initialData ? 'Update Invoice' : 'Create Invoice'}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
