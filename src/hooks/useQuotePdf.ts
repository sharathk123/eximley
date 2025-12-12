/**
 * useQuotePdf Hook
 * 
 * Custom hook for managing PDF generation, preview, download, and export functionality for Quotes
 */

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { DocumentFormatter } from '@/lib/utils/documentFormatter';

interface UseQuotePdfReturn {
    pdfUrl: string | null;
    pdfLoading: boolean;
    pdfError: boolean;
    exporting: boolean;
    loadPdfPreview: () => Promise<void>;
    handleDownloadPdf: () => Promise<void>;
    handleExportToDms: () => Promise<void>;
}

export function useQuotePdf(quote: any, onRefresh?: () => void): UseQuotePdfReturn {
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [pdfError, setPdfError] = useState(false);
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => {
            if (pdfUrl) {
                window.URL.revokeObjectURL(pdfUrl);
            }
        };
    }, [pdfUrl]);

    const loadPdfPreview = async () => {
        try {
            setPdfLoading(true);
            setPdfError(false);

            const response = await fetch(`/api/quotes/${quote.id}/generate-pdf`, {
                method: 'POST',
            });

            if (!response.ok) {
                let errorMessage = 'Failed to generate PDF';
                try {
                    const data = await response.json();
                    if (data.error) errorMessage = data.error;
                } catch (e) {
                    const text = await response.text();
                    if (text) errorMessage = text.slice(0, 100);
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            setPdfError(true);
            toast({
                title: "Error",
                description: "Failed to load PDF preview",
                variant: "destructive"
            });
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDownloadPdf = async () => {
        try {
            const response = await fetch(`/api/quotes/${quote.id}/generate-pdf`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            // Try to get filename from server response (Content-Disposition)
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = DocumentFormatter.formatDocumentName(quote.quote_number, quote.version || 1, quote.status);

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) {
                    fileName = match[1];
                }
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Allow download to start before revoking
            setTimeout(() => window.URL.revokeObjectURL(url), 100);

            toast({ title: "Success", description: "PDF downloaded successfully" });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to download PDF",
                variant: "destructive"
            });
        }
    };

    const handleExportToDms = async () => {
        try {
            setExporting(true);
            const response = await fetch(`/api/quotes/${quote.id}/generate-pdf?export=true`, {
                method: 'POST',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to export PDF');
            }

            toast({
                title: "Success",
                description: "PDF exported to Documents successfully",
            });

            // Refresh to show new document in Documents tab
            if (onRefresh) onRefresh();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to export PDF",
                variant: "destructive"
            });
        } finally {
            setExporting(false);
        }
    };

    return {
        pdfUrl,
        pdfLoading,
        pdfError,
        exporting,
        loadPdfPreview,
        handleDownloadPdf,
        handleExportToDms,
    };
}
