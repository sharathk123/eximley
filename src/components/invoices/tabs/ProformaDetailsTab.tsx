import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/StatusBadge";

interface ProformaDetailsTabProps {
    invoice: any;
}

export function ProformaDetailsTab({ invoice }: ProformaDetailsTabProps) {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Invoice Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Invoice Number</div>
                                <div className="text-lg font-bold">{invoice.invoice_number}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Status</div>
                                <StatusBadge status={invoice.status} className="mt-1" />
                            </div>
                            {invoice.version && invoice.version > 1 && (
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Version</div>
                                    <div>V{invoice.version}</div>
                                </div>
                            )}
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Date</div>
                                <div>{new Date(invoice.date).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Currency</div>
                                <div>{invoice.currency_code} (Rate: {invoice.conversion_rate})</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Approval/Rejection Audit Information */}
            {(invoice.approved_by || invoice.rejected_by) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Approval Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {invoice.approved_by && (
                            <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Approved By</div>
                                    <div className="font-medium">{invoice.approved_by}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-muted-foreground">Approved At</div>
                                    <div>{new Date(invoice.approved_at).toLocaleString('en-IN')}</div>
                                </div>
                            </div>
                        )}
                        {invoice.rejected_by && (
                            <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Rejected By</div>
                                        <div className="font-medium">{invoice.rejected_by}</div>
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground">Rejected At</div>
                                        <div>{new Date(invoice.rejected_at).toLocaleString('en-IN')}</div>
                                    </div>
                                </div>
                                {invoice.rejection_reason && (
                                    <div>
                                        <div className="text-sm font-medium text-muted-foreground mb-1">Rejection Reason</div>
                                        <div className="text-sm p-3 bg-white dark:bg-gray-800 rounded border">{invoice.rejection_reason}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Buyer Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {invoice.entities ? (
                            <div className="space-y-2">
                                <div className="text-lg font-semibold">{invoice.entities.name}</div>
                                {invoice.entities.address && <div className="text-muted-foreground whitespace-pre-wrap">{invoice.entities.address}</div>}
                                {invoice.entities.email && <div>{invoice.entities.email}</div>}
                                {invoice.entities.phone && <div>{invoice.entities.phone}</div>}
                            </div>
                        ) : (
                            <div className="text-muted-foreground">No buyer details available</div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {invoice.lut_id && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-sm font-medium text-muted-foreground">Letter of Undertaking (LUT)</div>
                        <div>Export under LUT (Zero Rated)</div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
