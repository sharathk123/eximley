import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface UseProformaPdfReturn {
    pdfUrl: string | null;
    pdfLoading: boolean;
    pdfError: boolean;
    exporting: boolean;
    loadPdfPreview: () => Promise<void>;
    handleDownloadPdf: () => Promise<void>;
    handleExportToDms: () => Promise<void>;
}

export function useProformaPdf(invoice: any, onRefresh?: () => void): UseProformaPdfReturn {
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

    const loadPdfPreview = useCallback(async () => {
        if (!invoice?.id) return;
        try {
            setPdfLoading(true);
            setPdfError(false);

            const response = await fetch(`/api/invoices/proforma/${invoice.id}/generate-pdf`, {
                method: 'POST',
            });

            if (!response.ok) {
                let errorMessage = 'Failed to generate PDF';
                try {
                    const data = await response.json();
                    if (data.error) errorMessage = data.error;
                } catch (_) {
                    const text = await response.text();
                    if (text) errorMessage = text.slice(0, 100);
                }
                throw new Error(errorMessage);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            setPdfUrl(url);
        } catch (error) {
            console.error(error);
            setPdfError(true);
            // Optional: Don't show toast for preview load error to avoid spamming on mount
        } finally {
            setPdfLoading(false);
        }
    }, [invoice?.id]);

    const handleDownloadPdf = useCallback(async () => {
        if (!invoice?.id) return;
        try {
            const response = await fetch(`/api/invoices/proforma/${invoice.id}/generate-pdf`, {
                method: 'POST',
            });

            if (!response.ok) throw new Error('Failed to generate PDF');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = `${invoice.invoice_number}.pdf`; // Fallback
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match && match[1]) fileName = match[1];
            }

            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            toast({ title: "Success", description: "PDF downloaded successfully" });
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to download PDF",
                variant: "destructive"
            });
        }
    }, [invoice?.id, invoice?.invoice_number, toast]);

    const handleExportToDms = useCallback(async () => {
        if (!invoice?.id) return;
        try {
            setExporting(true);
            const response = await fetch(`/api/invoices/proforma/${invoice.id}/generate-pdf?export=true`, {
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
            console.error(error);
            toast({
                title: "Error",
                description: error.message || "Failed to export PDF",
                variant: "destructive"
            });
        } finally {
            setExporting(false);
        }
    }, [invoice?.id, onRefresh, toast]);

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
