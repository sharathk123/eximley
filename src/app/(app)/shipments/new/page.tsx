"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation"; // Correct import for App Router
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

const shipmentSchema = z.object({
    reference_no: z.string().min(1, "Reference number is required"),
    type: z.enum(["import", "export"]),
    buyer_name: z.string().min(1, "Buyer/Supplier name is required"),
    incoterm: z.string().optional(),
});


type ShipmentFormValues = z.infer<typeof shipmentSchema>;

export default function NewShipmentPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [incoterms, setIncoterms] = useState<any[]>([]);

    const [entities, setEntities] = useState<any[]>([]);

    useEffect(() => {
        // Fetch Incoterms
        fetch("/api/incoterms")
            .then(res => res.json())
            .then(data => {
                if (data.incoterms) setIncoterms(data.incoterms);
            })
            .catch(console.error);

        // Fetch Entities (Buyers/Suppliers)
        fetch("/api/entities")
            .then(res => res.json())
            .then(data => {
                if (data.entities) setEntities(data.entities);
            })
            .catch(console.error);
    }, []);

    const form = useForm<ShipmentFormValues>({
        resolver: zodResolver(shipmentSchema) as any,
        defaultValues: {
            reference_no: "",
            type: "export",
            buyer_name: "",
            incoterm: "",
        },
    });

    async function onSubmit(values: z.infer<typeof shipmentSchema>) {
        setLoading(true);
        setError("");

        try {
            const response = await fetch("/api/shipments/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create shipment");
            }

            router.push(`/shipments/${data.id}`);
            router.refresh();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link href="/shipments" className="flex items-center text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Shipments
            </Link>

            <Card>
                <CardHeader>
                    <CardTitle>Create New Shipment</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="export">Export</SelectItem>
                                                    <SelectItem value="import">Import</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="reference_no"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Reference No</FormLabel>
                                            <FormControl>
                                                <Input placeholder="EXP-2024-001" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="buyer_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Buyer / Supplier Name</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select or type..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {entities.map((entity: any) => (
                                                    <SelectItem key={entity.id} value={entity.name}>
                                                        {entity.name}
                                                        {entity.verification_status === 'verified' ? ' (Verified)' : ''}
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value="Other">Other (Manual Input)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {/* Fallback for Manual Input if needed, or keeping it simple for now */}
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="incoterm"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Incoterm (Optional)</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Incoterm" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Other">Other (Manual Input)</SelectItem>
                                                {incoterms.map((term: any) => (
                                                    <SelectItem key={term.id} value={term.code}>
                                                        {term.code} - {term.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {error && (
                                <div className="text-sm text-red-500 font-medium">{error}</div>
                            )}

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create Draft Shipment"
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
