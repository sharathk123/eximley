"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";

interface ProformaTableViewProps {
    invoices: any[];
    onEdit: (invoice: any) => void;
    onDelete: (invoice: any) => void;
    onConvert: (invoice: any) => void;
    onRowClick: (id: string) => void;
    getStatusColor: (status: string) => string;
}

export function ProformaTableView({
    invoices,
    onEdit,
    onDelete,
    onConvert,
    onRowClick,
    getStatusColor
}: ProformaTableViewProps) {

    const columns: DataTableColumn<any>[] = [
        {
            key: 'invoice_number',
            header: 'Invoice #',
            width: 'w-[140px]',
            sortable: true,
            cellClassName: 'font-medium',
            cell: (inv) => inv.invoice_number
        },
        {
            key: 'buyer',
            header: 'Buyer',
            width: 'w-[200px]',
            cell: (inv) => inv.entities?.name || "—"
        },
        {
            key: 'date',
            header: 'Date',
            width: 'w-[120px]',
            sortable: true,
            cell: (inv) => new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        },
        {
            key: 'total_amount',
            header: 'Total',
            width: 'w-[150px]',
            sortable: true,
            cell: (inv) => `${inv.currency_code} ${inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[150px]',
            sortable: true,
            cell: (inv) => (
                <Badge
                    variant={getStatusColor(inv.status) as any}
                    className={inv.status === 'approved' ? 'bg-green-600 hover:bg-green-700 border-transparent' : ''}
                >
                    {inv.status}
                </Badge>
            )
        },
        {
            key: 'reference',
            header: 'Reference',
            width: 'w-[180px]',
            cell: (inv) => (
                <div className="space-y-1">
                    {inv.quotes && inv.quotes.length > 0 && (
                        <div className="flex items-center text-muted-foreground text-xs">
                            <span className="mr-1">From:</span>
                            <a href={`/quotes/${inv.quotes[0].id}`} onClick={(e) => e.stopPropagation()} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:underline font-medium">
                                {inv.quotes[0].quote_number}
                            </a>
                        </div>
                    )}
                    {inv.export_orders && inv.export_orders.length > 0 && (
                        <div className="flex items-center text-muted-foreground text-xs">
                            <span className="mr-1">To:</span>
                            <a href={`/orders/${inv.export_orders[0].id}`} onClick={(e) => e.stopPropagation()} className="bg-blue-100/50 text-blue-700 dark:text-blue-400 dark:bg-blue-900/30 px-1.5 py-0.5 rounded hover:underline font-medium">
                                {inv.export_orders[0].order_number}
                            </a>
                        </div>
                    )}
                    {(!inv.quotes?.length && !inv.export_orders?.length) && <span className="text-muted-foreground text-xs">—</span>}
                </div>
            )
        }
    ];

    return (
        <DataTable
            data={invoices}
            columns={columns}
            searchKeys={['invoice_number', 'status']}
            searchPlaceholder="Search proforma invoices..."
            onRowClick={(inv) => onRowClick(inv.id)}
            actions={(inv) => (
                <div className="flex justify-end gap-2">
                    {inv.status !== 'converted' && (
                        <Button variant="ghost" size="sm" onClick={() => onConvert(inv)} aria-label={`Convert proforma ${inv.proforma_number}`}>
                            To Order
                        </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(inv)} aria-label="Edit proforma">
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(inv)} aria-label="Delete proforma">
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            )}
        />
    );
}
