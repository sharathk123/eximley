import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ShippingBillDetailsTabProps {
    sb: any;
}

export function ShippingBillDetailsTab({ sb }: ShippingBillDetailsTabProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Shipping Bill Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">SB Number</p>
                        <p className="font-medium">{sb.sb_number}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">SB Date</p>
                        <p className="font-medium">{new Date(sb.sb_date).toLocaleDateString()}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge>{sb.status?.toUpperCase()}</Badge>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Version</p>
                        <p className="font-medium">V{sb.version || 1}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Currency</p>
                        <p className="font-medium">{sb.currency_code || 'USD'}</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Customs Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Port Code</p>
                        <p className="font-medium">{sb.port_code || '-'}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Customs House</p>
                        <p className="font-medium">{sb.customs_house || '-'}</p>
                    </div>
                    {sb.customs_officer_name && (
                        <div>
                            <p className="text-sm text-muted-foreground">Customs Officer</p>
                            <p className="font-medium">{sb.customs_officer_name}</p>
                        </div>
                    )}
                    {sb.ad_code && (
                        <div>
                            <p className="text-sm text-muted-foreground">AD Code</p>
                            <p className="font-medium">{sb.ad_code}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {(sb.vessel_name || sb.port_of_loading) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Vessel & Shipment</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        {sb.vessel_name && (
                            <div>
                                <p className="text-sm text-muted-foreground">Vessel Name</p>
                                <p className="font-medium">{sb.vessel_name}</p>
                            </div>
                        )}
                        {sb.voyage_number && (
                            <div>
                                <p className="text-sm text-muted-foreground">Voyage Number</p>
                                <p className="font-medium">{sb.voyage_number}</p>
                            </div>
                        )}
                        {sb.port_of_loading && (
                            <div>
                                <p className="text-sm text-muted-foreground">Port of Loading</p>
                                <p className="font-medium">{sb.port_of_loading}</p>
                            </div>
                        )}
                        {sb.port_of_discharge && (
                            <div>
                                <p className="text-sm text-muted-foreground">Port of Discharge</p>
                                <p className="font-medium">{sb.port_of_discharge}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {(sb.consignee_name || sb.consignee_country) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Consignee Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {sb.consignee_name && (
                            <div>
                                <p className="text-sm text-muted-foreground">Consignee Name</p>
                                <p className="font-medium">{sb.consignee_name}</p>
                            </div>
                        )}
                        {sb.consignee_address && (
                            <div>
                                <p className="text-sm text-muted-foreground">Address</p>
                                <p className="font-medium">{sb.consignee_address}</p>
                            </div>
                        )}
                        {sb.consignee_country && (
                            <div>
                                <p className="text-sm text-muted-foreground">Country</p>
                                <p className="font-medium">{sb.consignee_country}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">FOB Value</span>
                        <span className="font-medium">{sb.currency_code || 'USD'} {sb.fob_value?.toFixed(2) || '0.00'}</span>
                    </div>
                    {sb.freight_value > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Freight</span>
                            <span className="font-medium">{sb.currency_code || 'USD'} {sb.freight_value?.toFixed(2)}</span>
                        </div>
                    )}
                    {sb.insurance_value > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Insurance</span>
                            <span className="font-medium">{sb.currency_code || 'USD'} {sb.insurance_value?.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-t pt-2">
                        <span className="font-semibold">Total Value</span>
                        <span className="font-semibold">{sb.currency_code || 'USD'} {sb.total_value?.toFixed(2) || '0.00'}</span>
                    </div>
                </CardContent>
            </Card>

            {sb.notes && (
                <Card>
                    <CardHeader>
                        <CardTitle>Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm whitespace-pre-wrap">{sb.notes}</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
