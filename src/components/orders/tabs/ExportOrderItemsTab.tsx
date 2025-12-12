/**
 * ExportOrderItemsTab Component
 * 
 * Displays order line items with quantities, prices, and totals
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ExportOrderItemsTabProps {
    items: any[];
    currency: string;
}

export function ExportOrderItemsTab({ items, currency }: ExportOrderItemsTabProps) {
    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Order Items</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product/SKU</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">
                                                {item.skus?.name || item.sku_id}
                                            </div>
                                            {item.skus?.sku_code && (
                                                <div className="text-sm text-muted-foreground">
                                                    {item.skus.sku_code}
                                                </div>
                                            )}
                                            {item.description && (
                                                <div className="text-sm text-muted-foreground mt-1">
                                                    {item.description}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">{item.quantity}</TableCell>
                                    <TableCell className="text-right">
                                        {currency} {item.unit_price.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right font-medium">
                                        {currency} {(item.quantity * item.unit_price).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span>{currency} {calculateTotal().toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                                <span>Total</span>
                                <span>{currency} {calculateTotal().toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
