import { Card, CardContent } from "@/components/ui/card";

interface PurchaseOrderPreviewTabProps {
    po: any;
}

export function PurchaseOrderPreviewTab({ po }: PurchaseOrderPreviewTabProps) {
    const items = po.purchase_order_items || [];

    return (
        <Card>
            <CardContent className="p-8">
                {/* PO Preview - Similar to PDF layout */}
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                        <h1 className="text-3xl font-bold">PURCHASE ORDER</h1>
                        <p className="text-xl mt-2">{po.po_number}</p>
                        {po.version > 1 && <p className="text-sm text-muted-foreground">Version {po.version}</p>}
                    </div>

                    {/* PO Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Vendor</h3>
                            <p>{po.entities?.name}</p>
                            {po.entities?.address && <p className="text-sm text-muted-foreground">{po.entities.address}</p>}
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Order Details</h3>
                            <p>Date: {new Date(po.order_date).toLocaleDateString()}</p>
                            <p>Status: {po.status?.toUpperCase()}</p>
                            {po.delivery_date && <p>Delivery: {new Date(po.delivery_date).toLocaleDateString()}</p>}
                        </div>
                    </div>

                    {/* Items Table */}
                    <div>
                        <h3 className="font-semibold mb-3">Items</h3>
                        <table className="w-full border">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="border p-2 text-left">SKU</th>
                                    <th className="border p-2 text-left">Description</th>
                                    <th className="border p-2 text-right">Qty</th>
                                    <th className="border p-2 text-right">Price</th>
                                    <th className="border p-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="border p-2">{item.skus?.sku_code || 'N/A'}</td>
                                        <td className="border p-2">{item.skus?.name || 'N/A'}</td>
                                        <td className="border p-2 text-right">{item.quantity}</td>
                                        <td className="border p-2 text-right">{item.unit_price?.toFixed(2)}</td>
                                        <td className="border p-2 text-right">
                                            {(item.quantity * item.unit_price).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                                <span>Subtotal:</span>
                                <span>{po.currency_code} {po.subtotal?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>{po.currency_code} {po.tax_total?.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between border-t pt-2 font-bold">
                                <span>Total:</span>
                                <span>{po.currency_code} {po.total_amount?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {po.notes && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Notes</h3>
                            <p className="text-sm whitespace-pre-wrap">{po.notes}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
