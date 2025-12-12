"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, ArrowLeft, LayoutTemplate } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { IncotermSelect } from '@/components/common/IncotermSelect';
import { PortSelect } from '@/components/common/PortSelect';
import { SaveTemplateDialog } from './SaveTemplateDialog';
import { useRouter } from 'next/navigation';

const quoteSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    quote_date: z.string().min(1, "Date required"),
    valid_until: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    incoterms: z.string().optional(),
    incoterm_place: z.string().optional(),
    payment_terms: z.string().optional(),
    delivery_terms: z.string().optional(),
    notes: z.string().optional(),
    // Shipping Fields
    port_loading: z.string().optional(),
    port_discharge: z.string().optional(),
    mode_transport: z.enum(['SEA', 'AIR', 'ROAD', 'RAIL']).optional(),
    packaging_details: z.string().optional(),
    origin_country: z.string().optional(),
    estimated_delivery: z.string().optional(),
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

type QuoteFormValues = z.infer<typeof quoteSchema>;

interface QuoteFormProps {
    initialData?: any;
    initialValues?: any;
    mode: 'create' | 'edit';
}

export function QuoteForm({ initialData, initialValues, mode }: QuoteFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);

    // Default values logic
    const defaultValues = {
        buyer_id: "",
        quote_date: new Date().toISOString().split('T')[0],
        valid_until: "",
        currency_code: "USD",
        incoterms: "",
        incoterm_place: "",
        payment_terms: "",
        delivery_terms: "",
        notes: "",
        port_loading: "",
        port_discharge: "",
        mode_transport: undefined,
        packaging_details: "",
        origin_country: "India",
        estimated_delivery: "",
        items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
    };

    const form = useForm<QuoteFormValues>({
        resolver: zodResolver(quoteSchema) as any,
        defaultValues,
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchFormData();
    }, []);

    useEffect(() => {
        if (initialData) {
            // Mapping initialData (quote edit)
            const formattedItems = (initialData.items || initialData.enquiry_items || []).map((item: any) => ({
                id: item.id,
                sku_id: item.sku_id || '',
                product_name: item.product_name || '',
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                unit_price: Number(item.unit_price) || 0,
                discount_percent: Number(item.discount_percent) || 0,
                tax_percent: Number(item.tax_percent) || 0,
            }));

            // If no items, ensure at least one
            if (formattedItems.length === 0) {
                formattedItems.push({ sku_id: "", quantity: 1, unit_price: 0 });
            }

            form.reset({
                buyer_id: initialData.buyer_id || '',
                quote_date: initialData.quote_date ? new Date(initialData.quote_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                valid_until: initialData.valid_until ? new Date(initialData.valid_until).toISOString().split('T')[0] : '',
                currency_code: initialData.currency_code || 'USD',
                incoterms: initialData.incoterms || '',
                incoterm_place: initialData.incoterm_place || '',
                payment_terms: initialData.payment_terms || '',
                delivery_terms: initialData.delivery_terms || '',
                notes: initialData.notes || '',
                port_loading: initialData.port_loading || '',
                port_discharge: initialData.port_discharge || '',
                mode_transport: initialData.mode_transport || undefined,
                packaging_details: initialData.packaging_details || '',
                origin_country: initialData.origin_country || 'India',
                estimated_delivery: initialData.estimated_delivery || '',
                items: formattedItems
            });
        } else if (initialValues) {
            // Apply template values
            form.reset({
                ...defaultValues,
                ...initialValues,
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
        }
    }, [initialData, initialValues, form]);

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

    async function onSubmit(values: z.infer<typeof quoteSchema>) {
        setLoading(true);
        try {
            const url = "/api/quotes";
            const method = mode === 'edit' ? "PUT" : "POST";
            const body = mode === 'edit' ? { ...values, id: initialData.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Failed to ${mode} quote`);
            }

            toast({
                title: "Success",
                description: `Quote ${mode === 'edit' ? "updated" : "created"} successfully`
            });

            router.push('/quotes');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || `Failed to ${mode} quote`,
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

        items.forEach((item: any) => {
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

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === 'edit' && initialData ? `Edit Quote: ${initialData.quote_number}` : "Create New Quote"}
                    </h1>
                    <p className="text-muted-foreground">
                        {mode === 'edit' ? "Update quote details and items." : "Enter details to create a new quote."}
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    {/* Section 1: Client & Basic Info */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Client & Reference</CardTitle>
                            <CardDescription>Buyer details and validity.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="buyer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Buyer <span className="text-destructive">*</span></FormLabel>
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
                                            <FormLabel>Quote Date <span className="text-destructive">*</span></FormLabel>
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
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField
                                    control={form.control}
                                    name="currency_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 2: Terms & Logistics */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Terms & Logistics</CardTitle>
                            <CardDescription>Delivery, payment, and transport details.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                            </div>

                            <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted-foreground/20">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField
                                        control={form.control}
                                        name="mode_transport"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Transport Mode</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Mode" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="SEA">Sea Freight</SelectItem>
                                                        <SelectItem value="AIR">Air Freight</SelectItem>
                                                        <SelectItem value="ROAD">Road Transport</SelectItem>
                                                        <SelectItem value="RAIL">Rail Transport</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="origin_country"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country of Origin</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. India" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="port_loading"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Port of Loading (POL)</FormLabel>
                                                <FormControl>
                                                    <PortSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        mode={form.watch('mode_transport') as any}
                                                        placeholder="Search Origin Port"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="port_discharge"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Port of Discharge (POD)</FormLabel>
                                                <FormControl>
                                                    <PortSelect
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        mode={form.watch('mode_transport') as any}
                                                        placeholder="Search Dest. Port"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="col-span-1 md:col-span-2">
                                        <FormField
                                            control={form.control}
                                            name="packaging_details"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Packaging Details</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. 20 Pallets, Standard Seaworthy Packing" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section 3: Items */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Line Items</CardTitle>
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
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-card/50">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
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
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:bg-destructive/10 mt-8"
                                            onClick={() => remove(index)}
                                            disabled={fields.length === 1}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Qty</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.unit_price`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Price</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`items.${index}.discount_percent`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Disc %</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" step="0.1" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex flex-col justify-end pb-2">
                                            <div className="text-right text-sm text-muted-foreground">Total</div>
                                            <div className="text-right font-semibold text-lg">
                                                {form.watch('currency_code') || 'USD'} {calculateItemTotal(index).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.description`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs text-muted-foreground">Description (Optional)</FormLabel>
                                                <FormControl>
                                                    <Textarea rows={1} className="min-h-[40px] resize-none" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Section 4: Totals & Notes */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Notes / Terms</FormLabel>
                                            <FormControl>
                                                <Textarea rows={4} placeholder="Add any additional notes or terms here..." {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="bg-muted/10 rounded-lg p-6 space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Subtotal</span>
                                        <span className="font-medium">{form.watch('currency_code') || 'USD'} {totals.subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="text-green-600">- {form.watch('currency_code') || 'USD'} {totals.discount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tax</span>
                                        <span className="font-medium">{form.watch('currency_code') || 'USD'} {totals.tax.toFixed(2)}</span>
                                    </div>
                                    <div className="border-t pt-3 mt-2 flex justify-between items-center">
                                        <span className="font-bold text-lg">Total</span>
                                        <span className="font-bold text-xl text-primary">{form.watch('currency_code') || 'USD'} {totals.total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 border rounded-lg shadow-lg z-10">
                        <Button type="button" variant="outline" onClick={() => setIsSaveTemplateOpen(true)} className="mr-auto">
                            <LayoutTemplate className="w-4 h-4 mr-2" />
                            Save Template
                        </Button>
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[120px]">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                mode === 'edit' ? 'Update Quote' : 'Create Quote'
                            )}
                        </Button>
                    </div>
                </form>
            </Form>

            <SaveTemplateDialog
                open={isSaveTemplateOpen}
                onOpenChange={setIsSaveTemplateOpen}
                templateData={{
                    ...form.getValues(),
                    status: 'draft'
                }}
            />
        </div>
    );
}
