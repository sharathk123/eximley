/**
 * EnquiryHeader Component
 * 
 * Header section for the enquiry detail page with navigation and action buttons
 */

"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, RefreshCw, Copy, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Enquiry } from '@/types/enquiry';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";

interface EnquiryHeaderProps {
    enquiry: Enquiry;
    revising: boolean;
    onRevise: () => void;
    onMarkWon: () => void;
    onMarkLost: () => void;
    onConvert: () => void;
}

export function EnquiryHeader({
    enquiry,
    revising,
    onRevise,
    onMarkWon,
    onMarkLost,
    onConvert,
}: EnquiryHeaderProps) {
    const router = useRouter();

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Refresh"
                    onClick={() => router.push('/enquiries')}
                    className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {DocumentFormatter.formatDocumentNumber(enquiry.enquiry_number, enquiry.version || 1, enquiry.status)}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {enquiry.customer_name} • Created {new Date(enquiry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/enquiries/${enquiry.id}/edit`)}
                    className="transition-all hover:shadow-sm"
                >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRevise}
                    disabled={revising}
                    className="transition-all hover:shadow-sm"
                >
                    {revising ? (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                        </>
                    ) : (
                        <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Revise
                        </>
                    )}
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onConvert}
                    className="transition-all hover:shadow-sm"
                >
                    <Copy className="h-4 w-4 mr-2" />
                    Create Quote
                </Button>
                {enquiry.status === 'new' && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onMarkWon}
                            className="transition-all hover:shadow-sm hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark as Won
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onMarkLost}
                            className="transition-all hover:shadow-sm hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                            <XCircle className="h-4 w-4 mr-2" />
                            Mark as Lost
                        </Button>
                    </>
                )}
            </div>
        </div >
    );
}
