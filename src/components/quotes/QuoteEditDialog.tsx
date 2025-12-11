"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IncotermSelect } from '@/components/common/IncotermSelect';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { LayoutTemplate } from 'lucide-react';

const quoteEditSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    quote_date: z.string().min(1, "Date required"),
    valid_until: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    incoterms: z.string().optional(),
    incoterm_place: z.string().optional(),
    payment_terms: z.string().optional(),
    delivery_terms: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        sku_id: z.string().min(1, "SKU required"),
        product_name: z.string().optional(),
        description: z.string().optional(),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0.01),
        discount_percent: z.coerce.number().min(0).max(100).optional(),
        tax_percent: z.coerce.number().min(0).max(100).optional(),
    })).min(1, "At least one item required"),
});

interface QuoteEditDialogProps {
    quote: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    initialValues?: any;
}


type QuoteFormValues = z.infer<typeof quoteEditSchema>;

export function QuoteEditDialog({ quote, open, onOpenChange, onSuccess, initialValues }: QuoteEditDialogProps) {
    const [loading, setLoading] = useState(false);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteEditSchema) as any,
        defaultValues: {
            buyer_id: "",
            quote_date: new Date().toISOString().split('T')[0],
            valid_until: "",
            currency_code: "USD",
            incoterms: "",
            payment_terms: "",
            delivery_terms: "",
            notes: "",
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        if (open) {
            fetchFormData();
            if (quote) {
                loadQuoteData();
            } else if (initialValues) {
                form.reset({
                    ...form.getValues(), // Keep defaults
                    ...initialValues,
                    // Ensure Items are formatted correctly if passed
                    items: initialValues.items?.map((item: any) => ({
                        sku_id: item.sku_id || "",
                        product_name: item.product_name || "",
                        description: item.description || "",
                        quantity: Number(item.quantity) || 1,
                        unit_price: Number(item.unit_price) || 0,
                        discount_percent: Number(item.discount_percent) || 0,
                        tax_percent: Number(item.tax_percent) || 0,
                    })) || [{ sku_id: "", quantity: 1, unit_price: 0 }]
                });
            } else {
                form.reset({
                    buyer_id: "",
                    quote_date: new Date().toISOString().split('T')[0],
                    valid_until: "",
                    currency_code: "USD",
                    incoterms: "",
                    payment_terms: "",
                    delivery_terms: "",
                    notes: "",
                    items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
                });
            }
        }
    }, [open, quote, initialValues]); // Removed form from dep array to avoid loops

    async function fetchFormData() {
        try {
            const [entRes, skuRes, currRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies")
            ]);
            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();

            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
        } catch (err) {
            console.error(err);
        }
    }

    async function loadQuoteData() {
        if (!quote) return;

        try {
            // Fetch quote items
            const res = await fetch(`/api/quotes/${quote.id}/items`);
            if (!res.ok) throw new Error("Failed to fetch items");

            const data = await res.json();
            const items = data.items || [];

            // Map items for form with explicit number casting
            const formattedItems = items.length > 0
                ? items.map((item: any) => ({
                    id: item.id,
                    sku_id: item.sku_id || '',
                    product_name: item.product_name || '',
                    description: item.description || '',
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.unit_price) || 0,
                    discount_percent: Number(item.discount_percent) || 0,
                    tax_percent: Number(item.tax_percent) || 0,
                }))
                : [{ sku_id: "", quantity: 1, unit_price: 0 }];

            // Reset form with ALL data at once
            form.reset({
                buyer_id: quote.buyer_id || '',
                quote_date: quote.quote_date ? new Date(quote.quote_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                valid_until: quote.valid_until ? new Date(quote.valid_until).toISOString().split('T')[0] : '',
                currency_code: quote.currency_code || 'USD',
                incoterms: quote.incoterms || '',
                incoterm_place: quote.incoterm_place || '',
                payment_terms: quote.payment_terms || '',
                delivery_terms: quote.delivery_terms || '',
                notes: quote.notes || '',
                items: formattedItems
            });
        } catch (error) {
            console.error("Error loading quote data:", error);
            toast({
                title: "Error",
                description: "Failed to load quote items",
                variant: "destructive"
            });
        }
    }

    async function onSubmit(values: z.infer<typeof quoteEditSchema>) {
        setLoading(true);
        try {
            const url = "/api/quotes";
            const method = quote ? "PUT" : "POST";
            const body = quote ? { ...values, id: quote.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Failed to ${quote ? "update" : "create"} quote`);
            }

            toast({
                title: "Success",
                description: `Quote ${quote ? "updated" : "created"} successfully`
            });

            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || `Failed to ${quote ? "update" : "create"} quote`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }

    const calculateItemTotal = (index: number) => {
        const item = form.watch(`items.${index}`);
        if (!item) return 0;

        const subtotal = (item.quantity || 0) * (item.unit_price || 0);
        const discount = subtotal * ((item.discount_percent || 0) / 100);
        const afterDiscount = subtotal - discount;
        const tax = afterDiscount * ((item.tax_percent || 0) / 100);
        return afterDiscount + tax;
    };

    const calculateTotals = () => {
        const items = form.watch('items') || [];
        let subtotal = 0;
        let totalDiscount = 0;
        let totalTax = 0;

        items.forEach((item: any, index: number) => {
            const itemSubtotal = (item.quantity || 0) * (item.unit_price || 0);
            const discount = itemSubtotal * ((item.discount_percent || 0) / 100);
            const afterDiscount = itemSubtotal - discount;
            const tax = afterDiscount * ((item.tax_percent || 0) / 100);

            subtotal += itemSubtotal;
            totalDiscount += discount;
            totalTax += tax;
        });

        return {
            subtotal,
            discount: totalDiscount,
            tax: totalTax,
            total: subtotal - totalDiscount + totalTax
        };
    };

    const totals = calculateTotals();

    if (!quote && !initialValues) return null; // Only return null if it's a new quote and no initial values are provided

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>{quote ? `Edit Quote: ${quote.quote_number}` : "Create New Quote"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Quote Details */}
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="buyer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Buyer</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Buyer" />
                                                    </SelectTrigger>
                                                </FormControl>
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
                                    name="quote_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Quote Date</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="valid_until"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Valid Until</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} />
                                            </FormControl>
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
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Currency" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {currencies.map(c => (
                                                        <SelectItem key={c.code} value={c.code}>
                                                            {c.code} - {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <IncotermSelect form={form} name="incoterms" />

                                <FormField
                                    control={form.control}
                                    name="incoterm_place"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Incoterm Place</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., New York Port" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="payment_terms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Payment Terms</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., Net 30 days" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="delivery_terms"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Delivery Terms</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g., FOB" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold">Items</h4>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => append({
                                            sku_id: "",
                                            quantity: 1,
                                            unit_price: 0,
                                            discount_percent: 0,
                                            tax_percent: 0
                                        })}
                                    >
                                        <Plus className="h-4 w-4 mr-2" /> Add Item
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="border rounded-lg p-4 space-y-3">
                                            <div className="grid grid-cols-12 gap-3">
                                                <div className="col-span-4">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.sku_id`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Product</FormLabel>
                                                                <Select onValueChange={field.onChange} value={field.value}>
                                                                    <FormControl>
                                                                        <SelectTrigger>
                                                                            <SelectValue placeholder="Select Product" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {skus.map(s => (
                                                                            <SelectItem key={s.id} value={s.id}>
                                                                                {s.name} ({s.sku_code})
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.quantity`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Qty</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        {...field}
                                                                        onChange={e => field.onChange(Number(e.target.value))}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.unit_price`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Price</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.01"
                                                                        {...field}
                                                                        onChange={e => field.onChange(Number(e.target.value))}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="col-span-2">
                                                    <FormField
                                                        control={form.control}
                                                        name={`items.${index}.discount_percent`}
                                                        render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Disc %</FormLabel>
                                                                <FormControl>
                                                                    <Input
                                                                        type="number"
                                                                        step="0.1"
                                                                        {...field}
                                                                        onChange={e => field.onChange(Number(e.target.value))}
                                                                    />
                                                                </FormControl>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )}
                                                    />
                                                </div>

                                                <div className="col-span-1 flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => remove(index)}
                                                        disabled={fields.length === 1}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.description`}
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Description (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Textarea rows={2} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <div className="text-sm text-right font-medium">
                                                Item Total: {form.watch('currency_code') || 'USD'} {calculateItemTotal(index).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Totals */}
                            <div className="border-t pt-4">
                                <div className="flex justify-end">
                                    <div className="w-64 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Subtotal:</span>
                                            <span>{form.watch('currency_code') || 'USD'} {totals.subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Discount:</span>
                                            <span>- {form.watch('currency_code') || 'USD'} {totals.discount.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span>Tax:</span>
                                            <span>{form.watch('currency_code') || 'USD'} {totals.tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                                            <span>Total:</span>
                                            <span>{form.watch('currency_code') || 'USD'} {totals.total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            <FormField
                                control={form.control}
                                name="notes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea rows={3} {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Sticky Footer */}
                        <div className="p-4 border-t bg-background flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsSaveTemplateOpen(true)}>
                                <LayoutTemplate className="w-4 h-4 mr-2" />
                                Save as Template
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={loading}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>

            <SaveTemplateDialog
                open={isSaveTemplateOpen}
                onOpenChange={setIsSaveTemplateOpen}
                templateData={{
                    ...form.getValues(),
                    status: 'draft'
                }}
            />
        </Dialog>
    );
}
