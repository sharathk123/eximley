import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";

interface ShippingBillItemsTabProps {
    sb: any;
}

export function ShippingBillItemsTab({ sb }: ShippingBillItemsTabProps) {
    const items = sb.shipping_bill_items || [];

    return (
        <Card>
            <CardHeader>
                <CardTitle>Shipped Items ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
                {items.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No items"
                        description="No shipping bill items have been added yet."
                    />
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>HSN Code</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">FOB Value</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item: any, index: number) => (
                                    <TableRow key={item.id || index}>
                                        <TableCell className="font-medium">
                                            {item.hsn_code || 'N/A'}
                                        </TableCell>
                                        <TableCell>{item.description || 'N/A'}</TableCell>
                                        <TableCell className="text-right">{item.quantity}</TableCell>
                                        <TableCell className="text-right">
                                            {sb.currency_code || 'USD'} {item.unit_price?.toFixed(2)}
                                        </TableCell>
                                        <TableCell className="text-right font-medium">
                                            {sb.currency_code || 'USD'} {item.fob_value?.toFixed(2)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
