"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Trash2,
    Edit,
    FileCheck
} from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { useRouter } from "next/navigation";

interface ShippingBillListProps {
    shippingBills: any[];
    viewMode: 'card' | 'list';
    onEdit: (sb: any) => void;
    onDelete: (sb: any) => void;
    onFile: (id: string) => void;
}

export function ShippingBillList({
    shippingBills,
    viewMode,
    onEdit,
    onDelete,
    onFile
}: ShippingBillListProps) {

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            drafted: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            filed: 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground hover:bg-primary/20',
            cleared: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100/80 bg-opacity-90',
            shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-100/80 bg-opacity-90',
            cancelled: 'bg-destructive/10 text-destructive hover:bg-destructive/20'
        };

        const style = styles[status] || 'bg-muted text-muted-foreground';

        return (
            <Badge variant="outline" className={`${style} border-0`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </Badge>
        );
    };

    const columns: DataTableColumn<any>[] = [
        {
            key: 'sb_number',
            header: 'SB Number',
            width: 'w-[140px]',
            sortable: true,
            cell: (sb) => (
                <Link href={`/shipping-bills/${sb.id}`} className="text-primary hover:underline font-medium">
                    {sb.sb_number}
                </Link>
            )
        },
        {
            key: 'sb_date',
            header: 'Date',
            width: 'w-[110px]',
            sortable: true,
            cell: (sb) => new Date(sb.sb_date).toLocaleDateString()
        },
        {
            key: 'order_number',
            header: 'Order',
            width: 'w-[130px]',
            sortable: true,
            cell: (sb) => sb.export_orders?.order_number || '—'
        },
        {
            key: 'buyer',
            header: 'Buyer',
            width: 'w-[180px]',
            sortable: true,
            cell: (sb) => sb.export_orders?.entities?.name || '—'
        },
        {
            key: 'fob_value',
            header: 'FOB Value',
            width: 'w-[130px]',
            sortable: true,
            cell: (sb) => `${sb.currency_code} ${Number(sb.fob_value).toFixed(2)}`
        },
        {
            key: 'port_code',
            header: 'Port',
            width: 'w-[100px]',
            sortable: true,
            cell: (sb) => sb.port_code || '—'
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[100px]',
            sortable: true,
            cell: (sb) => getStatusBadge(sb.status)
        }
    ];

    if (viewMode === 'card') {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {shippingBills.map((sb) => (
                    <Card key={sb.id} className="hover:shadow-md hover-lift transition-shadow shadow-sm bg-card border-border">
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="space-y-1">
                                <Link href={`/shipping-bills/${sb.id}`} className="hover:underline">
                                    <CardTitle className="text-base font-bold text-foreground">{sb.sb_number}</CardTitle>
                                </Link>
                                <p className="text-sm text-muted-foreground">
                                    {new Date(sb.sb_date).toLocaleDateString()}
                                </p>
                            </div>
                            {getStatusBadge(sb.status)}
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div>
                                <p className="text-xs text-muted-foreground">Buyer</p>
                                <p className="font-medium text-foreground">{sb.export_orders?.entities?.name || '—'}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <p className="text-xs text-muted-foreground">Order</p>
                                    <p className="font-mono text-xs text-foreground">{sb.export_orders?.order_number || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-muted-foreground">Port</p>
                                    <p className="text-xs text-foreground">{sb.port_code || '—'}</p>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">FOB Value</p>
                                <p className="text-lg font-bold text-primary">{sb.currency_code} {Number(sb.fob_value).toFixed(2)}</p>
                            </div>
                            <div className="flex gap-2 pt-2">
                                {sb.status === 'drafted' && (
                                    <>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(sb)}>
                                            <Edit className="h-3 w-3 mr-1" /> Edit
                                        </Button>
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => onFile(sb.id)}>
                                            <FileCheck className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" /> File
                                        </Button>
                                    </>
                                )}
                                {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(sb)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                )}
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
                data={shippingBills}
                columns={columns}
                actions={(sb) => (
                    <div className="flex gap-2 justify-end">
                        {sb.status === 'drafted' && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => onEdit(sb)}>
                                    <Edit className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => onFile(sb.id)} title="Mark as Filed">
                                    <FileCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
                                </Button>
                            </>
                        )}
                        {(sb.status === 'drafted' || sb.status === 'cancelled') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(sb)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            />
        </div>
    );
}
