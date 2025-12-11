"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { IncotermSelect } from "@/components/common/IncotermSelect";
import { Loader2, Plus } from "lucide-react";

import { shipmentSchema, ShipmentFormValues } from "@/lib/schemas/shipment";
import { useToast } from "@/components/ui/use-toast";

interface Order {
    id: string;
    order_number: string;
    entities: { name: string } | null;
}

interface ShippableItem {
    id: string; // Order Item ID
    product_id: string;
    products: { name: string };
    skus: { sku_code: string; name: string } | null;
    quantity: number;
    shipped_quantity: number;
    remaining_quantity: number;
}

interface ShipmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orders: Order[];
    initialOrderId?: string | null;
    onSuccess: () => void;
}

export function ShipmentDialog({
    open,
    onOpenChange,
    orders,
    initialOrderId,
    onSuccess
}: ShipmentDialogProps) {
    const { toast } = useToast();
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [shippableItems, setShippableItems] = useState<ShippableItem[]>([]);
    const [isFetchingItems, setIsFetchingItems] = useState(false);

    const form = useForm<ShipmentFormValues>({
        resolver: zodResolver(shipmentSchema) as any,
        defaultValues: {
            order_id: "",
            items: [],
            container_numbers: "",
            shipment_date: new Date().toISOString().split('T')[0],
            carrier: "",
            tracking_number: "",
            port_of_loading: "",
            port_of_discharge: "",
            vessel_name: "",
        }
    });

    useEffect(() => {
        if (open) {
            form.reset({
                order_id: "",
                items: [],
                container_numbers: "",
                shipment_date: new Date().toISOString().split('T')[0],
                carrier: "",
                tracking_number: "",
                port_of_loading: "",
                port_of_discharge: "",
                vessel_name: "",
            });
            setSelectedOrderId(null);
            setShippableItems([]);

            if (initialOrderId) {
                form.setValue('order_id', initialOrderId);
                handleOrderSelect(initialOrderId);
            }
        }
    }, [open, initialOrderId, form]);

    const handleOrderSelect = async (orderId: string) => {
        setSelectedOrderId(orderId);
        setIsFetchingItems(true);
        try {
            const res = await fetch(`/api/orders/${orderId}/shippable-items`);
            if (res.ok) {
                const items: ShippableItem[] = await res.json();
                setShippableItems(items);
                form.setValue("items", []);
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "Failed to fetch items" });
        } finally {
            setIsFetchingItems(false);
        }
    };

    const handleAddItem = (item: ShippableItem) => {
        const currentItems = form.getValues("items") || [];
        if (currentItems.find(i => i.order_item_id === item.id)) return;

        form.setValue("items", [
            ...currentItems,
            { order_item_id: item.id, quantity: item.remaining_quantity, package_number: "" }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        const currentItems = form.getValues("items");
        form.setValue("items", currentItems.filter((_, i) => i !== index));
    };

    const onSubmit = async (values: ShipmentFormValues) => {
        try {
            const payload = {
                ...values,
                container_numbers: values.container_numbers ? [values.container_numbers] : []
            };

            const res = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create shipment");
            }

            toast({ title: "Success", description: "Shipment created successfully" });
            onOpenChange(false);
            onSuccess();
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Shipment</DialogTitle>
                    <DialogDescription>Select an order and items to ship.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="order_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Order</FormLabel>
                                    <Select onValueChange={(val) => { field.onChange(val); handleOrderSelect(val); }} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select confirmed order..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {orders.map(o => (
                                                <SelectItem key={o.id} value={o.id}>{o.order_number} - {o.entities?.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {selectedOrderId && (
                            <div className="space-y-4 border rounded-md p-4 bg-slate-50">
                                <h4 className="font-semibold text-sm">Select Items to Ship</h4>
                                {isFetchingItems ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading items...</div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {shippableItems.map(item => (
                                                <Card key={item.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => handleAddItem(item)}>
                                                    <CardContent className="p-3">
                                                        <div className="font-medium truncate">{item.products?.name}</div>
                                                        <div className="text-xs text-muted-foreground">{item.skus?.sku_code}</div>
                                                        <div className="mt-2 text-sm">
                                                            Remaining: <Badge variant="secondary">{item.remaining_quantity}</Badge>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                            {shippableItems.length === 0 && <div className="text-sm text-muted-foreground p-2">No shippable items found.</div>}
                                        </div>

                                        <Separator />

                                        <div className="space-y-2">
                                            <Label>Items in this Shipment</Label>
                                            {form.watch("items")?.length === 0 ? (
                                                <div className="text-sm text-muted-foreground italic">No items selected. Click cards above to add.</div>
                                            ) : (
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Item</TableHead>
                                                            <TableHead className="w-[100px]">Qty</TableHead>
                                                            <TableHead>Package #</TableHead>
                                                            <TableHead className="w-[50px]"></TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {form.watch("items").map((fieldItem, index) => {
                                                            const originalItem = shippableItems.find(i => i.id === fieldItem.order_item_id);
                                                            return (
                                                                <TableRow key={index}>
                                                                    <TableCell className="text-sm">
                                                                        {originalItem?.products?.name} <span className="text-muted-foreground">({originalItem?.skus?.sku_code})</span>
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            type="number"
                                                                            className="h-8"
                                                                            {...form.register(`items.${index}.quantity` as const)}
                                                                            defaultValue={fieldItem.quantity}
                                                                            max={originalItem?.remaining_quantity}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Input
                                                                            placeholder="Box 1"
                                                                            className="h-8"
                                                                            {...form.register(`items.${index}.package_number` as const)}
                                                                        />
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveItem(index)}>
                                                                            <Plus className="h-4 w-4 rotate-45" />
                                                                        </Button>
                                                                    </TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            )}
                                            <FormMessage>{form.formState.errors.items?.message}</FormMessage>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="shipment_date" render={({ field }) => (
                                <FormItem><FormLabel>Shipment Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl></FormItem>
                            )} />
                            <IncotermSelect form={form} name="incoterm" />
                            <FormField control={form.control} name="incoterm_place" render={({ field }) => (
                                <FormItem><FormLabel>Incoterm Place</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="carrier" render={({ field }) => (
                                <FormItem><FormLabel>Carrier / Forwarder</FormLabel><FormControl><Input placeholder="DHL, Maersk, etc." {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="tracking_number" render={({ field }) => (
                                <FormItem><FormLabel>Tracking / Container #</FormLabel><FormControl><Input placeholder="Optional" {...field} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="port_of_loading" render={({ field }) => (
                                <FormItem><FormLabel>Port of Loading</FormLabel><FormControl><Input placeholder="e.g. Mumbai" {...field} /></FormControl></FormItem>
                            )} />
                        </div>

                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create Shipment
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
