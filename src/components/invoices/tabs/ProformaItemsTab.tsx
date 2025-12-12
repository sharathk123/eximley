import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProformaItemsTabProps {
    items: any[];
    currencyCode: string;
}

export function ProformaItemsTab({ items, currencyCode }: ProformaItemsTabProps) {
    const total = items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unit_price)), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Product Name</TableHead>
                            <TableHead className="text-right">Quantity</TableHead>
                            <TableHead className="text-right">Unit Price</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items?.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell className="font-medium">{item.skus?.sku_code}</TableCell>
                                <TableCell>
                                    <div>{item.skus?.name}</div>
                                    {item.description && <div className="text-sm text-muted-foreground">{item.description}</div>}
                                </TableCell>
                                <TableCell className="text-right">{item.quantity}</TableCell>
                                <TableCell className="text-right">{currencyCode} {Number(item.unit_price).toFixed(2)}</TableCell>
                                <TableCell className="text-right font-medium">
                                    {currencyCode} {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                                </TableCell>
                            </TableRow>
                        ))}
                        <TableRow>
                            <TableCell colSpan={4} className="text-right font-bold">Grand Total</TableCell>
                            <TableCell className="text-right font-bold text-lg">
                                {currencyCode} {total.toFixed(2)}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
