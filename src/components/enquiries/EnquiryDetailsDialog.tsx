"use client";


import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Info, FileText, Package, CheckCircle2, XCircle, Edit, FileDown, Copy, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DocumentBrowser } from '@/components/documents/DocumentBrowser';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface EnquiryDetailsDialogProps {
    enquiry: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onEdit?: (enquiry: any) => void;
    onConvert?: (enquiry: any) => void;
    onMarkStatus?: (status: 'won' | 'lost') => void;
    onRefresh?: () => void;
}

export function EnquiryDetailsDialog({ enquiry, open, onOpenChange, onEdit, onConvert, onMarkStatus, onRefresh }: EnquiryDetailsDialogProps) {
    const [activeTab, setActiveTab] = useState("details");
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [revising, setRevising] = useState(false);
    const { toast } = useToast();

    if (!enquiry) return null;

    const handleGeneratePDF = async () => {
        try {
            setGeneratingPdf(true);
            const response = await fetch(`/ api / enquiries / ${enquiry.id}/generate-pdf`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            // Download file
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Get filename from header or default
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = `${enquiry.enquiry_number}.pdf`;
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) fileName = match[1];
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Success", description: "PDF Downloaded" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to generate PDF", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };

    const handleRevise = async () => {
        try {
            setRevising(true);
            const response = await fetch('/api/enquiries/revise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: enquiry.id })
            });

            if (!response.ok) throw new Error('Failed to create revision');

            toast({ title: "Success", description: "New revision created" });
            if (onRefresh) onRefresh();
            onOpenChange(false); // Close dialog to refresh list
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to create revision", variant: "destructive" });
        } finally {
            setRevising(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'default';
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl flex items-center gap-2">
                                {enquiry.enquiry_number}
                                <Badge variant="secondary" className="ml-2 font-mono">V{enquiry.version || 1}</Badge>
                                <Badge variant={getStatusColor(enquiry.status)} className="ml-2 uppercase text-xs">{enquiry.status}</Badge>
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                {enquiry.customer_name} • {new Date(enquiry.created_at).toLocaleDateString()}
                            </DialogDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={handleGeneratePDF} disabled={generatingPdf}>
                                {generatingPdf ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
                                PDF
                            </Button>
                            <Button size="sm" variant="outline" onClick={handleRevise} disabled={revising}>
                                {revising ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                                Revise
                            </Button>

                            {onConvert && enquiry.status !== 'converted' && enquiry.status !== 'won' && enquiry.status !== 'lost' && (
                                <Button size="sm" variant="outline" onClick={() => onConvert(enquiry)}>
                                    <FileText className="h-4 w-4 mr-2" /> Create Quote
                                </Button>
                            )}
                            {onEdit && (
                                <Button size="sm" variant="outline" onClick={() => onEdit(enquiry)}>
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
                    <TabsList className="px-6 py-2 border-b justify-start rounded-none h-auto p-0 bg-transparent space-x-6">
                        <TabsTrigger
                            value="details"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            <Info className="h-4 w-4 mr-2" /> Details
                        </TabsTrigger>
                        <TabsTrigger
                            value="items"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            <FileText className="h-4 w-4 mr-2" /> Items ({enquiry.enquiry_items?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger
                            value="documents"
                            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 py-3"
                        >
                            <FileText className="h-4 w-4 mr-2" /> Documents
                        </TabsTrigger>
                    </TabsList>

                    {activeTab === "details" && (
                        <TabsContent value="details" className="m-0 flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto p-6 bg-muted/10 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Customer Info</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Name:</span>
                                                <span className="col-span-2 font-medium">{enquiry.customer_name}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Company:</span>
                                                <span className="col-span-2">{enquiry.customer_company || "—"}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Email:</span>
                                                <span className="col-span-2">{enquiry.customer_email || "—"}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Phone:</span>
                                                <span className="col-span-2">{enquiry.customer_phone || "—"}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Country:</span>
                                                <span className="col-span-2">{enquiry.customer_country || "—"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground">Enquiry Info</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2">
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Source:</span>
                                                <span className="col-span-2 capitalize">{enquiry.source?.replace('_', ' ') || "—"}</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Priority:</span>
                                                <span className="col-span-2"><Badge variant={getPriorityColor(enquiry.priority)}>{enquiry.priority}</Badge></span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-1 text-sm">
                                                <span className="text-muted-foreground">Follow-up:</span>
                                                <span className="col-span-2">{enquiry.next_follow_up_date ? new Date(enquiry.next_follow_up_date).toLocaleDateString() : "—"}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium text-muted-foreground">Description / Notes</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm whitespace-pre-wrap">{enquiry.description || "No description provided."}</p>
                                    </CardContent>
                                </Card>

                                <div className="flex justify-end gap-2">
                                    {onMarkStatus && enquiry.status !== 'converted' && enquiry.status !== 'won' && enquiry.status !== 'lost' && (
                                        <>
                                            <Button variant="outline" onClick={() => onMarkStatus('won')}>
                                                <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" /> Mark as Won
                                            </Button>
                                            <Button variant="outline" onClick={() => onMarkStatus('lost')}>
                                                <XCircle className="h-4 w-4 mr-2 text-red-600" /> Mark as Lost
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    )}

                    {activeTab === "items" && (
                        <TabsContent value="items" className="m-0 flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto p-6 bg-muted/10">
                                <Card>
                                    <CardContent className="p-0">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Product</TableHead>
                                                    <TableHead className="text-right">Quantity</TableHead>
                                                    <TableHead className="text-right">Target Price</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {enquiry.enquiry_items && enquiry.enquiry_items.length > 0 ? (
                                                    enquiry.enquiry_items.map((item: any, idx: number) => (
                                                        <TableRow key={idx}>
                                                            <TableCell className="font-medium">
                                                                <div>{item.skus?.products?.name || item.skus?.name || "Unknown Product"}</div>
                                                                <div className="text-xs text-muted-foreground">{item.skus?.sku_code}</div>
                                                            </TableCell>
                                                            <TableCell className="text-right">{item.quantity}</TableCell>
                                                            <TableCell className="text-right">{item.target_price ? `$${item.target_price}` : '-'}</TableCell>
                                                            <TableCell className="text-muted-foreground text-sm">{item.notes}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                                                            No items associated with this enquiry.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </TabsContent>
                    )}

                    {activeTab === "documents" && (
                        <TabsContent value="documents" className="m-0 h-full flex-1 overflow-hidden">
                            <div className="h-full overflow-y-auto p-6 bg-muted/10">
                                <DocumentBrowser
                                    referenceType="enquiry"
                                    referenceId={enquiry.id}
                                />
                            </div>
                        </TabsContent>
                    )}
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
