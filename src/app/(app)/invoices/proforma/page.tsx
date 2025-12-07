"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, FileText, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

const invoiceSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    currency_code: z.string().min(1, "Currency required"),
    date: z.string().min(1, "Date required"),
    conversion_rate: z.coerce.number().min(0.0001),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
    })).min(1, "At least one item required"),
});

export default function ProformaPage() {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof invoiceSchema>>({
        resolver: zodResolver(invoiceSchema) as any,
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            currency_code: "USD",
            conversion_rate: 1,
            items: [{ sku_id: "", quantity: 1, unit_price: 0 }]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [invRes, entRes, skuRes, currRes] = await Promise.all([
                fetch("/api/invoices/proforma"),
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies")
            ]);

            const invData = await invRes.json();
            const entData = await entRes.json();
            const skuData = await skuRes.json();
            const currData = await currRes.json();

            if (invData.invoices) setInvoices(invData.invoices);
            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);

        } catch (err) {
            console.error(err);
        }
    };

    const onSubmit = async (values: z.infer<typeof invoiceSchema>) => {
        try {
            const res = await fetch("/api/invoices/proforma", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                form.reset();
                fetchData();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Calculate dynamic total for preview
    const watchItems = form.watch("items");
    const previewTotal = watchItems?.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0) || 0;
    const watchCurrency = form.watch("currency_code");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Proforma Invoices</h1>
                    <p className="text-muted-foreground">
                        Create quotes and PIs for your buyers.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>New Proforma Invoice</DialogTitle>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
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

                                <Button type="submit" className="w-full">Create Invoice</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Buyer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No invoices found.</TableCell></TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                    <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                                    <TableCell>{inv.entities?.name || 'Unknown'}</TableCell>
                                    <TableCell>{inv.currency_code} {inv.total_amount}</TableCell>
                                    <TableCell className="capitalize">{inv.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon">
                                            <Download className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
