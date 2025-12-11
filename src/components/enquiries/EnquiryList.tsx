"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Trash2,
    Edit,
    FileText,
    CheckCircle2
} from "lucide-react";

interface EnquiryListProps {
    enquiries: any[];
    viewMode: 'card' | 'list';
    onEdit: (enquiry: any) => void;
    onDelete: (enquiry: any) => void;
    onView: (enquiry: any) => void;
    onConvert: (enquiry: any) => void;
    onMarkStatus: (enquiry: any, status: string) => void;
}

export function EnquiryList({
    enquiries,
    viewMode,
    onEdit,
    onDelete,
    onView,
    onConvert,
    onMarkStatus
}: EnquiryListProps) {

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'default'; // Uses primary variable
            case 'contacted': return 'secondary';
            case 'quoted': return 'outline';
            case 'won': return 'default';
            case 'lost': return 'destructive';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'destructive';
            case 'high': return 'default';
            case 'medium': return 'secondary';
            case 'low': return 'outline';
            default: return 'outline';
        }
    };

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enquiries.map((enquiry) => (
                    <Card
                        key={enquiry.id}
                        className="shadow-sm hover:shadow-md hover-lift transition-shadow cursor-pointer border-l-4 border-l-primary"
                        onClick={() => onView(enquiry)}
                    >
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-semibold text-lg text-foreground">{enquiry.customer_name}</div>
                                    <div className="text-sm text-muted-foreground">{enquiry.enquiry_number}</div>
                                </div>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted"
                                        onClick={() => onEdit(enquiry)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(enquiry)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Badge variant={getStatusColor(enquiry.status) as any}>{enquiry.status}</Badge>
                                <Badge variant={getPriorityColor(enquiry.priority) as any}>{enquiry.priority}</Badge>
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                {enquiry.customer_company && <div>Company: {enquiry.customer_company}</div>}
                                {enquiry.email && <div>Email: {enquiry.email}</div>}
                                {enquiry.subject && <div>Subject: {enquiry.subject}</div>}
                                {enquiry.next_follow_up_date && (
                                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">Follow-up: {new Date(enquiry.next_follow_up_date).toLocaleDateString()}</div>
                                )}
                                {enquiry.quotes && enquiry.quotes.length > 0 && (
                                    <div className="pt-1 text-xs">
                                        Quote: <span className="font-medium text-primary">{enquiry.quotes[0].quote_number}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                {enquiry.status !== 'converted' && enquiry.status !== 'won' && enquiry.status !== 'lost' && (
                                    <>
                                        <Button size="sm" variant="outline" className="text-xs h-7 border-primary/20 hover:border-primary/50" onClick={() => onConvert(enquiry)}>
                                            <FileText className="h-3 w-3 mr-1 text-primary" /> Quote
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-xs h-7 border-green-500/20 hover:border-green-500/50" onClick={() => onMarkStatus(enquiry, 'won')}>
                                            <CheckCircle2 className="h-3 w-3 mr-1 text-green-600 dark:text-green-400" /> Won
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="border border-border rounded-md bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[120px]">Enquiry #</TableHead>
                        <TableHead className="w-[150px]">Customer</TableHead>
                        <TableHead className="w-[150px]">Company</TableHead>
                        <TableHead className="hidden md:table-cell w-[200px]">Interested Products</TableHead>
                        <TableHead className="hidden md:table-cell w-[100px]">Source</TableHead>
                        <TableHead className="w-[100px]">Status</TableHead>
                        <TableHead className="w-[100px]">Priority</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {enquiries.map((enquiry) => (
                        <TableRow
                            key={enquiry.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => onView(enquiry)}
                        >
                            <TableCell className="font-medium text-foreground">{enquiry.enquiry_number}</TableCell>
                            <TableCell>{enquiry.customer_name}</TableCell>
                            <TableCell>{enquiry.customer_company || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell">
                                {enquiry.enquiry_items && enquiry.enquiry_items.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                        {enquiry.enquiry_items.map((item: any, index: number) => (
                                            <Badge key={index} variant="secondary" className="px-1 py-0 text-[10px] font-normal h-5 truncate max-w-[150px]">
                                                {item.skus?.products?.name || item.skus?.name || item.skus?.sku_code || "Unknown"}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell className="hidden md:table-cell capitalize">{enquiry.source?.replace('_', ' ') || "—"}</TableCell>
                            <TableCell><Badge variant={getStatusColor(enquiry.status) as any}>{enquiry.status}</Badge></TableCell>
                            <TableCell><Badge variant={getPriorityColor(enquiry.priority) as any}>{enquiry.priority}</Badge></TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                        onClick={() => onEdit(enquiry)}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                        onClick={() => onDelete(enquiry)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
