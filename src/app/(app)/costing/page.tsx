"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Calculator, RefreshCcw } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const costSheetSchema = z.object({
    name: z.string().min(1, "Name is required"),
    product_id: z.string().optional(),
    sku_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency is required"),
    exchange_rate: z.preprocess((val) => Number(val), z.number().min(0.0001)),
    total_cost: z.preprocess((val) => Number(val), z.number().min(0)),
    markup_percentage: z.preprocess((val) => Number(val), z.number().min(0)),
    final_price: z.number().optional(), // Calculated
});

export default function CostingPage() {
    const [sheets, setSheets] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof costSheetSchema>>({
        resolver: zodResolver(costSheetSchema),
        defaultValues: {
            name: "",
            currency_code: "USD",
            exchange_rate: 1,
            total_cost: 0,
            markup_percentage: 20, // 20% default margin
        },
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [sheetsRes, prodsRes, currRes] = await Promise.all([
                fetch("/api/cost-sheets"),
                fetch("/api/products"),
                fetch("/api/currencies")
            ]);

            const sheetsData = await sheetsRes.json();
            const prodsData = await prodsRes.json();
            const currData = await currRes.json();

            if (sheetsData.cost_sheets) setSheets(sheetsData.cost_sheets);
            if (prodsData.products) setProducts(prodsData.products);
            if (currData.currencies) setCurrencies(currData.currencies);
        } catch (err) {
            console.error(err);
        }
    };

    const onSubmit = async (values: z.infer<typeof costSheetSchema>) => {
        // Calculate final price automatically if not set
        const cost = values.total_cost || 0;
        const markup = values.markup_percentage || 0;
        const final = cost + (cost * (markup / 100));

        try {
            const res = await fetch("/api/cost-sheets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...values, final_price: final }),
            });

            if (res.ok) {
                setIsOpen(false);
                form.reset();
                fetchData();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Watch values for live calculation preview
    const watchCost = form.watch("total_cost");
    const watchMarkup = form.watch("markup_percentage");
    const watchRate = form.watch("exchange_rate");
    const watchCurrency = form.watch("currency_code");

    const previewPrice = (watchCost || 0) + ((watchCost || 0) * ((watchMarkup || 0) / 100));
    const convertedPrice = previewPrice / (watchRate || 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Cost Sheets</h1>
                    <p className="text-muted-foreground">
                        Calculate product costs and export pricing.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Cost Sheet
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>New Cost Sheet</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Sheet Name</FormLabel>
                                            <FormControl><Input placeholder="Summer 2025 Pricing" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="currency_code"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Export Currency</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select" />
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
                                    <FormField
                                        control={form.control}
                                        name="exchange_rate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Exchange Rate (to Local)</FormLabel>
                                                <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                                                <p className="text-xs text-muted-foreground">1 {watchCurrency} = {field.value} Local</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="product_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Product (Optional)</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Generic" /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="none">Generic / No Link</SelectItem>
                                                        {products.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="bg-slate-50 p-4 rounded-md space-y-4 border">
                                    <h3 className="font-semibold text-sm">Cost Components (Local Currency)</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="total_cost"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Total Cost of Goods</FormLabel>
                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="markup_percentage"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Markup %</FormLabel>
                                                    <FormControl><Input type="number" {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-sm pt-2 border-t mt-2">
                                        <span>Local Price:</span>
                                        <span className="font-bold">{previewPrice.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Export Price ({watchCurrency}):</span>
                                        <span className="font-bold text-lg text-primary">
                                            {convertedPrice.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit">Save Cost Sheet</Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {sheets.map((sheet) => (
                    <Card key={sheet.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">{sheet.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {sheet.products?.name || "Generic"}
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Cost:</span>
                                    <span>{sheet.total_cost}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Markup:</span>
                                    <span>{sheet.markup_percentage}%</span>
                                </div>
                                <div className="flex justify-between font-bold text-lg border-t pt-2 mt-2">
                                    <span>Price:</span>
                                    <span className="text-primary">
                                        {sheet.currencies?.symbol}{Number(sheet.final_price / sheet.exchange_rate).toFixed(2)}
                                    </span>
                                </div>
                                <p className="text-xs text-right text-muted-foreground">
                                    ({sheet.currency_code})
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

function Separator() {
    return <div className="h-[1px] w-full bg-border my-4" />
}
