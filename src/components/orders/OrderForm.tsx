"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";

interface OrderFormProps {
    initialData?: any;
    mode: "create" | "edit";
}

export function OrderForm({ initialData, mode }: OrderFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [invoices, setInvoices] = useState<any[]>([]);

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
        fetchFormData();
        if (initialData) {
            form.reset({
                id: initialData.id,
                buyer_id: initialData.buyer_id,
                pi_id: initialData.pi_id || undefined,
                currency_code: initialData.currency_code,
                order_date: initialData.order_date.split('T')[0],
                status: (initialData.status || 'pending') as any,
                incoterm: initialData.incoterm || undefined,
                incoterm_place: initialData.incoterm_place || undefined,
                payment_method: initialData.payment_method || undefined,
                shipment_period: initialData.shipment_period || undefined,
                items: initialData.order_items?.map((item: any) => ({
                    sku_id: item.sku_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                })) || []
            });
        }
    }, [initialData]);

    const fetchFormData = async () => {
        try {
            const [entRes, skuRes, currRes, piRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/invoices/proforma")
            ]);

            if (entRes.ok) setBuyers((await entRes.json()).entities || []);
            if (skuRes.ok) setSkus((await skuRes.json()).skus || []);
            if (currRes.ok) setCurrencies((await currRes.json()).currencies || []);
            if (piRes.ok) setInvoices((await piRes.json()).invoices || []);
        } catch (err) {
            console.error(err);
        }
    };

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

    const handleSubmit = async (values: OrderFormValues) => {
        setLoading(true);
        try {
            const method = mode === "edit" ? "PUT" : "POST";
            const res = await fetch("/api/orders", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save order");
            }

            const data = await res.json();
            toast({
                title: "Success",
                description: `Order ${mode === "create" ? "created" : "updated"} successfully`,
            });

            router.push(`/orders/${mode === "create" ? data.order.id : initialData.id}`);
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

    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold">
                    {mode === "create" ? "Create Export Order" : "Edit Export Order"}
                </h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    {mode === "create" && invoices.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Import from Proforma Invoice</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select onValueChange={onPISelect}>
                                    <SelectTrigger><SelectValue placeholder="Select a PI to auto-fill..." /></SelectTrigger>
                                    <SelectContent>
                                        {invoices.map(pi => (
                                            <SelectItem key={pi.id} value={pi.id}>{pi.invoice_number} - {pi.entities?.name} ({pi.total_amount})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Order Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="buyer_id"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Buyer <span className="text-destructive">*</span></FormLabel>
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

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="currency_code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select Currency" /></SelectTrigger></FormControl>
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
                                            <FormControl><Input placeholder="e.g. Mumbai Port" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
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
                                            <FormControl><Input placeholder="e.g. Within 30 days" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Line Items</CardTitle>
                            <Button type="button" size="sm" onClick={() => append({ sku_id: "", quantity: 1, unit_price: 0 })}>
                                <Plus className="mr-2 h-4 w-4" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-4 gap-4 items-end border-b pb-4">
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.sku_id`}
                                        render={({ field }) => (
                                            <FormItem className="col-span-2">
                                                <FormLabel>Product/SKU *</FormLabel>
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
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.quantity`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Quantity *</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name={`items.${index}.unit_price`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Price *</FormLabel>
                                                <FormControl><Input type="number" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex justify-end">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total</p>
                                    <p className="text-2xl font-bold">{watchCurrency} {previewTotal.toFixed(2)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : mode === "create" ? "Create Order" : "Update Order"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
