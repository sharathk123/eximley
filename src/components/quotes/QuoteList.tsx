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

interface QuoteListProps {
    quotes: any[];
    viewMode: 'card' | 'list';
    selectedQuotes: string[];
    onSelectQuote: (id: string) => void;
    onSelectAll: (checked: boolean) => void;
    onEdit: (quote: any) => void;
    onDelete: (quote: any) => void;
    onViewDetails: (quote: any) => void;
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
    onViewDetails,
    onGeneratePdf,
    generatingPdfId,
    onConvertToPI,
    onRevise,
    onMarkSent,
    onMarkApproved
}: QuoteListProps) {

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

    if (viewMode === 'card') {
        return (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quotes.map((quote) => (
                    <Card key={quote.id} className={`shadow-sm hover:shadow-md transition-shadow relative ${selectedQuotes.includes(quote.id) ? 'ring-2 ring-primary bg-primary/5' : ''}`}>
                        <div className="absolute top-3 right-3 z-10">
                            <Checkbox
                                checked={selectedQuotes.includes(quote.id)}
                                onCheckedChange={() => onSelectQuote(quote.id)}
                            />
                        </div>
                        <CardContent className="p-5 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 pr-6">
                                    <div className="font-semibold text-lg">{quote.quote_number}</div>
                                    <div className="text-sm text-muted-foreground">
                                        {quote.entities?.name || "No buyer"}
                                    </div>
                                    {quote.version > 1 && (
                                        <div className="text-xs text-muted-foreground">Version {quote.version}</div>
                                    )}
                                </div>
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onEdit(quote)}
                                        title="Edit"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => onDelete(quote)}
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Badge variant={getStatusColor(quote.status)}>{quote.status}</Badge>
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
                                    <div className="pt-1 text-xs">
                                        Enquiry: <Link href="/enquiries" className="text-primary hover:underline">{quote.enquiries.enquiry_number}</Link>
                                    </div>
                                )}
                                {quote.proforma_invoices && (
                                    <div className="pt-1 text-xs">
                                        PI: <span className="font-medium">{quote.proforma_invoices.invoice_number}</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => onViewDetails(quote)}
                                >
                                    <FileText className="h-3 w-3 mr-1" />
                                    View Details
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onGeneratePdf(quote.id)}
                                    disabled={generatingPdfId === quote.id}
                                >
                                    {generatingPdfId === quote.id ? (
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                        <Download className="h-3 w-3 mr-1" />
                                    )}
                                    PDF
                                </Button>
                                {quote.status !== 'converted' && quote.status !== 'rejected' && (
                                    <>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onConvertToPI(quote)}
                                        >
                                            <FileText className="h-3 w-3 mr-1" /> To PI
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => onRevise(quote)}
                                        >
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

    return (
        <div className="border rounded-md bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <Checkbox
                                checked={quotes.length > 0 && selectedQuotes.length === quotes.length}
                                onCheckedChange={(checked) => onSelectAll(checked as boolean)}
                                aria-label="Select all"
                            />
                        </TableHead>
                        <TableHead className="w-[140px]">Quote #</TableHead>
                        <TableHead className="w-[200px]">Buyer</TableHead>
                        <TableHead className="w-[120px]">Date</TableHead>
                        <TableHead className="w-[150px]">Total</TableHead>
                        <TableHead className="w-[140px]">Status</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quotes.map((quote) => (
                        <TableRow key={quote.id} className={selectedQuotes.includes(quote.id) ? "bg-muted/50" : ""}>
                            <TableCell>
                                <Checkbox
                                    checked={selectedQuotes.includes(quote.id)}
                                    onCheckedChange={() => onSelectQuote(quote.id)}
                                    aria-label={`Select quote ${quote.quote_number}`}
                                />
                            </TableCell>
                            <TableCell className="font-medium">
                                {quote.quote_number}
                                {quote.version > 1 && <span className="text-xs text-muted-foreground ml-1">(v{quote.version})</span>}
                            </TableCell>
                            <TableCell>{quote.entities?.name || "—"}</TableCell>
                            <TableCell>{new Date(quote.quote_date).toLocaleDateString()}</TableCell>
                            <TableCell>
                                {quote.total_amount > 0 ? `${quote.currency_code || 'USD'} ${quote.total_amount.toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                                <Badge variant={getStatusColor(quote.status)}>{quote.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onViewDetails(quote)}
                                        title="View Details"
                                    >
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onEdit(quote)}
                                        title="Edit"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onGeneratePdf(quote.id)}
                                        disabled={generatingPdfId === quote.id}
                                        title="Download PDF"
                                    >
                                        {generatingPdfId === quote.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Download className="h-4 w-4" />
                                        )}
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
