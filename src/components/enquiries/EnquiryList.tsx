"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Trash2,
    Edit,
    FileText,
    CheckCircle2,
    XCircle,
    MoreHorizontal
} from "lucide-react";
import { useRouter } from "next/navigation";
import { DocumentFormatter } from "@/lib/utils/documentFormatter";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

interface EnquiryListProps {
    enquiries: any[];
    viewMode: 'card' | 'list';
    onDelete: (enquiry: any) => void;
    onConvert: (enquiry: any) => void;
    onMarkStatus: (enquiry: any, status: string) => void;
}

export function EnquiryList({
    enquiries,
    viewMode,
    onDelete,
    onConvert,
    onMarkStatus
}: EnquiryListProps) {
    const router = useRouter();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'default';
            case 'contacted': return 'secondary';
            case 'quoted': return 'outline';
            case 'won': return 'default'; // Green ideally
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

    if (!enquiries || enquiries.length === 0) {
        return (
            <EmptyState
                icon={FileText}
                title="No enquiries found"
                description="Record new enquiries to track customer interest and generate leads."
            />
        );
    }

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enquiries.map((enquiry) => (
                    <Card
                        key={enquiry.id}
                        className="shadow-sm hover:shadow-md hover-lift transition-shadow relative cursor-pointer card-primary-border"
                        onClick={() => router.push(`/enquiries/${enquiry.id}`)}
                    >
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-semibold text-lg text-foreground">{enquiry.customer_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {DocumentFormatter.formatDocumentNumber(enquiry.enquiry_number, enquiry.version || 1, enquiry.status)}
                                    </div>
                                </div>
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={() => router.push(`/enquiries/${enquiry.id}/edit`)} aria-label="Edit enquiry">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => onDelete(enquiry)} aria-label="Delete enquiry">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Badge
                                    variant={getStatusColor(enquiry.status) as any}
                                    className={
                                        enquiry.status === 'won' || enquiry.status === 'converted' ? 'bg-green-600 hover:bg-green-700 bg-opacity-90 border-transparent text-white' :
                                            enquiry.status === 'new' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20' : ''
                                    }
                                >
                                    {enquiry.status}
                                </Badge>
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

    // List view using DataTable
    const columns: DataTableColumn<any>[] = [
        {
            key: 'enquiry_number',
            header: 'Enquiry #',
            width: 'w-[120px]',
            sortable: true,
            cellClassName: 'font-medium',
            cell: (enq) => DocumentFormatter.formatDocumentNumber(enq.enquiry_number, enq.version || 1, enq.status)
        },
        {
            key: 'customer_name',
            header: 'Customer',
            width: 'w-[150px]',
            sortable: true,
            cell: (enq) => enq.customer_name
        },
        {
            key: 'enquiry_date',
            header: 'Date',
            width: 'w-[120px]',
            sortable: true,
            cell: (enq) => new Date(enq.enquiry_date).toLocaleDateString()
        },
        {
            key: 'customer_company',
            header: 'Company',
            width: 'w-[150px]',
            cell: (enq) => enq.customer_company || "—"
        },
        {
            key: 'products',
            header: 'Interested Products',
            width: 'w-[200px]',
            headerClassName: 'hidden md:table-cell',
            cellClassName: 'hidden md:table-cell',
            cell: (enq) => enq.enquiry_items && enq.enquiry_items.length > 0 ? (
                <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {enq.enquiry_items.map((item: any, index: number) => (
                        <Badge key={index} variant="secondary" className="px-1 py-0 text-[10px] font-normal h-5 truncate max-w-[150px]">
                            {item.skus?.products?.name || item.skus?.name || item.skus?.sku_code || "Unknown"}
                        </Badge>
                    ))}
                </div>
            ) : <span className="text-muted-foreground text-xs">—</span>
        },
        {
            key: 'source',
            header: 'Source',
            width: 'w-[100px]',
            headerClassName: 'hidden md:table-cell',
            cellClassName: 'hidden md:table-cell capitalize',
            cell: (enq) => enq.source?.replace('_', ' ') || "—"
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[100px]',
            sortable: true,
            cell: (enq) => (
                <Badge
                    variant={getStatusColor(enq.status) as any}
                    className={
                        enq.status === 'won' || enq.status === 'converted' ? 'bg-green-600 hover:bg-green-700 bg-opacity-90 border-transparent text-white' :
                            enq.status === 'new' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20' : ''
                    }
                >
                    {enq.status}
                </Badge>
            )
        },
        {
            key: 'priority',
            header: 'Priority',
            width: 'w-[100px]',
            sortable: true,
            cell: (enq) => <Badge variant={getPriorityColor(enq.priority) as any}>{enq.priority}</Badge>
        },
        {
            key: 'reference',
            header: 'Reference',
            width: 'w-[150px]',
            cell: (enq) => enq.quotes && enq.quotes.length > 0 ? (
                <div className="flex items-center text-muted-foreground text-xs">
                    <span className="mr-1">To:</span>
                    <a href={`/quotes/${enq.quotes[0].id}`} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
                        {enq.quotes[0].quote_number}
                    </a>
                </div>
            ) : <span className="text-muted-foreground text-xs">—</span>
        }
    ];

    return (
        <div className="border rounded-md bg-card">
            <DataTable
                data={enquiries}
                columns={columns}
                onRowClick={(enq) => router.push(`/enquiries/${enq.id}`)}
                actions={(enq) => (
                    <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/enquiries/${enq.id}/edit`)} title="Edit" className="h-8 w-8" aria-label="Edit enquiry">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View details">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/enquiries/${enq.id}/edit`)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit Enquiry
                                </DropdownMenuItem>
                                {enq.status !== 'converted' && enq.status !== 'won' && enq.status !== 'lost' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onConvert(enq)}>
                                            <FileText className="h-4 w-4 mr-2" /> Create Quote
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onMarkStatus(enq, 'won')}>
                                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Mark as Won
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onMarkStatus(enq, 'lost')}>
                                            <XCircle className="h-4 w-4 mr-2 text-destructive" /> Mark as Lost
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(enq)}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            />
        </div>
    );
}
