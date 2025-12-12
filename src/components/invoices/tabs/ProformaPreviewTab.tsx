import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, FileDown, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProformaPdf } from "@/hooks/useProformaPdf";

interface ProformaPreviewTabProps {
    invoice: any;
}

export function ProformaPreviewTab({ invoice }: ProformaPreviewTabProps) {
    const {
        pdfUrl,
        pdfLoading,
        pdfError,
        loadPdfPreview,
        handleDownloadPdf,
        handleExportToDms,
        exporting
    } = useProformaPdf(invoice);

    useEffect(() => {
        loadPdfPreview();
    }, [invoice.id, loadPdfPreview]);

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-muted/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-base font-semibold">Document Preview</CardTitle>
                        <CardDescription className="text-sm">View and export the proforma invoice PDF document</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDownloadPdf}
                            disabled={exporting}
                            className="transition-all hover:shadow-sm"
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleExportToDms}
                            disabled={exporting}
                            className="transition-all hover:shadow-sm"
                        >
                            {exporting ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Exporting...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Export to DMS
                                </>
                            )}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {pdfLoading ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Generating PDF preview...</p>
                        </div>
                    ) : pdfError ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-4">
                            <AlertCircle className="h-12 w-12 text-destructive" />
                            <p className="text-sm text-muted-foreground">Failed to load PDF preview</p>
                            <Button variant="outline" size="sm" onClick={() => loadPdfPreview()}>
                                Try Again
                            </Button>
                        </div>
                    ) : pdfUrl ? (
                        <div className="border rounded-lg overflow-hidden bg-muted/20">
                            <iframe
                                src={`${pdfUrl}#toolbar=1&view=FitH`}
                                className="w-full h-[800px]"
                                title="Proforma Invoice Preview"
                            />
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
