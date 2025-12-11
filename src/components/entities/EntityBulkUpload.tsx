"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';

interface EntityBulkUploadProps {
    onSuccess: () => void;
}

export function EntityBulkUpload({ onSuccess }: EntityBulkUploadProps) {
    const [open, setOpen] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (!rows || rows.length === 0) {
                    toast({ title: "Invalid File", description: "File appears empty", variant: "destructive" });
                    return;
                }

                const headers = rows[0].map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));

                const hasProductColumns = headers.some((h: string) =>
                    h.includes('category') || h.includes('hsn') && !h.includes('type')
                );

                if (hasProductColumns) {
                    toast({
                        title: "Wrong File Type",
                        description: "This appears to be a Products file. For Entities bulk upload, use a file with: Name, Type, Email, Phone, Tax ID.",
                        variant: "destructive",
                        duration: 6000
                    });
                    return;
                }

                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast({ title: "No Data", description: "No data found in file", variant: "destructive" });
                    return;
                }

                setBulkData(data);
            } catch (e: any) {
                console.error(e);
                toast({ title: "Parse Error", description: "Error parsing file: " + e.message, variant: "destructive" });
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmBulkUpload = async () => {
        setUploading(true);
        try {
            const res = await fetch("/api/entities/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entities: bulkData })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed");

            toast({ title: "Success", description: `Successfully uploaded ${data.count} entities!` });
            setOpen(false);
            setBulkData([]);
            onSuccess();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setBulkData([]);
        }}>
            <DialogTrigger asChild>
                <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" /> Bulk Upload
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Bulk Upload Entities (Excel)</DialogTitle>
                </DialogHeader>

                {bulkData.length === 0 ? (
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                            }`}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const file = e.dataTransfer.files?.[0];
                            if (file) processFile(file);
                        }}
                    >
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Upload className={`w-10 h-10 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="text-sm font-medium text-foreground">
                                {isDragging ? "Drop file here" : "Drag & drop Excel/CSV file here"}
                            </p>
                            <p className="text-xs text-muted-foreground">or click to browse</p>
                            <Input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) processFile(file);
                                }}
                                className="hidden"
                                id="entity-file-upload"
                            />
                            <Button variant="secondary" size="sm" onClick={() => document.getElementById('entity-file-upload')?.click()}>
                                Browse Files
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">Expected columns: Name, Type, Email, Phone, Country, Address, Tax ID</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="max-h-60 overflow-auto border rounded-md">
                            <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        <th className="p-2 text-left font-bold">Name</th>
                                        <th className="p-2 text-left font-bold">Type</th>
                                        <th className="p-2 text-left font-bold">Email</th>
                                        <th className="p-2 text-left font-bold">Country</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bulkData.slice(0, 10).map((row, idx) => (
                                        <tr key={idx} className="border-t">
                                            <td className="p-2">{row.name || row.Name}</td>
                                            <td className="p-2">{row.type || row.Type}</td>
                                            <td className="p-2">{row.email || row.Email}</td>
                                            <td className="p-2">{row.country || row.Country}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Showing {Math.min(10, bulkData.length)} of {bulkData.length} records
                        </p>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setBulkData([])}>
                                Cancel
                            </Button>
                            <Button onClick={confirmBulkUpload} disabled={uploading}>
                                {uploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    `Confirm Upload (${bulkData.length})`
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
