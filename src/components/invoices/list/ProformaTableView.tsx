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
import { Edit, Trash2 } from "lucide-react";

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

    const handleActionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="border rounded-md bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[140px]">Invoice #</TableHead>
                        <TableHead className="w-[200px]">Buyer</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[150px]">Total</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[180px]">Reference</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((inv) => (
                        <TableRow
                            key={inv.id}
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => onRowClick(inv.id)}
                        >
                            <TableCell className="font-medium">
                                {inv.invoice_number}
                            </TableCell>
                            <TableCell>{inv.entities?.name || "—"}</TableCell>
                            <TableCell>{new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                            <TableCell>
                                {inv.currency_code} {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                                <Badge
                                    variant={getStatusColor(inv.status) as any}
                                    className={inv.status === 'approved' ? 'bg-green-600 hover:bg-green-700 border-transparent' : ''}
                                >
                                    {inv.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
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
                            </TableCell>
                            <TableCell className="text-right" onClick={handleActionClick}>
                                <div className="flex justify-end gap-2">
                                    {inv.status !== 'converted' && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onConvert(inv)}
                                        >
                                            To Order
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onEdit(inv)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onDelete(inv)}
                                    >
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
