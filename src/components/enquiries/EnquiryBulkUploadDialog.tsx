"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, FileSpreadsheet, Download } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";

interface EnquiryBulkUploadDialogProps {
    onUploadComplete: () => void;
}

export function EnquiryBulkUploadDialog({ onUploadComplete }: EnquiryBulkUploadDialogProps) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                throw new Error("No data found in file");
            }

            // Call the bulk upload API
            const response = await fetch('/api/enquiries/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ enquiries: jsonData }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to upload enquiries');
            }

            const result = await response.json();

            toast({
                title: "Upload Successful",
                description: `Successfully created ${result.count} enquiries.`,
            });

            setIsOpen(false);
            onUploadComplete();
        } catch (error: any) {
            console.error('Bulk upload error:', error);
            toast({
                title: "Upload Failed",
                description: error.message || "Failed to process the file. Please check the format.",
                variant: "destructive",
            });
        } finally {
            setIsUploading(false);
            // Reset file input
            e.target.value = "";
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Enquiries</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:bg-muted/50 transition-colors">
                        <Input
                            type="file"
                            accept=".xlsx,.csv"
                            className="hidden"
                            id="file-upload"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                        />
                        <Label
                            htmlFor="file-upload"
                            className="cursor-pointer flex flex-col items-center gap-2"
                        >
                            {isUploading ? (
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            ) : (
                                <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                            )}
                            <span className="text-sm text-muted-foreground">
                                {isUploading ? "Processing..." : "Click to upload Excel or CSV"}
                            </span>
                        </Label>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                        <p className="font-medium">Required Columns:</p>
                        <p>Customer Name, Email, Phone, Company, Country, Source, Subject, Description, Priority</p>
                    </div>
                    <Button variant="link" className="h-auto p-0 text-xs text-primary flex items-center gap-1">
                        <Download className="h-3 w-3" /> Download Template
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
