"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Trash2,
    Edit,
    Truck,
    MapPin,
    Package
} from "lucide-react";
import Link from "next/link";

interface ShipmentListProps {
    shipments: any[];
    viewMode: 'card' | 'list';
    onView: (shipment: any) => void;
    onDelete: (shipment: any) => void;
}

export function ShipmentList({
    shipments,
    viewMode,
    onView,
    onDelete
}: ShipmentListProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'drafted': return 'secondary';
            case 'shipped': return 'default';
            case 'in_transit': return 'outline';
            case 'delivered': return 'secondary';
            default: return 'outline';
        }
    };

    if (viewMode === 'card') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {shipments.map((ship) => (
                    <Card key={ship.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {ship.shipment_number}
                            </CardTitle>
                            <Badge variant={getStatusColor(ship.status) as any}>{ship.status}</Badge>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{ship.export_orders?.entities?.name}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                <Link href="/orders" className="hover:underline text-primary">{ship.export_orders?.order_number}</Link> • {new Date(ship.shipment_date).toLocaleDateString()}
                            </p>
                            <div className="mt-4 space-y-2 text-sm">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-4 w-4 text-muted-foreground" />
                                    <span>{ship.carrier || 'Not specified'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <span>{ship.port_of_loading || '-'} → {ship.port_of_discharge || '-'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <span>{ship.total_packages || 0} Packages</span>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="gap-2">
                            <Button variant="outline" className="w-full" onClick={() => onView(ship)}>View</Button>
                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(ship)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Shipment #</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[150px]">Order</TableHead>
                        <TableHead className="w-[180px]">Buyer</TableHead>
                        <TableHead className="w-[130px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {shipments.map((ship) => (
                        <TableRow key={ship.id}>
                            <TableCell className="font-medium">{ship.shipment_number}</TableCell>
                            <TableCell>{new Date(ship.shipment_date).toLocaleDateString()}</TableCell>
                            <TableCell>{ship.export_orders?.order_number}</TableCell>
                            <TableCell>{ship.export_orders?.entities?.name}</TableCell>
                            <TableCell><Badge variant={getStatusColor(ship.status) as any}>{ship.status}</Badge></TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => onView(ship)}>View</Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { /* Edit Placeholder */ }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(ship)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
