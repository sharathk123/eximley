"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useRouter } from "next/navigation";

const countries = [
    { id: 1, name: "India", phone_code: "+91", flag_emoji: "🇮🇳", code: "IN" },
    { id: 2, name: "USA", phone_code: "+1", flag_emoji: "🇺🇸", code: "US" },
    { id: 3, name: "UK", phone_code: "+44", flag_emoji: "🇬🇧", code: "GB" },
    { id: 4, name: "UAE", phone_code: "+971", flag_emoji: "🇦🇪", code: "AE" },
    { id: 5, name: "Canada", phone_code: "+1", flag_emoji: "🇨🇦", code: "CA" },
    { id: 6, name: "Australia", phone_code: "+61", flag_emoji: "🇦🇺", code: "AU" },
    { id: 7, name: "Germany", phone_code: "+49", flag_emoji: "🇩🇪", code: "DE" },
    { id: 8, name: "France", phone_code: "+33", flag_emoji: "🇫🇷", code: "FR" },
    { id: 9, name: "China", phone_code: "+86", flag_emoji: "🇨🇳", code: "CN" },
    { id: 10, name: "Japan", phone_code: "+81", flag_emoji: "🇯🇵", code: "JP" },
];

const itemSchema = z.object({
    sku_id: z.string().min(1, "Product/SKU is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    target_price: z.coerce.number().optional(),
    notes: z.string().optional(),
});

const enquirySchema = z.object({
    customer_name: z.string().min(1, "Customer name is required"),
    customer_email: z.string().min(1, "Email is required").email("Invalid email address"),
    customer_phone: z.string().min(1, "Phone is required"),
    customer_company: z.string().optional(),
    customer_country: z.string().optional(),
    currency_code: z.string().optional(),
    source: z.enum(["website", "referral", "trade_show", "social_media", "email", "phone", "other"]),
    subject: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    next_follow_up_date: z.string().optional(),
    items: z.array(itemSchema).min(1, "At least one product is required"),
});

type EnquiryFormValues = z.infer<typeof enquirySchema>;

interface EnquiryFormProps {
    enquiry?: any;
}

export function EnquiryForm({ enquiry }: EnquiryFormProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [skus, setSkus] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const form = useForm<EnquiryFormValues>({
        resolver: zodResolver(enquirySchema) as any,
        defaultValues: {
            customer_name: enquiry?.customer_name || "",
            customer_email: enquiry?.email || "",
            customer_phone: enquiry?.phone || "+91 ",
            customer_company: enquiry?.customer_company || "",
            customer_country: enquiry?.customer_country || "",
            currency_code: enquiry?.currency_code || "USD",
            source: enquiry?.source || "website",
            subject: enquiry?.subject || "",
            description: enquiry?.description || "",
            priority: enquiry?.priority || "medium",
            next_follow_up_date: enquiry?.next_follow_up_date || "",
            items: enquiry?.enquiry_items?.map((item: any) => ({
                sku_id: item.sku_id,
                quantity: item.quantity,
                target_price: item.target_price,
                notes: item.notes
            })) || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    useEffect(() => {
        fetchSkus();
    }, []);

    async function fetchSkus() {
        try {
            const res = await fetch("/api/skus");
            const data = await res.json();
            if (data.skus) setSkus(data.skus);
        } catch (error) {
            console.error("Failed to fetch SKUs", error);
        }
    }

    async function onSubmit(values: z.infer<typeof enquirySchema>) {
        try {
            setLoading(true);
            const endpoint = enquiry ? "/api/enquiries" : "/api/enquiries";
            const method = enquiry ? "PUT" : "POST";
            const body = enquiry ? { ...values, id: enquiry.id } : values;

            const res = await fetch(endpoint, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save enquiry");
            }

            toast({ title: "Success", description: "Enquiry saved successfully" });
            router.push("/enquiries");
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{enquiry ? `Edit Enquiry: ${enquiry.enquiry_number}` : "Create New Enquiry"}</h1>
                    <p className="text-muted-foreground">{enquiry ? "Update enquiry details and items." : "Enter details to create a new enquiry."}</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" autoComplete="off">

                    <Card>
                        <CardHeader>
                            <CardTitle>Customer Information</CardTitle>
                            <CardDescription>Contact details for this enquiry.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="customer_name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Customer Name <span className="text-destructive">*</span></FormLabel>
                                        <FormControl><Input placeholder="John Doe" {...field} autoComplete="off" data-lpignore="true" required /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="customer_company" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Company <span className="text-muted-foreground">(Optional)</span></FormLabel>
                                        <FormControl><Input placeholder="Acme Corp" {...field} autoComplete="off" data-lpignore="true" /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="customer_email" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                                        <FormControl><Input placeholder="john@example.com" {...field} autoComplete="new-password" data-lpignore="true" required /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="customer_phone" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                                        <div className="flex gap-2">
                                            <Select
                                                value={field.value?.split(' ')[0] || ""}
                                                onValueChange={(val) => {
                                                    const currentNumber = field.value?.split(' ')[1] || "";
                                                    field.onChange(`${val} ${currentNumber}`);
                                                }}
                                            >
                                                <SelectTrigger className="w-[100px]">
                                                    <SelectValue placeholder="Code" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {countries.reduce((acc: any[], current) => {
                                                        const x = acc.find(item => item.phone_code === current.phone_code);
                                                        if (!x) return acc.concat([current]);
                                                        return acc;
                                                    }, []).map((c) => (
                                                        <SelectItem key={c.id} value={c.phone_code}>
                                                            <span className="mr-2">{c.flag_emoji}</span>
                                                            {c.phone_code}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormControl>
                                                <Input
                                                    placeholder="1234567890"
                                                    autoComplete="off"
                                                    data-lpignore="true"
                                                    value={field.value?.split(' ')[1] || field.value?.replace(/^\+[\d]+\s/, '') || ""}
                                                    onChange={(e) => {
                                                        const code = field.value?.split(' ')[0] || "+91";
                                                        field.onChange(`${code} ${e.target.value}`);
                                                    }}
                                                    required
                                                />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Enquiry Details</CardTitle>
                            <CardDescription>Source, priority, and metadata.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormField control={form.control} name="source" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Source</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select source" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="website">Website</SelectItem>
                                                <SelectItem value="email">Email</SelectItem>
                                                <SelectItem value="phone">Phone</SelectItem>
                                                <SelectItem value="referral">Referral</SelectItem>
                                                <SelectItem value="trade_show">Trade Show</SelectItem>
                                                <SelectItem value="social_media">Social Media</SelectItem>
                                                <SelectItem value="other">Other</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="priority" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="low">Low</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="high">High</SelectItem>
                                                <SelectItem value="urgent">Urgent</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="next_follow_up_date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Next Follow-up</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => field.onChange(date ? date.toISOString() : "")}
                                                    disabled={(date) =>
                                                        date < new Date(new Date().setHours(0, 0, 0, 0))
                                                    }
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>

                            <FormField control={form.control} name="subject" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl><Input placeholder="Enquiry Subject" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description / Notes</FormLabel>
                                    <FormControl><Textarea placeholder="Details..." className="min-h-[100px]" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Interested Products</CardTitle>
                                <CardDescription>Add products requested by the customer.</CardDescription>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ sku_id: "", quantity: 1, target_price: 0, notes: "" })}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Product
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md overflow-hidden">
                                <Table className="table-fixed">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[35%]">Product <span className="text-destructive">*</span></TableHead>
                                            <TableHead className="w-[15%]">Qty <span className="text-destructive">*</span></TableHead>
                                            <TableHead className="w-[20%]">Target Price</TableHead>
                                            <TableHead className="w-[25%]">Notes</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                                    No products added yet. Click "Add Product" to start.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            fields.map((field, index) => (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.sku_id`}
                                                            render={({ field: skuField }) => (
                                                                <FormItem>
                                                                    <Select onValueChange={skuField.onChange} defaultValue={skuField.value} value={skuField.value}>
                                                                        <FormControl>
                                                                            <SelectTrigger className="w-full [&>span]:truncate">
                                                                                <SelectValue placeholder="Select Product" />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent>
                                                                            {skus.map((sku) => (
                                                                                <SelectItem key={sku.id} value={sku.id}>
                                                                                    {sku.name}
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.quantity`}
                                                            render={({ field: qtyField }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input type="number" min="1" {...qtyField} />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.target_price`}
                                                            render={({ field: priceField }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <div className="relative">
                                                                            <span className="absolute left-2 top-2.5 text-muted-foreground">$</span>
                                                                            <Input type="number" className="pl-6" {...priceField} />
                                                                        </div>
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField
                                                            control={form.control}
                                                            name={`items.${index}.notes`}
                                                            render={({ field: notesField }) => (
                                                                <FormItem>
                                                                    <FormControl>
                                                                        <Input placeholder="Specs..." {...notesField} />
                                                                    </FormControl>
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {enquiry ? "Update Enquiry" : "Create Enquiry"}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
