"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Trash2,
    Edit,
    CreditCard,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";

interface PurchaseOrderListProps {
    purchaseOrders: any[];
    viewMode: 'card' | 'list';
    onEdit: (po: any) => void;
    onDelete: (po: any) => void;
    onPayments: (po: any) => void;
}

export function PurchaseOrderList({
    purchaseOrders,
    viewMode,
    onEdit,
    onDelete,
    onPayments
}: PurchaseOrderListProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return 'default';
            case 'received': return 'success';
            case 'completed': return 'secondary';
            case 'cancelled': return 'destructive';
            default: return 'outline';
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'success';
            case 'partial': return 'warning';
            default: return 'secondary';
        }
    };

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchaseOrders.map((po) => (
                    <Card key={po.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-lg">{po.po_number}</div>
                                    <div className="text-sm text-muted-foreground">{po.entities?.name || 'Unknown Vendor'}</div>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    <Badge variant={getStatusColor(po.status) as any}>{po.status}</Badge>
                                    {po.payment_status && <Badge variant={getPaymentStatusColor(po.payment_status) as any} className="text-[10px] h-5">{po.payment_status}</Badge>}
                                </div>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                                <div>Date: {new Date(po.order_date).toLocaleDateString()}</div>
                                <div className="font-semibold text-foreground">
                                    Total: {po.currency_code} {Number(po.total_amount).toFixed(2)}
                                </div>
                                {po.export_orders && (
                                    <div className="pt-1 text-xs flex items-center gap-1">
                                        <ExternalLink className="h-3 w-3" />
                                        For Order: <Link href="/orders" className="text-primary hover:underline">{po.export_orders.order_number}</Link>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                                <Button variant="ghost" size="icon" onClick={() => onPayments(po)} title="Payments">
                                    <CreditCard className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onEdit(po)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => onDelete(po)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    // List view using DataTable
    const columns: DataTableColumn<any>[] = [
        {
            key: 'po_number',
            header: 'PO #',
            width: 'w-[120px]',
            sortable: true,
            cell: (po) => (
                <Link href={`/purchase-orders/${po.id}`} className="text-primary hover:underline font-medium">
                    {po.po_number}
                </Link>
            )
        },
        {
            key: 'vendor',
            header: 'Vendor',
            width: 'w-[180px]',
            cell: (po) => po.entities?.name || '—'
        },
        {
            key: 'order_date',
            header: 'Date',
            width: 'w-[110px]',
            sortable: true,
            cell: (po) => new Date(po.order_date).toLocaleDateString()
        },
        {
            key: 'export_order',
            header: 'Export Order',
            width: 'w-[150px]',
            cell: (po) => po.export_orders ? (
                <Link href="/orders" className="flex items-center gap-1 text-primary hover:underline">
                    {po.export_orders.order_number} <ExternalLink className="h-3 w-3" />
                </Link>
            ) : <span className="text-muted-foreground">—</span>
        },
        {
            key: 'total_amount',
            header: 'Total',
            width: 'w-[130px]',
            sortable: true,
            cell: (po) => `${po.currency_code} ${Number(po.total_amount).toFixed(2)}`
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[120px]',
            sortable: true,
            cell: (po) => (
                <div className="flex flex-col gap-1 items-start">
                    <Badge variant={getStatusColor(po.status) as any}>{po.status}</Badge>
                    {po.payment_status && <Badge variant={getPaymentStatusColor(po.payment_status) as any} className="text-[10px] h-5">{po.payment_status}</Badge>}
                </div>
            )
        }
    ];

    return (
        <DataTable
            data={purchaseOrders}
            columns={columns}
            searchKeys={['po_number', 'status']}
            searchPlaceholder="Search purchase orders..."
            actions={(po) => (
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => onPayments(po)} title="Payments">
                        <CreditCard className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(po)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(po)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )}
        />
    );
}
