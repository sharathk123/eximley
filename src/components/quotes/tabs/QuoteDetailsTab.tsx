"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Building2, Globe, Activity, Flag, Calendar, AlignLeft, Ship, Plane, Anchor, DollarSign, Package, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface QuoteDetailsTabProps {
    quote: any;
}

export function QuoteDetailsTab({ quote }: QuoteDetailsTabProps) {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'default';
            case 'revised': return 'outline';
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Buyer Information Card */}
                <Card className="shadow-sm border-muted/40 h-full">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Buyer Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span className="font-medium">Name</span>
                            </div>
                            <div className="sm:col-span-2 font-medium">{quote.entities?.name || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="font-medium">Email</span>
                            </div>
                            <div className="sm:col-span-2">{quote.entities?.email || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span className="font-medium">Phone</span>
                            </div>
                            <div className="sm:col-span-2">{quote.entities?.phone || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="h-4 w-4" />
                                <span className="font-medium">Country</span>
                            </div>
                            <div className="sm:col-span-2">{quote.entities?.country || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">Address</span>
                            </div>
                            <div className="sm:col-span-2 whitespace-pre-wrap">{quote.entities?.address || "—"}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Quote Details Card */}
                <Card className="shadow-sm border-muted/40 h-full">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Quote Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Activity className="h-4 w-4" />
                                <span className="font-medium">Status</span>
                            </div>
                            <div className="sm:col-span-2">
                                <Badge variant={getStatusColor(quote.status)} className="uppercase text-xs font-semibold px-3 py-1">
                                    {quote.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Date</span>
                            </div>
                            <div className="sm:col-span-2">{new Date(quote.quote_date).toLocaleDateString()}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Valid Until</span>
                            </div>
                            <div className="sm:col-span-2">
                                {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString() : '—'}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Flag className="h-4 w-4" />
                                <span className="font-medium">Currency</span>
                            </div>
                            <div className="sm:col-span-2">{quote.currency_code || 'USD'}</div>
                        </div>

                        {quote.notes && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <AlignLeft className="h-4 w-4" />
                                    <span className="font-medium">Notes</span>
                                </div>
                                <div className="sm:col-span-2 text-foreground/90 whitespace-pre-wrap">{quote.notes}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Logistics & Shipping Card */}
                {(quote.mode_transport || quote.port_loading) && (
                    <Card className="shadow-sm border-muted/40 h-full lg:col-span-2">
                        <CardHeader className="pb-3 border-b bg-muted/20">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Ship className="h-4 w-4 text-primary" />
                                Logistics & Shipping
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {quote.mode_transport && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Plane className="h-4 w-4" />
                                            <span className="font-medium">Transport Mode</span>
                                        </div>
                                        <p className="font-medium pl-6">{quote.mode_transport}</p>
                                    </div>
                                )}
                                {quote.port_loading && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Anchor className="h-4 w-4" />
                                            <span className="font-medium">Port of Loading</span>
                                        </div>
                                        <p className="font-medium pl-6">{quote.port_loading}</p>
                                    </div>
                                )}
                                {quote.port_discharge && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Anchor className="h-4 w-4" />
                                            <span className="font-medium">Port of Discharge</span>
                                        </div>
                                        <p className="font-medium pl-6">{quote.port_discharge}</p>
                                    </div>
                                )}
                                {quote.origin_country && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Globe className="h-4 w-4" />
                                            <span className="font-medium">Origin</span>
                                        </div>
                                        <p className="font-medium pl-6">{quote.origin_country}</p>
                                    </div>
                                )}
                                {quote.packaging_details && (
                                    <div className="space-y-1 md:col-span-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Package className="h-4 w-4" />
                                            <span className="font-medium">Packaging</span>
                                        </div>
                                        <p className="font-medium pl-6">{quote.packaging_details}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Financial Summary Card */}
                <Card className="shadow-sm border-muted/40 h-full lg:col-span-2 bg-muted/5">
                    <CardHeader className="pb-3 border-b">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            Financial Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Subtotal</p>
                                <p className="text-lg font-medium">{quote.currency_code || 'USD'} {quote.subtotal?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Tax</p>
                                <p className="text-lg font-medium">{quote.currency_code || 'USD'} {quote.tax_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground mb-1">Discount</p>
                                <p className="text-lg font-medium text-destructive">- {quote.currency_code || 'USD'} {quote.discount_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="border-l pl-4">
                                <p className="text-sm font-bold text-muted-foreground mb-1">Total</p>
                                <p className="text-2xl font-bold text-primary">{quote.currency_code || 'USD'} {quote.total_amount?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
