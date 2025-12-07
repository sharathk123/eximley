"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Package, Truck, Calendar } from "lucide-react";

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const shipmentSchema = z.object({
    order_id: z.string().min(1, "Order selection required"),
    shipment_date: z.string().min(1, "Date required"),
    carrier: z.string().optional(),
    tracking_number: z.string().optional(),
    status: z.enum(['drafted', 'packed', 'shipped', 'in_transit', 'delivered']).default('drafted'),
    items: z.array(z.object({
        order_item_id: z.string(),
        sku_display: z.string().optional(), // For UI only
        ordered_qty: z.number().optional(), // For UI only
        quantity: z.coerce.number().min(0),
        package_number: z.string().optional()
    })).refine((items) => items.some(i => i.quantity > 0), { message: "Must ship at least one item", path: ["root"] })
});

export default function ShipmentsPage() {
    const [shipments, setShipments] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);

    const form = useForm<z.infer<typeof shipmentSchema>>({
        resolver: zodResolver(shipmentSchema) as any,
        defaultValues: {
            shipment_date: new Date().toISOString().split('T')[0],
            status: 'drafted',
            items: []
        },
    });

    const { fields, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [shipRes, ordRes] = await Promise.all([
                fetch("/api/shipments"),
                fetch("/api/orders?status=confirmed") // Fetch confirmed orders for shipping
            ]);

            const shipData = await shipRes.json();
            const ordData = await ordRes.json();

            if (shipData.shipments) setShipments(shipData.shipments);
            if (ordData.orders) setOrders(ordData.orders);
        } catch (err) {
            console.error(err);
        }
    };

    const onOrderSelect = (orderId: string) => {
        form.setValue("order_id", orderId);
        const order = orders.find(o => o.id === orderId);
        if (order && order.order_items) {
            setSelectedOrderItems(order.order_items);
            // Pre-fill shipment items with max available quantity (simplified logic: assumes full shipment initially)
            const packingList = order.order_items.map((item: any) => ({
                order_item_id: item.id,
                sku_display: item.skus?.sku_code || "Unknown SKU",
                ordered_qty: item.quantity,
                quantity: item.quantity, // Default to shipping remaining/all
                package_number: "Box 1"
            }));
            replace(packingList);
        } else {
            replace([]);
        }
    };

    const onSubmit = async (values: z.infer<typeof shipmentSchema>) => {
        try {
            // Filter out items with 0 quantity
            const payload = {
                ...values,
                items: values.items.filter(i => i.quantity > 0)
            };

            const res = await fetch("/api/shipments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Shipments</h1>
                    <p className="text-muted-foreground">
                        Manage packing lists and track outbound shipments.
                    </p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Create Shipment
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>New Shipment & Packing List</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="order_id"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Select Order</FormLabel>
                                                <Select onValueChange={onOrderSelect} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Confirmed Orders..." /></SelectTrigger></FormControl>
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
                                    <FormField
                                        control={form.control}
                                        name="shipment_date"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Shipment Date</FormLabel>
                                                <FormControl><Input type="date" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="carrier"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Carrier</FormLabel>
                                                <FormControl><Input placeholder="DHL, FedEx, etc." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="tracking_number"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tracking #</FormLabel>
                                                <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="drafted">Drafted</SelectItem>
                                                        <SelectItem value="packed">Packed</SelectItem>
                                                        <SelectItem value="shipped">Shipped</SelectItem>
                                                        <SelectItem value="in_transit">In Transit</SelectItem>
                                                        <SelectItem value="delivered">Delivered</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <Separator />

                                <div>
                                    <h3 className="font-semibold mb-2 flex items-center gap-2"><Package className="h-4 w-4" /> Packing List</h3>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>SKU</TableHead>
                                                    <TableHead className="w-24">Ord Qty</TableHead>
                                                    <TableHead className="w-32">Ship Qty</TableHead>
                                                    <TableHead>Package #</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {fields.length === 0 ? (
                                                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Select an order to view items.</TableCell></TableRow>
                                                ) : (
                                                    fields.map((field, index) => (
                                                        <TableRow key={field.id}>
                                                            <TableCell className="font-medium">{form.getValues(`items.${index}.sku_display`)}</TableCell>
                                                            <TableCell>{form.getValues(`items.${index}.ordered_qty`)}</TableCell>
                                                            <TableCell>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`items.${index}.quantity`}
                                                                    render={({ field }) => (
                                                                        <FormItem><FormControl><Input type="number" {...field} className="h-8" /></FormControl></FormItem>
                                                                    )}
                                                                />
                                                            </TableCell>
                                                            <TableCell>
                                                                <FormField
                                                                    control={form.control}
                                                                    name={`items.${index}.package_number`}
                                                                    render={({ field }) => (
                                                                        <FormItem><FormControl><Input placeholder="Box 1" {...field} className="h-8" /></FormControl></FormItem>
                                                                    )}
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                    {form.formState.errors.root && (
                                        <p className="text-sm text-destructive mt-2">{form.formState.errors.root.message}</p>
                                    )}
                                </div>

                                <Button type="submit" className="w-full">Create Shipment</Button>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Shipment #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>For Order #</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Carrier</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {shipments.length === 0 ? (
                            <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">No shipments found.</TableCell></TableRow>
                        ) : (
                            shipments.map((ship) => (
                                <TableRow key={ship.id}>
                                    <TableCell className="font-medium">{ship.shipment_number}</TableCell>
                                    <TableCell>{new Date(ship.shipment_date).toLocaleDateString()}</TableCell>
                                    <TableCell>{ship.export_orders?.order_number}</TableCell>
                                    <TableCell>{ship.export_orders?.entities?.name}</TableCell>
                                    <TableCell>{ship.carrier} {ship.tracking_number ? `(${ship.tracking_number})` : ''}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            ship.status === 'delivered' ? 'default' :
                                                ship.status === 'shipped' ? 'secondary' : 'outline'
                                        }>
                                            {ship.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => window.open(`/api/documents/packing-list/${ship.id}`, '_blank')}
                                            title="Download Packing List"
                                        >
                                            <Package className="h-4 w-4 mr-2" /> Packing List
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
