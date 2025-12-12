"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface QuoteItemsTabProps {
    items: any[];
    currency: string;
}

export function QuoteItemsTab({ items, currency }: QuoteItemsTabProps) {
    return (
        <Card className="shadow-sm border-muted/40">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Package className="h-4 w-4 text-primary" />
                    Quote Items
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="w-[50px] pl-6">#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Disc %</TableHead>
                            <TableHead className="text-right">Tax %</TableHead>
                            <TableHead className="text-right pr-6">Line Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!items || items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-[300px] text-center">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                                            <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-medium text-muted-foreground">No items added to this quote</p>
                                            <p className="text-xs text-muted-foreground/60 w-64 mx-auto">
                                                Add products to generate the quote calculation.
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-muted/5">
                                    <TableCell className="font-medium pl-6">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="font-medium">{item.product_name}</div>
                                        {item.skus?.sku_code && <div className="text-xs text-muted-foreground">{item.skus.sku_code}</div>}
                                    </TableCell>
                                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                                        {item.description || "—"}
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">{currency} {item.unit_price?.toFixed(2)}</TableCell>
                                    <TableCell className="text-right">{item.discount_percent > 0 ? `${item.discount_percent}%` : '-'}</TableCell>
                                    <TableCell className="text-right">{item.tax_percent > 0 ? `${item.tax_percent}%` : '-'}</TableCell>
                                    <TableCell className="text-right font-medium pr-6">
                                        {currency} {item.total_price?.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                    {items && items.length > 0 && (
                        <tfoot className="bg-muted/50 font-medium border-t">
                            <TableRow className="hover:bg-muted/50">
                                <TableCell colSpan={6} />
                                <TableCell className="text-right py-4 text-muted-foreground">Subtotal</TableCell>
                                <TableCell className="text-right py-4 pr-6">
                                    {currency} {items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0) * (1 - (item.discount_percent || 0) / 100)), 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/50 border-0">
                                <TableCell colSpan={6} />
                                <TableCell className="text-right py-2 text-muted-foreground">Total Tax</TableCell>
                                <TableCell className="text-right py-2 pr-6">
                                    {currency} {items.reduce((sum, item) => sum + (item.total_price - (item.quantity * item.unit_price * (1 - (item.discount_percent || 0) / 100))), 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                            <TableRow className="hover:bg-muted/50 border-t bg-muted/30">
                                <TableCell colSpan={6} />
                                <TableCell className="text-right py-4 font-bold text-foreground">Grand Total</TableCell>
                                <TableCell className="text-right py-4 pr-6 font-bold text-primary text-lg">
                                    {currency} {items.reduce((sum, item) => sum + (item.total_price || 0), 0).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        </tfoot>
                    )}
                </Table>
            </CardContent>
        </Card>
    );
}
