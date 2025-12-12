import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PurchaseOrderDetailsTabProps {
    po: any;
}

export function PurchaseOrderDetailsTab({ po }: PurchaseOrderDetailsTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">PO Number</p>
                        <p className="font-medium">{po.po_number}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Order Date</p>
                        <p className="font-medium">{new Date(po.order_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge>{po.status?.toUpperCase()}</Badge>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="font-medium">V{po.version || 1}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Currency</p>
                        <p className="font-medium">{po.currency_code || 'USD'}</p>
                    </div>
                    {po.delivery_date && (
                        <div>
                            <p className="text-sm text-muted-foreground">Delivery Date</p>
                            <p className="font-medium">{new Date(po.delivery_date).toLocaleDateString()}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Vendor Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div>
                        <p className="text-sm text-muted-foreground">Vendor Name</p>
                        <p className="font-medium">{po.entities?.name || 'N/A'}</p>
                    </div>
                    {po.entities?.email && (
                        <div>
                            <p className="text-sm text-muted-foreground">Email</p>
                            <p className="font-medium">{po.entities.email}</p>
                        </div>
                    )}
                    {po.entities?.phone && (
                        <div>
                            <p className="text-sm text-muted-foreground">Phone</p>
                            <p className="font-medium">{po.entities.phone}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {po.export_orders && (
                <Card>
                    <CardHeader>
                        <CardTitle>Linked Export Order</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div>
                            <p className="text-sm text-muted-foreground">Order Number</p>
                            <p className="font-medium">{po.export_orders.order_number}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{po.currency_code || 'USD'} {po.subtotal?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-medium">{po.currency_code || 'USD'} {po.tax_total?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Amount</span>
                        <span className="font-semibold">{po.currency_code || 'USD'} {po.total_amount?.toFixed(2) || '0.00'}</span>
                    </div>
                </CardContent>
            </Card>

            {po.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
