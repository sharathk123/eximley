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
import { useRouter } from "next/navigation";

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

    const router = useRouter();

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            confirmed: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground hover:bg-primary/20',
            received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100/80',
            completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80',
            cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/20',
            draft: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
        };

        const style = styles[status] || 'bg-muted text-muted-foreground';

        return (
            <Badge variant="outline" className={`${style} border-0 capitalize`}>
                {status}
            </Badge>
        );
    };

    const getPaymentBadge = (status: string) => {
        const styles: Record<string, string> = {
            paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            partial: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
            pending: 'bg-secondary text-secondary-foreground'
        };

        const style = styles[status] || 'bg-muted text-muted-foreground';

        return (
            <Badge variant="outline" className={`${style} border-0 text-[10px] h-5 capitalize`}>
                {status}
            </Badge>
        );
    };

    // Helper function to get status color class for the new columns definition
    const getStatusColorClass = (status: string) => {
        const styles: Record<string, string> = {
            confirmed: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground',
            received: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
            completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
            cancelled: 'bg-destructive/10 text-destructive',
            draft: 'bg-secondary text-secondary-foreground'
        };
        return styles[status] || 'bg-muted text-muted-foreground';
    };

    const columns: DataTableColumn<any>[] = [
        {
            key: "po_number",
            header: "PO Number",
            sortable: true,
            cell: (po: any) => <span className="font-medium">{po.po_number}</span>
        },
        {
            key: "vendor_name",
            header: "Vendor",
            sortable: true,
            cell: (po: any) => po.entities?.name || "-"
        },
        {
            key: "date",
            header: "Date",
            sortable: true,
            cell: (po: any) => new Date(po.order_date).toLocaleDateString()
        },
        {
            key: "expected_date",
            header: "Expected",
            sortable: true,
            cell: (po: any) => po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString() : "-"
        },
        {
            key: "status",
            header: "Status",
            sortable: true,
            cell: (po: any) => getStatusBadge(po.status)
        },
        {
            key: "payment_status",
            header: "Payment",
            sortable: true,
            cell: (po: any) => getPaymentBadge(po.payment_status)
        },
        {
            key: "total_amount",
            header: "Amount",
            sortable: true,
            cellClassName: "text-right",
            cell: (po: any) => (
                po.currency_code && po.total_amount
                    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: po.currency_code }).format(po.total_amount)
                    : "-"
            )
        },
        {
            key: 'export_order',
            header: 'Export Order',
            width: 'w-[150px]',
            cell: (po: any) => po.export_orders ? (
                <Link href="/orders" className="flex items-center gap-1 text-primary hover:underline">
                    {po.export_orders.order_number} <ExternalLink className="h-3 w-3" />
                </Link>
            ) : <span className="text-muted-foreground">—</span>
        }
    ];

    if (viewMode === 'card') {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {purchaseOrders.map((po) => (
                    <Card key={po.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/purchase-orders/${po.id}`)}>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-semibold text-lg">{po.po_number}</div>
                                    <div className="text-sm text-muted-foreground">{po.entities?.name || 'Unknown Vendor'}</div>
                                </div>
                                <div className="flex flex-col gap-1 items-end">
                                    {getStatusBadge(po.status)}
                                    {po.payment_status && getPaymentBadge(po.payment_status)}
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
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onPayments(po); }} title="Payments">
                                    <CreditCard className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(po); }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(po); }}>
                                    <Trash2 className="h-4 w-4" />
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
            <DataTable
                data={purchaseOrders}
                columns={columns}
                onRowClick={(po) => router.push(`/purchase-orders/${po.id}`)}
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
        </div>
    );
}
