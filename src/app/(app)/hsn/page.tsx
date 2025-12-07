"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Upload, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from 'xlsx';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const hsnSchema = z.object({
    hsn_code: z.string().min(1, "Required"),
    description: z.string().optional(),
    gst_rate: z.preprocess((val) => Number(val), z.number().min(0)),
    duty_rate: z.preprocess((val) => Number(val), z.number().min(0)),
});

export default function HSNPage() {
    const [hsnCodes, setHsnCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    // Bulk Upload State
    const [openBulk, setOpenBulk] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const [editingHsn, setEditingHsn] = useState<any>(null);
    const [openEdit, setOpenEdit] = useState(false);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Derived State
    const filteredCodes = hsnCodes.filter(hsn =>
        hsn.hsn_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hsn.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCodes.length / itemsPerPage);
    const paginatedCodes = filteredCodes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const form = useForm<z.infer<typeof hsnSchema>>({
        resolver: zodResolver(hsnSchema) as any,
        defaultValues: { hsn_code: "", description: "", gst_rate: 0 as any, duty_rate: 0 as any }
    });

    // --- FETCH ---

    const fetchHsn = () => {
        setLoading(true);
        fetch("/api/hsn")
            .then(res => res.json())
            .then(data => {
                if (data.hsnCodes) setHsnCodes(data.hsnCodes);
            })
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        fetchHsn();
    }, []);

    const onSubmit = async (values: z.infer<typeof hsnSchema>) => {
        try {
            const res = await fetch("/api/hsn", {
                method: "POST",
                body: JSON.stringify(values)
            });
            if (!res.ok) throw new Error("Failed");
            setOpen(false);
            form.reset();
            fetchHsn();
        } catch (e) {
            console.error(e);
            alert("Failed to create HSN");
        }
    }


    // --- EDIT ---
    const startEdit = (hsn: any) => {
        setEditingHsn(hsn);
        form.reset({
            hsn_code: hsn.hsn_code,
            description: hsn.description,
            gst_rate: hsn.gst_rate,
            duty_rate: hsn.duty_rate
        });
        setOpenEdit(true);
    };

    const onEditSubmit = async (values: z.infer<typeof hsnSchema>) => {
        if (!editingHsn) return;
        try {
            const res = await fetch(`/api/hsn/${editingHsn.id}`, {
                method: "PUT",
                body: JSON.stringify(values)
            });
            if (!res.ok) throw new Error("Failed");

            setOpenEdit(false);
            setEditingHsn(null);
            fetchHsn();
        } catch (e: any) {
            alert(e.message || "Failed to update");
        }
    };

    // --- DELETE ---
    const onDelete = async (hsn: any) => {
        if (!confirm(`Delete HSN ${hsn.hsn_code}?`)) return;
        try {
            const res = await fetch(`/api/hsn/${hsn.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            fetchHsn();
        } catch (e: any) {
            alert(e.message || "Failed to delete");
        }
    };

    // --- BULK UPLOAD ---
    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "array" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                // Read as array of arrays to find header row
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (!rows || rows.length === 0) {
                    alert("File appears empty");
                    return;
                }

                // Find header row index
                let headerRowIndex = 0;
                const knownColumns = ['hsn', 'code', 'description', 'gst', 'rate', 'duty', 'item'];

                let foundHeader = false;
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const rowStr = rows[i].join(' ').toLowerCase();
                    const matchCount = knownColumns.filter(col => rowStr.includes(col)).length;
                    if (matchCount >= 1) { // Found at least 1 known column
                        headerRowIndex = i;
                        foundHeader = true;
                        break;
                    }
                }

                if (!foundHeader) {
                    console.warn("Could not auto-detect header row. Assuming row 0.");
                }

                // Extract headers
                const headers = rows[headerRowIndex].map(h => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
                const originalHeaders = rows[headerRowIndex].map(h => String(h));
                console.log("Detected headers:", originalHeaders);

                // Check for specific government HSN file headers (case-insensitive)
                const requiredHeaders = {
                    itcHsCode: ['itchscode', 'itchs', 'hscode'],
                    commodity: ['commodity', 'description', 'item'],
                    hsCodesGst: ['hscodesasingstschedule', 'gstschedule', 'gstcode'],
                    gstRate: ['gstrate', 'gst', 'rate']
                };

                const hasItcHsCode = headers.some(h => requiredHeaders.itcHsCode.some(req => h.includes(req)));
                const hasCommodity = headers.some(h => requiredHeaders.commodity.some(req => h.includes(req)));
                const hasHsCodesGst = headers.some(h => requiredHeaders.hsCodesGst.some(req => h.includes(req)));
                const hasGstRate = headers.some(h => requiredHeaders.gstRate.some(req => h.includes(req)));

                // Validate required columns
                const hasHsnColumn = hasItcHsCode || hasHsCodesGst;

                // Check if this looks like a SKU file instead
                const hasSkuColumns = headers.some(h =>
                    h.includes('sku') || h.includes('product') || h.includes('price') || h.includes('weight')
                );

                if (hasSkuColumns && !hasHsnColumn) {
                    alert(
                        `❌ Wrong file type!\n\n` +
                        `This appears to be a SKU file, not an HSN file.\n\n` +
                        `Found columns: ${originalHeaders.join(', ')}\n\n` +
                        `For HSN bulk upload, please use a government HSN file with:\n` +
                        `• ITC HS Code (required)\n` +
                        `• Commodity (required)\n` +
                        `• HS Codes as in GST Schedule (optional)\n` +
                        `• GST Rate (optional)\n\n` +
                        `To upload SKUs, please use the SKU Management page.`
                    );
                    return;
                }

                if (!hasHsnColumn) {
                    alert(
                        `❌ Required column missing!\n\n` +
                        `Your file must have HSN Code columns.\n\n` +
                        `Found columns: ${originalHeaders.join(', ')}\n\n` +
                        `Expected columns (from government HSN file):\n` +
                        `• ITC HS Code (required)\n` +
                        `• Commodity (required)\n` +
                        `• HS Codes as in GST Schedule (optional)\n` +
                        `• GST Rate (optional)`
                    );
                    return;
                }

                // Map data
                const normalizedData = rows.slice(headerRowIndex + 1).map(row => {
                    const newRow: any = {};
                    row.forEach((cell, index) => {
                        if (index >= headers.length) return;
                        const key = headers[index];
                        const val = cell;

                        if (key.includes('code') || key.includes('hsn') || key.includes('chapter') || key.includes('heading') || key.includes('itc')) newRow.hsn_code = val;
                        else if (key.includes('desc') || key.includes('item') || key.includes('product') || key.includes('name') || key.includes('commodity')) newRow.description = val;
                        else if (key.includes('gst') || key.includes('igst') || key.includes('tax')) {
                            // clean "18%" -> 18
                            const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
                            newRow.gst_rate = isNaN(num) ? 0 : num;
                        }
                    });
                    // Filter out empty rows
                    if (!newRow.hsn_code && !newRow.description) return null;
                    return newRow;
                }).filter(Boolean); // Remove nulls

                if (normalizedData.length === 0) {
                    alert(`No valid records found. Detected headers in row ${headerRowIndex + 1}: ${originalHeaders.join(", ")}\n\nPlease ensure you have columns for HSN Code and Description.`);
                    return;
                }

                setBulkData(normalizedData);
            } catch (e: any) {
                console.error(e);
                alert("Error parsing file: " + e.message);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const confirmBulkUpload = async () => {
        setUploading(true);
        try {
            const res = await fetch("/api/hsn/bulk", {
                method: "POST",
                body: JSON.stringify({ hsnCodes: bulkData })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            alert(`Successfully processed ${data.count} codes!`);
            setOpenBulk(false);
            setBulkData([]);
            fetchHsn();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">HSN Codes</h1>
                <div className="flex gap-2">
                    <Dialog open={openBulk} onOpenChange={(open) => {
                        setOpenBulk(open);
                        if (!open) {
                            // Clear data when dialog closes
                            setBulkData([]);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-5xl">
                            <DialogHeader><DialogTitle>Bulk Upload HSN (Excel)</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div
                                    className={`p-8 border-2 border-dashed rounded-md text-center transition-colors ${isDragging ? "border-primary bg-accent" : "border-border bg-muted hover:bg-muted"}`}
                                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
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
                                            id="file-upload-hsn"
                                        />
                                        <Button variant="secondary" size="sm" onClick={() => document.getElementById('file-upload-hsn')?.click()}>
                                            Browse Files
                                        </Button>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-4 space-y-1">
                                        <p>Expected columns: <strong>hsn_code, description, gst_rate, duty_rate</strong></p>
                                        <p>Note: PDF files are not supported directly. Please convert to Excel first.</p>
                                    </div>
                                </div>

                                {bulkData.length > 0 && (
                                    <div className="max-h-60 overflow-auto border rounded-md">
                                        <Table>
                                            <TableHeader className="bg-muted sticky top-0 shadow-sm">
                                                <TableRow>
                                                    <TableHead className="font-bold text-foreground">Code</TableHead>
                                                    <TableHead className="font-bold text-foreground">Description</TableHead>
                                                    <TableHead className="font-bold text-foreground text-right">GST</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bulkData.slice(0, 5).map((row, i) => (
                                                    <TableRow key={i}>
                                                        {/* Flexible matching so users don't need exact header case */}
                                                        <TableCell className="font-medium">{row.hsn_code || row['HSN Code']}</TableCell>
                                                        <TableCell className="whitespace-normal break-words max-w-[300px]">{row.description || row['Description']}</TableCell>
                                                        <TableCell className="text-right">{(() => {
                                                            const rate = row.gst_rate || row['GST Rate'] || 0;
                                                            return rate < 1 && rate > 0 ? (rate * 100).toFixed(2) : rate;
                                                        })()}%</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <p className="text-xs text-muted-foreground p-2 bg-muted border-t">
                                            Showing {Math.min(5, bulkData.length)} of {bulkData.length} records
                                        </p>
                                    </div>
                                )}

                                <Button onClick={confirmBulkUpload} className="w-full" disabled={bulkData.length === 0 || uploading}>
                                    {uploading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
                                    {uploading ? "Uploading..." : "Confirm Upload"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" /> Add HSN
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New HSN Code</DialogTitle></DialogHeader>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                                <HSNFormFields form={form} />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Save HSN
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>


            {/* SEARCH & FILTERS */}
            <div className="flex items-center gap-2 max-w-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by code or description..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>
            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold text-foreground w-[120px]">HSN Code</TableHead>
                            <TableHead className="font-bold text-foreground">Description</TableHead>
                            <TableHead className="font-bold text-foreground text-right">GST Rate</TableHead>
                            <TableHead className="font-bold text-foreground text-right">Duty Rate</TableHead>
                            <TableHead className="font-bold text-foreground w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                        ) : paginatedCodes.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No HSN codes found.</TableCell></TableRow>
                        ) : (
                            paginatedCodes.map(hsn => (
                                <TableRow key={hsn.id}>
                                    <TableCell className="font-medium whitespace-normal break-words w-[120px]">{hsn.hsn_code}</TableCell>
                                    <TableCell className="whitespace-normal break-words max-w-[300px]">{hsn.description}</TableCell>
                                    <TableCell className="text-right">{(() => {
                                        const rate = hsn.gst_rate || 0;
                                        return rate < 1 && rate > 0 ? (rate * 100).toFixed(2) : rate;
                                    })()}%</TableCell>
                                    <TableCell className="text-right">{(() => {
                                        const rate = hsn.duty_rate || 0;
                                        return rate < 1 && rate > 0 ? (rate * 100).toFixed(2) : rate;
                                    })()}%</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(hsn)}>
                                                <Pencil className="w-4 h-4 text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(hsn)}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION CONTROLS */}
            {
                !loading && filteredCodes.length > 0 && (
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <div className="text-muted-foreground mr-4">
                            Page {currentPage} of {totalPages} ({filteredCodes.length} total)
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }


            {/* EDIT DIALOG */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit HSN Code</DialogTitle></DialogHeader>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                        <HSNFormFields form={form} />
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            Update HSN
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div >
    );
}

function HSNFormFields({ form }: { form: any }) {
    return (
        <>
            <div className="grid gap-2">
                <Label>HSN Code</Label>
                <Input {...form.register("hsn_code")} placeholder="8471" />
            </div>
            <div className="grid gap-2">
                <Label>Description</Label>
                <Input {...form.register("description")} placeholder="Item description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>GST Rate (%)</Label>
                    <Input type="number" {...form.register("gst_rate")} placeholder="18" />
                </div>
                <div className="grid gap-2">
                    <Label>Duty Rate (%)</Label>
                    <Input type="number" {...form.register("duty_rate")} placeholder="10" />
                </div>
            </div>
        </>
    );
}
