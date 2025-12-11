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
    Trash2,
    Edit,
    ScrollText
} from "lucide-react";
import Link from "next/link";

interface ProformaListProps {
    invoices: any[];
    viewMode: 'card' | 'list';
    onEdit: (invoice: any) => void;
    onDelete: (invoice: any) => void;
    onConvert: (invoice: any) => void;
}

export function ProformaList({
    invoices,
    viewMode,
    onEdit,
    onDelete,
    onConvert
}: ProformaListProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'default';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {invoices.map((inv) => (
                    <Card key={inv.id} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-semibold text-lg">{inv.invoice_number}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {inv.entities?.name || "No buyer"}
                                    </div>
                                </div>
                                <div className="flex gap-1">
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
                            </div>

                            <div className="flex gap-2">
                                <Badge variant={getStatusColor(inv.status) as any}>{inv.status}</Badge>
                                <Badge variant="outline">{inv.currency_code}</Badge>
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                <div>Date: {new Date(inv.date).toLocaleDateString()}</div>
                                <div className="font-semibold text-foreground">
                                    Total: {inv.currency_code} {inv.total_amount.toFixed(2)}
                                </div>
                                {inv.proforma_items && (
                                    <div>{inv.proforma_items.length} item(s)</div>
                                )}
                                {inv.quotes && inv.quotes.length > 0 && (
                                    <div className="pt-1">
                                        From Quote: <Link href="/quotes" className="text-primary hover:underline">{inv.quotes[0].quote_number}</Link>
                                    </div>
                                )}
                                {inv.export_orders && inv.export_orders.length > 0 && (
                                    <div className="pt-1">
                                        To Order: <Link href="/orders" className="text-primary hover:underline">{inv.export_orders[0].order_number}</Link>
                                    </div>
                                )}
                            </div>

                            {inv.status !== 'converted' && (
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onConvert(inv)}
                                        className="w-full"
                                    >
                                        <ScrollText className="h-3 w-3 mr-1" /> To Order
                                    </Button>
                                </div>
                            )}
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
                        <TableHead className="w-[140px]">Invoice #</TableHead>
                        <TableHead className="w-[200px]">Buyer</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[150px]">Total</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                            <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                            <TableCell>{inv.entities?.name || "—"}</TableCell>
                            <TableCell>{new Date(inv.date).toLocaleDateString()}</TableCell>
                            <TableCell>
                                {inv.currency_code} {inv.total_amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusColor(inv.status) as any}>{inv.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
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
