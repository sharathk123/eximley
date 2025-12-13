"use client";

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
import { DataTable, DataTableColumn } from "@/components/ui/data-table";

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
                    <Link key={ord.id} href={`/orders/${ord.id}`}>
                        <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="font-semibold text-lg">{ord.order_number}</div>
                                        <div className="text-sm text-muted-foreground">{ord.entities?.name || 'Unknown Buyer'}</div>
                                    </div>
                                    <div className="flex justify-end gap-2" onClick={(e) => e.preventDefault()}>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(ord); }} aria-label="Edit order">
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(ord); }} aria-label="Delete order">
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
                    </Link>
                ))}
            </div>
        );
    }

    // List view using DataTable
    const columns: DataTableColumn<any>[] = [
        {
            key: 'order_number',
            header: 'Order #',
            width: 'w-[140px]',
            sortable: true,
            cell: (ord) => (
                <Link href={`/orders/${ord.id}`} className="text-primary hover:underline font-medium">
                    {ord.order_number}
                </Link>
            )
        },
        {
            key: 'buyer',
            header: 'Buyer',
            width: 'w-[200px]',
            sortable: true,
            cell: (ord) => ord.entities?.name || '—'
        },
        {
            key: 'order_date',
            header: 'Date',
            width: 'w-[120px]',
            sortable: true,
            cell: (ord) => new Date(ord.order_date).toLocaleDateString()
        },
        {
            key: 'total_amount',
            header: 'Total',
            width: 'w-[150px]',
            sortable: true,
            cell: (ord) => `${ord.currency_code} ${Number(ord.total_amount).toFixed(2)}`
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[140px]',
            sortable: true,
            cell: (ord) => (
                <div className="flex gap-2">
                    <Badge variant={getStatusColor(ord.status)}>{ord.status}</Badge>
                    <Badge variant="outline" className="text-xs">{ord.payment_status || 'unpaid'}</Badge>
                </div>
            )
        },
        {
            key: 'reference',
            header: 'Reference',
            width: 'w-[150px]',
            cell: (ord) => ord.proforma_invoices ? (
                <div className="flex items-center text-muted-foreground text-xs">
                    <span className="mr-1">From:</span>
                    <a href={`/invoices/proforma/${ord.proforma_invoices.id}`} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                        {ord.proforma_invoices.invoice_number}
                    </a>
                </div>
            ) : <span className="text-muted-foreground text-xs">—</span>
        }
    ];

    return (
        <div className="border rounded-md bg-card">
            <DataTable
                data={orders}
                columns={columns}
                actions={(ord) => (
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => onPayment(ord)} title="Payments" aria-label="Manage payments">
                            <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(ord)} aria-label="Edit order">
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(ord)} aria-label="Delete order">
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                )}
            />
        </div>
    );
}
