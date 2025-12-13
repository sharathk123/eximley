"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, ScrollText } from "lucide-react";
import Link from "next/link";

interface ProformaCardViewProps {
    invoices: any[];
    onEdit: (invoice: any) => void;
    onDelete: (invoice: any) => void;
    onConvert: (invoice: any) => void;
    onRowClick: (id: string) => void;
    getStatusColor: (status: string) => string;
}

export function ProformaCardView({
    invoices,
    onEdit,
    onDelete,
    onConvert,
    onRowClick,
    getStatusColor
}: ProformaCardViewProps) {
    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invoices.map((inv) => (
                <Card
                    key={inv.id}
                    className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onRowClick(inv.id)}
                >
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
                                    aria-label="Edit proforma"
                                    className="h-8 w-8"
                                    onClick={(e) => { e.stopPropagation(); onEdit(inv); }}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Delete proforma"
                                    className="h-8 w-8"
                                    onClick={(e) => { e.stopPropagation(); onDelete(inv); }}
                                >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Badge
                                variant={getStatusColor(inv.status) as any}
                                className={inv.status === 'approved' ? 'bg-green-600 hover:bg-green-700 bg-opacity-90 border-transparent' : ''}
                            >
                                {inv.status}
                            </Badge>
                            <Badge variant="outline">{inv.currency_code}</Badge>
                        </div>

                        <div className="space-y-1 text-sm text-muted-foreground pt-2">
                            <div>Date: {new Date(inv.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                            <div className="font-semibold text-foreground">
                                Total: {inv.currency_code} {inv.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            {inv.proforma_items && (
                                <div>{inv.proforma_items.length} item(s)</div>
                            )}
                            {inv.quotes && inv.quotes.length > 0 && (
                                <div className="pt-1">
                                    From Quote: <Link href="/quotes" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{inv.quotes[0].quote_number}</Link>
                                </div>
                            )}
                            {inv.export_orders && inv.export_orders.length > 0 && (
                                <div className="pt-1">
                                    To Order: <Link href="/orders" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>{inv.export_orders[0].order_number}</Link>
                                </div>
                            )}
                        </div>

                        {inv.status !== 'converted' && (
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => { e.stopPropagation(); onConvert(inv); }}
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
