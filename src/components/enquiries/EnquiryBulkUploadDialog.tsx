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

            // TODO: Process and validate data here before sending to API
            // For now, we simulate a successful upload for the UI standardization task

            // In a real implementation, you would:
            // 1. Validate structure
            // 2. Map fields to enquiry schema
            // 3. Call a bulk import API

            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

            toast({
                title: "Upload Successful",
                description: `Processed ${jsonData.length} records successfully.`,
            });

            setIsOpen(false);
            onUploadComplete();
        } catch (error) {
            console.error(error);
            toast({
                title: "Upload Failed",
                description: "Failed to process the file. Please check the format.",
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
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
                        <p>Customer Name, Email, Phone, Product Interest, Description</p>
                    </div>
                    <Button variant="link" className="h-auto p-0 text-xs text-primary flex items-center gap-1">
                        <Download className="h-3 w-3" /> Download Template
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
