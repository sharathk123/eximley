"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info as InfoIcon, ShieldAlert, FileText, Package, Copy, Loader2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentBrowser } from '@/components/documents/DocumentBrowser';
import { QuoteDocumentUpload } from './QuoteDocumentUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QuoteStatusActions } from './QuoteStatusActions';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface QuoteDetailsDialogProps {
    quote: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRefresh?: () => void;
}

export function QuoteDetailsDialog({ quote, open, onOpenChange, onRefresh }: QuoteDetailsDialogProps) {
    const [quoteItems, setQuoteItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [documentRefreshKey, setDocumentRefreshKey] = useState(0);
    const [duplicating, setDuplicating] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && quote?.id) {
            fetchQuoteItems();
        }
    }, [open, quote?.id]);

    async function fetchQuoteItems() {
        if (!quote?.id) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/quotes/${quote.id}/items`);
            if (res.ok) {
                const data = await res.json();
                setQuoteItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch quote items:', error);
        } finally {
            setLoading(false);
        }
    }

    const handleDocumentUploadComplete = () => {
        // Trigger refresh of document browser
        setDocumentRefreshKey(prev => prev + 1);
    };

    const handleDuplicate = async () => {
        if (!quote?.id) {
            console.error("Attempted to duplicate quote without ID", quote);
            toast({ title: 'Error', description: 'Invalid quote data', variant: 'destructive' });
            return;
        }

        setDuplicating(true);
        try {
            const res = await fetch(`/api/quotes/${quote.id}/duplicate`, {
                method: 'POST'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to duplicate quote');
            }

            const data = await res.json();
            toast({
                title: 'Success',
                description: `Quote duplicated: ${data.quote.quote_number}`
            });

            onOpenChange(false);
            if (onRefresh) onRefresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to duplicate quote',
                variant: 'destructive'
            });
        } finally {
            setDuplicating(false);
        }
    };

    if (!quote) return null;

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-3">
                            <span>{quote.quote_number}</span>
                            <Badge variant={getStatusColor(quote.status)}>{quote.status}</Badge>
                            {quote.version > 1 && (
                                <Badge variant="outline">v{quote.version}</Badge>
                            )}
                        </DialogTitle>
                        <div className="flex items-center gap-2">
                            <QuoteStatusActions quote={quote} onSuccess={onRefresh} />
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDuplicate}
                                disabled={duplicating}
                            >
                                {duplicating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Duplicating...
                                    </>
                                ) : (
                                    <>
                                        <Copy className="h-4 w-4 mr-2" />
                                        Duplicate
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">
                            <InfoIcon className="h-4 w-4 mr-2" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="items">
                            <Package className="h-4 w-4 mr-2" />
                            Items
                        </TabsTrigger>
                        <TabsTrigger value="documents">
                            <FileText className="h-4 w-4 mr-2" />
                            Documents
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 overflow-y-auto mt-4">
                        <TabsContent value="details" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Quote Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Buyer</p>
                                            <p className="font-medium">{quote.entities?.name || '—'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Quote Date</p>
                                            <p className="font-medium">
                                                {new Date(quote.quote_date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Valid Until</p>
                                            <p className="font-medium">
                                                {quote.valid_until
                                                    ? new Date(quote.valid_until).toLocaleDateString()
                                                    : '—'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Currency</p>
                                            <p className="font-medium">{quote.currency_code || 'USD'}</p>
                                        </div>
                                    </div>

                                    <Separator />

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">Subtotal</p>
                                            <p className="font-medium">
                                                {quote.currency_code || 'USD'} {quote.subtotal?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Tax</p>
                                            <p className="font-medium">
                                                {quote.currency_code || 'USD'} {quote.tax_amount?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Discount</p>
                                            <p className="font-medium">
                                                {quote.currency_code || 'USD'} {quote.discount_amount?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">Total</p>
                                            <p className="text-lg font-bold">
                                                {quote.currency_code || 'USD'} {quote.total_amount?.toFixed(2) || '0.00'}
                                            </p>
                                        </div>
                                    </div>

                                    {(quote.payment_terms || quote.delivery_terms || quote.incoterms) && (
                                        <>
                                            <Separator />
                                            <div className="space-y-2">
                                                {quote.payment_terms && (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Payment Terms</p>
                                                        <p className="font-medium">{quote.payment_terms}</p>
                                                    </div>
                                                )}
                                                {quote.delivery_terms && (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Delivery Terms</p>
                                                        <p className="font-medium">{quote.delivery_terms}</p>
                                                    </div>
                                                )}
                                                {quote.incoterms && (
                                                    <div>
                                                        <p className="text-sm text-muted-foreground">Incoterms</p>
                                                        <p className="font-medium">{quote.incoterms}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {quote.notes && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Notes</p>
                                                <p className="text-sm mt-1">{quote.notes}</p>
                                            </div>
                                        </>
                                    )}

                                    {quote.enquiries && (
                                        <>
                                            <Separator />
                                            <div>
                                                <p className="text-sm text-muted-foreground">Related Enquiry</p>
                                                <p className="font-medium">{quote.enquiries.enquiry_number}</p>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="items" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Quote Items</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {loading ? (
                                        <p className="text-center text-muted-foreground py-4">Loading items...</p>
                                    ) : quoteItems.length === 0 ? (
                                        <p className="text-center text-muted-foreground py-4">No items found</p>
                                    ) : (
                                        <div className="border rounded-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Product</TableHead>
                                                        <TableHead>Description</TableHead>
                                                        <TableHead className="text-right">Qty</TableHead>
                                                        <TableHead className="text-right">Unit Price</TableHead>
                                                        <TableHead className="text-right">Total</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {quoteItems.map((item) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="font-medium">
                                                                {item.product_name || item.skus?.name || '—'}
                                                            </TableCell>
                                                            <TableCell className="text-sm text-muted-foreground">
                                                                {item.description || '—'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {item.quantity}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                {quote.currency_code || 'USD'} {item.unit_price?.toFixed(2)}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium">
                                                                {quote.currency_code || 'USD'} {item.line_total?.toFixed(2) || (item.quantity * item.unit_price).toFixed(2)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="documents" className="space-y-4 m-0">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Upload Document</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <QuoteDocumentUpload
                                        quoteId={quote.id}
                                        quoteNumber={quote.quote_number}
                                        onUploadComplete={handleDocumentUploadComplete}
                                    />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Documents</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <DocumentBrowser
                                        key={documentRefreshKey}
                                        referenceType="quote"
                                        referenceId={quote.id}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
