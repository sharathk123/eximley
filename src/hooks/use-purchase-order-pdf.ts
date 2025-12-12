import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

export function usePurchaseOrderPdf(poId: string, poNumber: string, version?: number) {
    const { toast } = useToast();
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [exportingToDms, setExportingToDms] = useState(false);

    const generatePdf = async () => {
        setGeneratingPdf(true);
        try {
            const res = await fetch(`/api/purchase-orders/${poId}/generate-pdf`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "PDF generation failed");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${poNumber}-V${version || 1}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            toast({
                title: "Success",
                description: "PDF downloaded successfully",
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setGeneratingPdf(false);
        }
    };

    const exportToDms = async () => {
        setExportingToDms(true);
        try {
            const res = await fetch(`/api/purchase-orders/${poId}/generate-pdf?export=true`, {
                method: "POST",
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "DMS export failed");
            }

            toast({
                title: "Success",
                description: "PDF exported to DMS successfully",
            });

            return true;
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
            return false;
        } finally {
            setExportingToDms(false);
        }
    };

    return {
        generatingPdf,
        exportingToDms,
        generatePdf,
        exportToDms,
    };
}
