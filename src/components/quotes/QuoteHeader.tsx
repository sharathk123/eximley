"use client";

import { Button } from '@/components/ui/button';
import { ArrowLeft, Edit, Copy, FileText, ArrowRight, CheckCircle2, RefreshCw, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DocumentFormatter } from "@/lib/utils/documentFormatter";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface QuoteHeaderProps {
    quote: any;
    onEdit: () => void;
    onRefresh: () => void;
    onRevise: () => Promise<void>;
    onConvert: () => Promise<void>;
    onMarkStatus: (status: string) => Promise<void>;
    revising: boolean;
    converting: boolean;
}

export function QuoteHeader({
    quote,
    onEdit,
    onRefresh,
    onRevise,
    onConvert,
    onMarkStatus,
    revising,
    converting
}: QuoteHeaderProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [showConvertDialog, setShowConvertDialog] = useState(false);
    const [showReviseDialog, setShowReviseDialog] = useState(false);

    const handleConfirmConvert = async () => {
        await onConvert();
        setShowConvertDialog(false);
    };

    const handleConfirmRevise = async () => {
        await onRevise();
        setShowReviseDialog(false);
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/quotes')}
                    className="h-9 w-9 rounded-full hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">
                        {DocumentFormatter.formatDocumentNumber(quote.quote_number, quote.version || 1, quote.status)}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {quote.entities?.name} • Created {new Date(quote.quote_date).toLocaleDateString("en-IN")}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>

                {quote.status !== 'converted' && quote.status !== 'rejected' && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowReviseDialog(true)}
                            disabled={revising}
                        >
                            {revising ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
                            Revise
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowConvertDialog(true)}
                            disabled={converting}
                        >
                            {converting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Convert to PI
                        </Button>
                    </>
                )}

                {/* Status Update Buttons */}
                {(quote.status === 'draft' || quote.status === 'sent' || quote.status === 'revised') && (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMarkStatus('approved')}
                            className="hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                        >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Mark Approved
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onMarkStatus('rejected')}
                            className="hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Mark Rejected
                        </Button>
                    </>
                )}
            </div>

            <AlertDialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert to Proforma Invoice?</AlertDialogTitle>
                        <AlertDialogDescription>Create Proforma Invoice from "{quote.quote_number}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmConvert} disabled={converting}>
                            {converting ? "Converting..." : "Convert"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showReviseDialog} onOpenChange={setShowReviseDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Create Revision?</AlertDialogTitle>
                        <AlertDialogDescription>Create a new version (V{(quote.version || 1) + 1})?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmRevise} disabled={revising}>
                            {revising ? "Creating..." : "Create Revision"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
