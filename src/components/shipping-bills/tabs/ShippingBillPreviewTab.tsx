import { Card, CardContent } from "@/components/ui/card";

interface ShippingBillPreviewTabProps {
    sb: any;
}

export function ShippingBillPreviewTab({ sb }: ShippingBillPreviewTabProps) {
    const items = sb.shipping_bill_items || [];

    return (
        <Card>
            <CardContent className="p-8">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Header */}
                    <div className="text-center border-b pb-4">
                        <h1 className="text-3xl font-bold">SHIPPING BILL</h1>
                        <p className="text-xl mt-2">{sb.sb_number}</p>
                        {sb.version > 1 && <p className="text-sm text-muted-foreground">Version {sb.version}</p>}
                    </div>

                    {/* SB Info */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-2">Shipping Bill Details</h3>
                            <p>Date: {new Date(sb.sb_date).toLocaleDateString()}</p>
                            <p>Port: {sb.port_code}</p>
                            <p>Customs House: {sb.customs_house}</p>
                            <p>Status: {sb.status?.toUpperCase()}</p>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-2">Consignee</h3>
                            <p>{sb.consignee_name}</p>
                            {sb.consignee_address && <p className="text-sm text-muted-foreground">{sb.consignee_address}</p>}
                            {sb.consignee_country && <p className="text-sm">{sb.consignee_country}</p>}
                        </div>
                    </div>

                    {/* Vessel Info */}
                    {sb.vessel_name && (
                        <div>
                            <h3 className="font-semibold mb-2">Vessel Information</h3>
                            <p>Vessel: {sb.vessel_name} {sb.voyage_number && `- Voyage ${sb.voyage_number}`}</p>
                            {sb.port_of_loading && <p>Loading Port: {sb.port_of_loading}</p>}
                            {sb.port_of_discharge && <p>Discharge Port: {sb.port_of_discharge}</p>}
                        </div>
                    )}

                    {/* Items Table */}
                    <div>
                        <h3 className="font-semibold mb-3">Shipped Items</h3>
                        <table className="w-full border">
                            <thead className="bg-muted">
                                <tr>
                                    <th className="border p-2 text-left">HSN</th>
                                    <th className="border p-2 text-left">Description</th>
                                    <th className="border p-2 text-right">Qty</th>
                                    <th className="border p-2 text-right">FOB Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item: any, index: number) => (
                                    <tr key={index}>
                                        <td className="border p-2">{item.hsn_code}</td>
                                        <td className="border p-2">{item.description}</td>
                                        <td className="border p-2 text-right">{item.quantity}</td>
                                        <td className="border p-2 text-right">
                                            {item.fob_value?.toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between">
                                <span>FOB Value:</span>
                                <span>{sb.currency_code} {sb.fob_value?.toFixed(2)}</span>
                            </div>
                            {sb.freight_value > 0 && (
                                <div className="flex justify-between">
                                    <span>Freight:</span>
                                    <span>{sb.currency_code} {sb.freight_value?.toFixed(2)}</span>
                                </div>
                            )}
                            {sb.insurance_value > 0 && (
                                <div className="flex justify-between">
                                    <span>Insurance:</span>
                                    <span>{sb.currency_code} {sb.insurance_value?.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-2 font-bold">
                                <span>Total:</span>
                                <span>{sb.currency_code} {sb.total_value?.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {sb.notes && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold mb-2">Notes</h3>
                            <p className="text-sm whitespace-pre-wrap">{sb.notes}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
