import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface PurchaseOrderItemsTabProps {
    po: any;
}

export function PurchaseOrderItemsTab({ po }: PurchaseOrderItemsTabProps) {
    const items = po.purchase_order_items || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Purchase Order Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No items found</p>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Tax Rate</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any, index: number) => {
                                    const lineTotal = item.quantity * item.unit_price;
                                    const tax = lineTotal * (item.tax_rate / 100);
                                    const total = lineTotal + tax;

                                    return (
                                        <TableRow key={item.id || index}>
                                            <TableCell className="font-medium">
                                                {item.skus?.sku_code || 'N/A'}
                                            </TableCell>
                                            <TableCell>
                                                {item.skus?.name || item.description || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                            <TableCell className="text-right">
                                                {po.currency_code || 'USD'} {item.unit_price?.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">{item.tax_rate}%</TableCell>
                                            <TableCell className="text-right font-medium">
                                                {po.currency_code || 'USD'} {total.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
