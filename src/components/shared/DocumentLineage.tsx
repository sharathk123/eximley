"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    FileText,
    FileCheck,
    Package,
    Ship,
    CreditCard,
    ArrowRight,
    MessageSquare
} from "lucide-react";
import Link from "next/link";

interface RelatedDocument {
    id: string;
    number: string;
    status: string;
    date?: string;
}

interface DocumentLineageProps {
    documentType: 'enquiry' | 'quote' | 'proforma_invoice' | 'export_order' | 'shipping_bill' | 'brc';
    documentId: string;
    relatedDocuments?: {
        sourceEnquiry?: RelatedDocument;
        sourceQuote?: RelatedDocument;
        sourceProforma?: RelatedDocument;
        exportOrders?: RelatedDocument[];
        shippingBills?: RelatedDocument[];
        brcs?: RelatedDocument[];
        purchaseOrders?: RelatedDocument[];
    };
}

const documentConfig = {
    enquiry: { label: 'Enquiry', icon: MessageSquare, color: 'text-blue-600', url: '/enquiries' },
    quote: { label: 'Quote', icon: FileText, color: 'text-amber-600', url: '/quotes' },
    proforma_invoice: { label: 'Proforma Invoice', icon: FileCheck, color: 'text-purple-600', url: '/invoices/proforma' },
    export_order: { label: 'Export Order', icon: Package, color: 'text-green-600', url: '/orders' },
    shipping_bill: { label: 'Shipping Bill', icon: Ship, color: 'text-indigo-600', url: '/shipping-bills' },
    brc: { label: 'BRC', icon: CreditCard, color: 'text-pink-600', url: '/brcs' },
};

function getStatusColor(status: string): string {
    const statusMap: Record<string, string> = {
        draft: 'secondary',
        sent: 'default',
        converted: 'default',
        confirmed: 'default',
        completed: 'default',
        pending: 'secondary',
        partial: 'secondary',
        full: 'default',
    };
    if (!status) return 'outline';
    return statusMap[status.toLowerCase()] || 'outline';
}

function DocumentLink({ doc, type }: { doc: RelatedDocument, type: keyof typeof documentConfig }) {
    const config = documentConfig[type];
    const Icon = config.icon;

    return (
        <Link
            href={`${config.url}/${doc.id}`}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent transition-colors group"
        >
            <div className={`${config.color} p-2 rounded-md bg-muted`}>
                <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-sm group-hover:underline">
                        {doc.number}
                    </span>
                    <Badge variant={getStatusColor(doc.status) as any} className="text-xs">
                        {doc.status}
                    </Badge>
                </div>
                {doc.date && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(doc.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </p>
                )}
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </Link>
    );
}

function DocumentSection({
    title,
    documents,
    type,
    icon: Icon
}: {
    title: string;
    documents?: RelatedDocument | RelatedDocument[];
    type: keyof typeof documentConfig;
    icon: any;
}) {
    if (!documents || (Array.isArray(documents) && documents.length === 0)) {
        return null;
    }

    const docs = Array.isArray(documents) ? documents : [documents];

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-semibold text-sm">{title}</h4>
                <Badge variant="outline" className="ml-auto">
                    {docs.length}
                </Badge>
            </div>
            <div className="space-y-2">
                {docs.map((doc, index) => (
                    <DocumentLink key={`${doc.id}-${index}`} doc={doc} type={type} />
                ))}
            </div>
        </div>
    );
}

export function DocumentLineage({ documentType, documentId, relatedDocuments }: DocumentLineageProps) {
    const hasUpstream = relatedDocuments?.sourceEnquiry || relatedDocuments?.sourceQuote || relatedDocuments?.sourceProforma;
    const hasDownstream =
        (relatedDocuments?.exportOrders && relatedDocuments.exportOrders.length > 0) ||
        (relatedDocuments?.shippingBills && relatedDocuments.shippingBills.length > 0) ||
        (relatedDocuments?.brcs && relatedDocuments.brcs.length > 0) ||
        (relatedDocuments?.purchaseOrders && relatedDocuments.purchaseOrders.length > 0);

    if (!hasUpstream && !hasDownstream) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Document Lineage</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        No related documents found. This is the starting point of the export lifecycle.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Document Lineage</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Track the complete export lifecycle for this document
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Upstream Documents */}
                {hasUpstream && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Source Documents
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <DocumentSection
                            title="From Enquiry"
                            documents={relatedDocuments?.sourceEnquiry}
                            type="enquiry"
                            icon={MessageSquare}
                        />

                        <DocumentSection
                            title="From Quote"
                            documents={relatedDocuments?.sourceQuote}
                            type="quote"
                            icon={FileText}
                        />

                        <DocumentSection
                            title="From Proforma Invoice"
                            documents={relatedDocuments?.sourceProforma}
                            type="proforma_invoice"
                            icon={FileCheck}
                        />
                    </div>
                )}

                {hasUpstream && hasDownstream && <Separator />}

                {/* Downstream Documents */}
                {hasDownstream && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Converted To
                            </span>
                            <div className="h-px flex-1 bg-border" />
                        </div>

                        <DocumentSection
                            title="Export Orders"
                            documents={relatedDocuments?.exportOrders}
                            type="export_order"
                            icon={Package}
                        />

                        <DocumentSection
                            title="Purchase Orders"
                            documents={relatedDocuments?.purchaseOrders}
                            type="export_order"
                            icon={Package}
                        />

                        <DocumentSection
                            title="Shipping Bills"
                            documents={relatedDocuments?.shippingBills}
                            type="shipping_bill"
                            icon={Ship}
                        />

                        <DocumentSection
                            title="BRCs (Bank Realization)"
                            documents={relatedDocuments?.brcs}
                            type="brc"
                            icon={CreditCard}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
