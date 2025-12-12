/**
 * ExportOrderDetailsTab Component
 * 
 * Displays order details including version info, approval status, buyer details, and payment/shipment information
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Building2, CreditCard, Ship, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface ExportOrderDetailsTabProps {
    order: any;
}

export function ExportOrderDetailsTab({ order }: ExportOrderDetailsTabProps) {
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
            approved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
            revised: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
            confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
            shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
            completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
            cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="space-y-6">
            {/* Order Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Order Number</div>
                            <div className="font-medium">{order.order_number}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Version</div>
                            <div className="font-medium">Version {order.version || 1}</div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Order Date</div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {order.order_date ? new Date(order.order_date).toLocaleDateString() : '-'}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Status</div>
                            <Badge className={getStatusColor(order.status)}>{order.status}</Badge>
                        </div>
                    </div>

                    {order.pi_id && order.proforma_invoices && (
                        <div>
                            <div className="text-sm text-muted-foreground mb-1">Linked Proforma Invoice</div>
                            <Link href={`/invoices/proforma/${order.pi_id}`} className="text-primary hover:underline flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {order.proforma_invoices.invoice_number}
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Approval/Rejection Info */}
            {(order.approved_at || order.rejected_at) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            {order.approved_at ? 'Approval Information' : 'Rejection Information'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {order.approved_at && (
                            <>
                                <div>
                                    <div className="text-sm text-muted-foreground">Approved By</div>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>{order.approved_by || 'System'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Approved At</div>
                                    <div>{new Date(order.approved_at).toLocaleString()}</div>
                                </div>
                            </>
                        )}
                        {order.rejected_at && (
                            <>
                                <div>
                                    <div className="text-sm text-muted-foreground">Rejected By</div>
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <span>{order.rejected_by || 'System'}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground">Rejected At</div>
                                    <div>{new Date(order.rejected_at).toLocaleString()}</div>
                                </div>
                                {order.rejection_reason && (
                                    <div className="bg-destructive/10 p-3 rounded-md">
                                        <div className="flex items-start gap-2">
                                            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                                            <div>
                                                <div className="text-sm font-medium text-destructive">Rejection Reason</div>
                                                <div className="text-sm mt-1">{order.rejection_reason}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Buyer Information */}
            {order.entities && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Buyer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <div className="text-sm text-muted-foreground">Company Name</div>
                            <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{order.entities.name}</span>
                            </div>
                        </div>
                        {order.entities.email && (
                            <div>
                                <div className="text-sm text-muted-foreground">Email</div>
                                <div>{order.entities.email}</div>
                            </div>
                        )}
                        {order.entities.phone && (
                            <div>
                                <div className="text-sm text-muted-foreground">Phone</div>
                                <div>{order.entities.phone}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Payment & Shipment Details */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Payment & Shipment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {order.payment_method && (
                            <div>
                                <div className="text-sm text-muted-foreground">Payment Method</div>
                                <div className="flex items-center gap-2">
                                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.payment_method}</span>
                                </div>
                            </div>
                        )}
                        {order.shipment_period && (
                            <div>
                                <div className="text-sm text-muted-foreground">Shipment Period</div>
                                <div className="flex items-center gap-2">
                                    <Ship className="h-4 w-4 text-muted-foreground" />
                                    <span>{order.shipment_period}</span>
                                </div>
                            </div>
                        )}
                        {order.latest_shipment_date && (
                            <div>
                                <div className="text-sm text-muted-foreground">Latest Shipment Date</div>
                                <div>{new Date(order.latest_shipment_date).toLocaleDateString()}</div>
                            </div>
                        )}
                        {order.lc_number && (
                            <div>
                                <div className="text-sm text-muted-foreground">LC Number</div>
                                <div>{order.lc_number}</div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm text-muted-foreground">Total Amount</div>
                            <div className="text-lg font-semibold">
                                {order.currency_code || 'USD'} {order.total_amount?.toLocaleString() || '0.00'}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-muted-foreground">Payment Status</div>
                            <Badge variant="outline">{order.payment_status || 'unpaid'}</Badge>
                        </div>
                    </div>

                    {order.notes && (
                        <div>
                            <div className="text-sm text-muted-foreground mb-1">Notes</div>
                            <div className="text-sm bg-muted/50 p-3 rounded-md">{order.notes}</div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
