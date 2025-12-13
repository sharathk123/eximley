/**
 * EnquiryDetailsTab Component
 * 
 * Details tab showing customer information and enquiry details
 */

"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import {
    CheckCircle2,
    XCircle,
    User,
    Mail,
    Phone,
    Building2,
    Globe,
    Activity,
    Flag,
    Calendar,
    FileText,
    AlignLeft,
    Share2,
    Package
} from 'lucide-react';
import type { Enquiry } from '@/types/enquiry';
import { getStatusColor, getPriorityColor, formatEnquiryDate, formatCurrency, formatQuantity } from '@/lib/utils/enquiryHelpers';

interface EnquiryDetailsTabProps {
    enquiry: Enquiry;
}

export function EnquiryDetailsTab({ enquiry }: EnquiryDetailsTabProps) {
    const items = enquiry.items || [];

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Customer Information Card */}
                <Card className="shadow-sm border-muted/40 h-full">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            Customer Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <User className="h-4 w-4" />
                                <span className="font-medium">Name</span>
                            </div>
                            <div className="sm:col-span-2 font-medium">{enquiry.customer_name}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-4 w-4" />
                                <span className="font-medium">Email</span>
                            </div>
                            <div className="sm:col-span-2">{enquiry.customer_email || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-4 w-4" />
                                <span className="font-medium">Phone</span>
                            </div>
                            <div className="sm:col-span-2">{enquiry.customer_phone || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Building2 className="h-4 w-4" />
                                <span className="font-medium">Company</span>
                            </div>
                            <div className="sm:col-span-2">{enquiry.customer_company || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="h-4 w-4" />
                                <span className="font-medium">Country</span>
                            </div>
                            <div className="sm:col-span-2">{enquiry.customer_country || "—"}</div>
                        </div>
                    </CardContent>
                </Card>

                {/* Enquiry Details Card */}
                <Card className="shadow-sm border-muted/40 h-full">
                    <CardHeader className="pb-3 border-b bg-muted/20">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            Enquiry Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Activity className="h-4 w-4" />
                                <span className="font-medium">Status</span>
                            </div>
                            <div className="sm:col-span-2">
                                <Badge
                                    variant={getStatusColor(enquiry.status)}
                                    className="uppercase text-xs font-semibold px-3 py-1"
                                >
                                    {enquiry.status === 'new' && <span className="mr-1.5">●</span>}
                                    {enquiry.status === 'won' && <CheckCircle2 className="h-3 w-3 mr-1.5" />}
                                    {enquiry.status === 'lost' && <XCircle className="h-3 w-3 mr-1.5" />}
                                    {enquiry.status}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Share2 className="h-4 w-4" />
                                <span className="font-medium">Source</span>
                            </div>
                            <div className="sm:col-span-2 capitalize">{enquiry.source?.replace('_', ' ') || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Flag className="h-4 w-4" />
                                <span className="font-medium">Priority</span>
                            </div>
                            <div className="sm:col-span-2">
                                <Badge variant={getPriorityColor(enquiry.priority)} className="font-semibold">
                                    {enquiry.priority}
                                </Badge>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span className="font-medium">Follow-up</span>
                            </div>
                            <div className="sm:col-span-2">{formatEnquiryDate(enquiry.next_follow_up_date)}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <AlignLeft className="h-4 w-4" />
                                <span className="font-medium">Subject</span>
                            </div>
                            <div className="sm:col-span-2 text-foreground/90">{enquiry.subject || "—"}</div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                                <FileText className="h-4 w-4" />
                                <span className="font-medium">Description</span>
                            </div>
                            <div className="sm:col-span-2 whitespace-pre-wrap text-foreground/80 leading-relaxed">
                                {enquiry.description || "—"}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Products & Items Card */}
            <Card className="shadow-sm border-muted/40">
                <CardHeader className="pb-3 border-b bg-muted/20">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        Products & Items
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[50px] pl-6">#</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead>SKU Code</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right pr-6">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="py-0">
                                        <EmptyState
                                            icon={Package}
                                            title="No items"
                                            description="No enquiry items have been added yet."
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((item, index) => (
                                    <TableRow key={item.id} className="hover:bg-muted/5">
                                        <TableCell className="font-medium pl-6">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{item.product_name}</TableCell>
                                        <TableCell className="text-muted-foreground">{item.sku_code || "—"}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">
                                            {item.description || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">{formatQuantity(item.quantity)}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                        <TableCell className="text-right font-medium pr-6">
                                            {formatCurrency(item.total_price)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
