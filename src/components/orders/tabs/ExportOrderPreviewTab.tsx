/**
 * ExportOrderPreviewTab Component
 * 
 * Preview tab showing PDF preview with download and export options
 */

"use client";

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileDown, Upload, Loader2, AlertCircle } from 'lucide-react';

interface ExportOrderPreviewTabProps {
    order: any;
    pdfUrl: string | null;
    pdfLoading: boolean;
    pdfError: boolean;
    exporting: boolean;
    onLoadPdf: () => void;
    onDownload: () => void;
    onExport: () => void;
}

export function ExportOrderPreviewTab({
    order,
    pdfUrl,
    pdfLoading,
    pdfError,
    exporting,
    onLoadPdf,
    onDownload,
    onExport,
}: ExportOrderPreviewTabProps) {
    // Load PDF when component mounts if not already loaded
    useEffect(() => {
        if (!pdfUrl && !pdfLoading && !pdfError) {
            onLoadPdf();
        }
    }, []);

    return (
        <div className="space-y-6">
            <Card className="shadow-sm border-muted/40">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div>
                        <CardTitle className="text-base font-semibold">Document Preview</CardTitle>
                        <CardDescription className="text-sm">View and export the export order PDF document</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onDownload}
                            disabled={pdfLoading}
                            className="transition-all hover:shadow-sm"
                        >
                            <FileDown className="h-4 w-4 mr-2" />
                            Download
                        </Button>
                        <Button
                            size="sm"
                            onClick={onExport}
                            disabled={exporting || pdfLoading}
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
                            <Button variant="outline" size="sm" onClick={onLoadPdf}>
                                Try Again
                            </Button>
                        </div>
                    ) : pdfUrl ? (
                        <div className="border rounded-lg overflow-hidden bg-muted/20">
                            <iframe
                                src={pdfUrl}
                                className="w-full h-[800px]"
                                title="Export Order PDF Preview"
                            />
                        </div>
                    ) : null}
                </CardContent>
            </Card>
        </div>
    );
}
