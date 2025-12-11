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
import { Card, CardContent } from "@/components/ui/card";
import {
    CreditCard,
    Edit,
    Trash2,
    Ship,
    FileText,
    Pencil
} from "lucide-react";
import Link from "next/link";

interface OrderListProps {
    orders: any[];
    viewMode: 'card' | 'list';
    onEdit: (order: any) => void;
    onDelete: (order: any) => void;
    onPayment: (order: any) => void;
}

export function OrderList({
    orders,
    viewMode,
    onEdit,
    onDelete,
    onPayment
}: OrderListProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            case 'pending': return 'outline';
            default: return 'outline';
        }
    };

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((ord) => (
                    <Card key={ord.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-semibold text-lg">{ord.order_number}</div>
                                    <div className="text-sm text-muted-foreground">{ord.entities?.name || 'Unknown Buyer'}</div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(ord)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(ord)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Badge variant={getStatusColor(ord.status)}>{ord.status}</Badge>
                                <Badge variant="outline">{ord.payment_status || 'unpaid'}</Badge>
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                                <div>Date: {new Date(ord.order_date).toLocaleDateString()}</div>
                                <div className="font-semibold text-foreground">
                                    Total: {ord.currency_code} {Number(ord.total_amount).toFixed(2)}
                                </div>
                                {ord.proforma_invoices && (
                                    <div className="pt-1 text-xs">
                                        PI: <span className="font-medium">{ord.proforma_invoices.invoice_number}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Link href={`/shipments?order_id=${ord.id}&create=true`}>
                                    <Button size="sm" variant="outline">
                                        <Ship className="h-3 w-3 mr-1" /> Ship
                                    </Button>
                                </Link>
                                <Button variant="outline" size="sm" className="flex-1" onClick={() => window.open(`/api/documents/commercial-invoice/${ord.id}`, '_blank')}>
                                    <FileText className="h-3 w-3 mr-1" /> Invoice
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="border rounded-md bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Order #</TableHead>
                        <TableHead className="w-[200px]">Buyer</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[150px]">Total</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {orders.map((ord) => (
                        <TableRow key={ord.id}>
                            <TableCell className="font-medium">{ord.order_number}</TableCell>
                            <TableCell>{ord.entities?.name}</TableCell>
                            <TableCell>{new Date(ord.order_date).toLocaleDateString()}</TableCell>
                            <TableCell>{ord.currency_code} {Number(ord.total_amount).toFixed(2)}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Badge variant={getStatusColor(ord.status)}>{ord.status}</Badge>
                                    <Badge variant="outline" className="text-xs">{ord.payment_status || 'unpaid'}</Badge>
                                </div>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => onPayment(ord)} title="Payments">
                                        <CreditCard className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(ord)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(ord)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
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
