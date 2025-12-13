"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Edit,
    Trash2,
    FileText,
    Download,
    MoreHorizontal,
    ArrowRight,
    CheckCircle2,
    Copy,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DocumentFormatter } from "@/lib/utils/documentFormatter";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";

interface QuoteListProps {
    quotes: any[];
    viewMode: 'card' | 'list';
    selectedQuotes: string[];
    onSelectQuote: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onEdit: (quote: any) => void;
    onDelete: (quote: any) => void;
    onGeneratePdf: (id: string) => void;
    generatingPdfId: string | null;
    onConvertToPI: (quote: any) => void;
    onRevise: (quote: any) => void;
    onMarkSent: (quote: any) => void;
    onMarkApproved: (quote: any) => void;
}

export function QuoteList({
    quotes,
    viewMode,
    selectedQuotes,
    onSelectQuote,
    onSelectAll,
    onEdit,
    onDelete,
    onGeneratePdf,
    generatingPdfId,
    onConvertToPI,
    onRevise,
    onMarkSent,
    onMarkApproved
}: QuoteListProps) {
    const router = useRouter();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'secondary'; // Blue-ish in UI usually, secondary is safe neutral
            case 'revised': return 'outline';
            case 'approved': return 'default'; // Primary (Purple) or we can use className for Green
            case 'rejected': return 'destructive';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    const handleActionClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    if (!quotes || quotes.length === 0) {
        return (
            <EmptyState
                icon={FileText}
                title="No quotes found"
                description="Create a new quote to get started with your sales process."
            />
        );
    }

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.map((quote) => (
                    <Card
                        key={quote.id}
                        className={`shadow-sm hover:shadow-md hover-lift transition-shadow relative cursor-pointer border-l-4 border-l-primary ${selectedQuotes.includes(quote.id) ? 'bg-primary/5' : ''}`}
                        onClick={() => router.push(`/quotes/${quote.id}`)}
                    >
                        <div className="absolute top-3 right-3 z-10" onClick={handleActionClick}>
                            <Checkbox
                                checked={selectedQuotes.includes(quote.id)}
                                onCheckedChange={() => onSelectQuote(quote.id)}
                            />
                        </div>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-6">
                                    <div className="font-semibold text-lg">
                                        {DocumentFormatter.formatDocumentNumber(quote.quote_number, quote.version || 1, quote.status)}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {quote.entities?.name || "No buyer"}
                                    </div>
                                </div>
                                <div className="flex gap-1" onClick={handleActionClick}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(quote)} title="Edit" aria-label="Edit quote">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(quote)} aria-label="Delete quote">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Badge
                                    variant={getStatusColor(quote.status)}
                                    className={
                                        quote.status === 'approved' || quote.status === 'converted' ? 'bg-green-600 hover:bg-green-700 bg-opacity-90' :
                                            quote.status === 'sent' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20' : ''
                                    }
                                >
                                    {quote.status}
                                </Badge>
                                <Badge variant="outline">{quote.currency_code || 'USD'}</Badge>
                            </div>

                            <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                <div>Date: {new Date(quote.quote_date).toLocaleDateString()}</div>
                                {quote.total_amount > 0 && (
                                    <div className="font-semibold text-foreground">
                                        Total: {quote.currency_code || 'USD'} {quote.total_amount.toFixed(2)}
                                    </div>
                                )}
                                {quote.quote_items && (
                                    <div>{quote.quote_items.length} item(s)</div>
                                )}
                                {quote.enquiries && (
                                    <div className="pt-1 text-xs" onClick={handleActionClick}>
                                        Enquiry: <Link href="/enquiries" className="text-primary hover:underline">{quote.enquiries.enquiry_number}</Link>
                                    </div>
                                )}
                                {quote.proforma_invoices && (
                                    <div className="pt-1 text-xs">
                                        PI: <span className="font-medium">{quote.proforma_invoices.invoice_number}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2" onClick={handleActionClick}>
                                <Button size="sm" variant="outline" onClick={() => onGeneratePdf(quote.id)} disabled={generatingPdfId === quote.id}>
                                    {generatingPdfId === quote.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin text-primary" />
                                    ) : (
                                        <Download className="h-3 w-3 mr-1" />
                                    )}
                                    PDF
                                </Button>
                                {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                    <>
                                        <Button size="sm" variant="outline" onClick={() => onConvertToPI(quote)}>
                                            <FileText className="h-3 w-3 mr-1" /> To PI
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => onRevise(quote)}>
                                            <Copy className="h-3 w-3 mr-1" /> Revise
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

    // List view using DataTable with custom checkbox column
    const columns: DataTableColumn<any>[] = [
        {
            key: 'select',
            header: '',
            width: 'w-[50px]',
            cell: (quote) => (
                <Checkbox
                    checked={selectedQuotes.includes(quote.id)}
                    onCheckedChange={() => onSelectQuote(quote.id)}
                    aria-label={`Select quote ${quote.quote_number}`}
                    onClick={(e) => e.stopPropagation()}
                />
            )
        },
        {
            key: 'quote_number',
            header: 'Quote #',
            width: 'w-[140px]',
            sortable: true,
            cellClassName: 'font-medium',
            cell: (quote) => (
                <span className="font-medium text-gray-900 dark:text-gray-100">
                    {DocumentFormatter.formatDocumentNumber(quote.quote_number, quote.version || 1, quote.status)}
                </span>
            )
        },
        {
            key: 'buyer',
            header: 'Buyer',
            width: 'w-[180px]',
            sortable: true,
            cell: (quote) => quote.entities?.name || "—"
        },
        {
            key: 'quote_date',
            header: 'Date',
            width: 'w-[120px]',
            sortable: true,
            cell: (quote) => new Date(quote.quote_date).toLocaleDateString()
        },
        {
            key: 'total_amount',
            header: 'Amount',
            width: 'w-[140px]',
            sortable: true,
            cell: (quote) => `${quote.currency_code || 'USD'} ${Number(quote.total_amount).toFixed(2)}`
        },
        {
            key: 'status',
            header: 'Status',
            width: 'w-[120px]',
            sortable: true,
            cell: (quote) => (
                <Badge
                    variant={getStatusColor(quote.status) as any}
                    className={
                        quote.status === 'approved' || quote.status === 'converted' ? 'bg-green-600 hover:bg-green-700 bg-opacity-90' :
                            quote.status === 'sent' ? 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20' : ''
                    }
                >
                    {quote.status}
                </Badge>
            )
        },
        {
            key: 'reference',
            header: 'Reference',
            width: 'w-[180px]',
            cell: (quote) => (
                <div className="space-y-1">
                    {quote.enquiries && (
                        <div className="flex items-center text-muted-foreground text-xs">
                            <span className="mr-1">From:</span>
                            <a href={`/enquiries/${quote.enquiries.id}`} onClick={(e) => e.stopPropagation()} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded hover:underline font-medium">
                                {quote.enquiries.enquiry_number}
                            </a>
                        </div>
                    )}
                    {quote.proforma_invoices && (
                        <div className="flex items-center text-muted-foreground text-xs">
                            <span className="mr-1">To:</span>
                            <a href={`/invoices/proforma/${quote.proforma_invoices.id}`} onClick={(e) => e.stopPropagation()} className="bg-primary/10 text-primary dark:bg-primary/20 px-1.5 py-0.5 rounded hover:underline font-medium">
                                {quote.proforma_invoices.invoice_number}
                            </a>
                        </div>
                    )}
                    {(!quote.enquiries && !quote.proforma_invoices) && <span className="text-muted-foreground text-xs">—</span>}
                </div>
            )
        }
    ];

    return (
        <div className="border rounded-md bg-card">
            <DataTable
                data={quotes}
                columns={columns}
                onRowClick={(quote) => router.push(`/quotes/${quote.id}`)}
                actions={(quote) => (
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(quote)} title="Edit" aria-label="Edit quote">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onGeneratePdf(quote.id)} disabled={generatingPdfId === quote.id} title="Download PDF" aria-label="Download PDF">
                            {generatingPdfId === quote.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                        </Button>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="View details">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onMarkSent(quote)} disabled={quote.status === 'sent'}>
                                    <ArrowRight className="h-4 w-4 mr-2" /> Mark as Sent
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onMarkApproved(quote)} disabled={quote.status === 'approved'}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" /> Mark as Approved
                                </DropdownMenuItem>
                                {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                    <>
                                        <DropdownMenuItem onClick={() => onConvertToPI(quote)}>
                                            <FileText className="h-4 w-4 mr-2" /> Convert to PI
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/quotes/${quote.id}/edit`)}>
                                            <Edit className="mr-2 h-4 w-4" /> Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => onRevise(quote)}>
                                            <Copy className="h-4 w-4 mr-2" /> Create Revision
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(quote)}>
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
