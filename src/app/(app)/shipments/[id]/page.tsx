"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // Correct hook
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, FileText, Upload, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

import { Separator } from "@/components/ui/separator";
import { UploadDocumentDialog } from "@/components/upload-document-dialog";
import { useToast } from "@/components/ui/use-toast";

// Separate components would be better, but inline for MVP speed
function DocumentsList({ documents }: { documents: any[] }) {
    if (!documents.length) return <div className="text-muted-foreground text-sm">No documents uploaded.</div>;

    return (
        <div className="space-y-2">
            {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between p-2 border rounded bg-card">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">{doc.doc_type || "Document"}</span>
                    </div>
                    {doc.signedUrl ? (
                        <a href={doc.signedUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            View / Download
                        </a>
                    ) : (
                        <span className="text-xs text-red-400">Unavailable</span>
                    )}
                </div>
            ))}
        </div>
    )
}

function ItemsList({ items }: { items: any[] }) {
    if (!items.length) return <div className="text-muted-foreground text-sm">No items added.</div>;

    return (
        <div className="border rounded bg-card overflow-hidden">
            <table className="min-w-full text-sm">
                <thead className="bg-muted">
                    <tr>
                        <th className="px-3 py-2 text-left font-medium">SKU</th>
                        <th className="px-3 py-2 text-left font-medium">Name</th>
                        <th className="px-3 py-2 text-right font-medium">Qty</th>
                        <th className="px-3 py-2 text-right font-medium">Price</th>
                        <th className="px-3 py-2 text-right font-medium">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className="border-t">
                            <td className="px-3 py-2">{item.skus?.sku_code || "-"}</td>
                            <td className="px-3 py-2">{item.skus?.name || "-"}</td>
                            <td className="px-3 py-2 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-right">{item.unit_price} {item.currency}</td>
                            <td className="px-3 py-2 text-right">{(item.quantity * item.unit_price).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export default function ShipmentDetailsPage() {
    const { toast } = useToast();
    const params = useParams();
    const id = params.id as string;
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/shipments/${id}`)
            .then(res => res.json())
            .then(data => setData(data))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    if (!data || data.error) return <div className="p-10 text-red-500">Error: {data?.error || "Shipment not found"}</div>;

    const { shipment, items, documents } = data;

    const [generatingPdf, setGeneratingPdf] = useState(false);

    const refreshData = () => {
        setLoading(true);
        fetch(`/api/shipments/${id}`)
            .then(res => res.json())
            .then(data => setData(data))
            .finally(() => setLoading(false));
    };

    const handleGenerateInvoice = async () => {
        setGeneratingPdf(true);
        try {
            const res = await fetch("/api/invoice/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shipmentId: id })
            });
            if (!res.ok) throw new Error("Failed to generate PDF");
            toast({ title: "Success", description: "Invoice generated successfully!", duration: 3000 });
            refreshData();
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Error generating invoice", variant: "destructive" });
        } finally {
            setGeneratingPdf(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Link href="/shipments" className="hover:text-foreground flex items-center"><ArrowLeft className="w-3 h-3 mr-1" /> Shipments</Link>
                <span>/</span>
                <span>{shipment.reference_no}</span>
            </div>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        {shipment.reference_no}
                        <Badge variant={shipment.status === 'draft' ? "secondary" : "default"}>{shipment.status}</Badge>
                    </h1>
                    <p className="text-muted-foreground">{shipment.type === 'export' ? `To: ${shipment.buyer_name}` : `From: ${shipment.supplier_name}`}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleGenerateInvoice} disabled={generatingPdf}>
                        {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
                        Generate Invoice
                    </Button>
                    {/* <Button>Edit Shipment</Button> */}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Details & Items */}
                <div className="md:col-span-2 space-y-6" >
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Shipment Details</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <div className="text-muted-foreground">Carrier</div>
                                <div>{shipment.carrier || "Not assigned"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Tracking No</div>
                                <div>{shipment.tracking_number || "-"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">Incoterm</div>
                                <div>{shipment.incoterm || "-"}</div>
                            </div>
                            <div>
                                <div className="text-muted-foreground">ETA</div>
                                <div>{shipment.eta ? new Date(shipment.eta).toLocaleDateString() : "-"}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Items</CardTitle>
                            <Button variant="ghost" size="sm" className="h-8">
                                <Plus className="w-4 h-4 mr-1" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <ItemsList items={items} />
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Documents & Tasks */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-base">Documents</CardTitle>
                            <UploadDocumentDialog shipmentId={shipment.id} onUploadSuccess={refreshData} />
                        </CardHeader>
                        <CardContent>
                            <DocumentsList documents={documents} />
                        </CardContent>
                    </Card>

                    {/* Timeline component placeholder */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Timeline</CardTitle></CardHeader>
                        <CardContent><div className="text-sm text-muted-foreground">No events recorded.</div></CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
