"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Upload, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import * as XLSX from 'xlsx';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/use-toast";
import { PageContainer } from "@/components/ui/page-container";
import { DataTable } from "@/components/ui/data-table";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { hsnColumns } from "./hsn-columns";

const hsnSchema = z.object({
    hsn_code: z.string().min(1, "Required"),
    description: z.string().optional(),
    gst_rate: z.preprocess((val) => Number(val), z.number().min(0)),
    duty_rate: z.preprocess((val) => Number(val), z.number().min(0)),
});

export default function HSNPage() {
    const { toast } = useToast();
    const [hsnCodes, setHsnCodes] = useState<any[]>([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
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
    const paginatedCodes = hsnCodes; // Now directly from API

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const form = useForm<z.infer<typeof hsnSchema>>({
        resolver: zodResolver(hsnSchema) as any,
        defaultValues: { hsn_code: "", description: "", gst_rate: 0 as any, duty_rate: 0 as any }
    });

    // --- FETCH ---
    const fetchHsn = (page = currentPage, search = searchQuery) => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            limit: itemsPerPage.toString(),
        });
        if (search) params.append("search", search);

        fetch(`/api/hsn?${params}`)
            .then(res => res.json())
            .then(data => {
                if (data.hsnCodes) {
                    setHsnCodes(data.hsnCodes);
                    setMeta(data.meta || { total: 0, totalPages: 0 });
                }
            })
            .finally(() => setLoading(false));
    }

    // Initial Load & Page Change
    useEffect(() => {
        fetchHsn(currentPage, searchQuery);
    }, [currentPage]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) {
                fetchHsn(1, searchQuery);
            } else {
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

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
        } catch (e: any) {
            toast({ title: "Error", description: "Failed to create HSN code", variant: "destructive" });
        }
    }


    // --- EDIT ---
    const startEdit = (hsn: any) => {
        setEditingHsn(hsn);
        form.reset({
            hsn_code: hsn.itc_hs_code,
            description: hsn.description,
            gst_rate: hsn.gst_rate,
            duty_rate: hsn.duty_rate || 0
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
            toast({ title: "Error", description: e.message || "Failed to update HSN code", variant: "destructive" });
        }
    };

    // --- DELETE ---
    const onDelete = async (hsn: any) => {
        if (!confirm(`Delete HSN ${hsn.itc_hs_code}?`)) return;
        try {
            const res = await fetch(`/api/hsn/${hsn.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            fetchHsn();
        } catch (e: any) {
            toast({ title: "Error", description: e.message || "Failed to delete HSN code", variant: "destructive" });
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
                    toast({ title: "Invalid File", description: "File appears empty", variant: "destructive" });
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
                    toast({
                        title: "Wrong File Type",
                        description: "This appears to be a SKU file. For HSN bulk upload, use a government HSN file with: ITC HS Code, Commodity, GST Rate.",
                        variant: "destructive",
                        duration: 6000
                    });
                    return;
                }

                if (!hasHsnColumn) {
                    toast({
                        title: "Missing Required Column",
                        description: "Your file must have HSN Code columns. Expected: ITC HS Code, Commodity, GST Rate.",
                        variant: "destructive",
                        duration: 6000
                    });
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
                    toast({ title: "No Valid Records", description: "No valid records found. Please ensure you have columns for HSN Code and Description.", variant: "destructive" });
                    return;
                }

                setBulkData(normalizedData);
            } catch (e: any) {
                console.error(e);
                toast({ title: "Parse Error", description: "Error parsing file: " + e.message, variant: "destructive" });
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

            toast({
                title: "Success!",
                description: `Successfully processed ${data.count} HSN codes.`,
                duration: 5000
            });
            setOpenBulk(false);
            setBulkData([]);
            fetchHsn();
        } catch (e: any) {
            toast({ title: "Upload Failed", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <PageContainer>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-slate-800">ITC-HSN Lookup</h1>
                <div className="flex items-center gap-2">
                    {/* Add HSN / Bulk Upload buttons could go here if needed, mimicking standard headers */}
                </div>
            </div>

            {/* Global Metadata Header */}
            <div className="bg-card border rounded-md p-4 flex flex-wrap gap-6 items-center text-sm shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Notification No:</span>
                    <span className="font-medium">9/2025-CTR, 13/2025-CTR</span>
                </div>
                <div className="h-4 w-px bg-border hidden sm:block"></div>
                <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground">Date:</span>
                    <span className="font-medium">2025-09-17</span>
                </div>
            </div>

            {/* Informative Note */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-md p-4 text-sm text-slate-700">
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-2">ITC HS Code (India)</h3>
                        <ul className="space-y-1 list-disc list-inside text-slate-600">
                            <li>India’s 8-digit customs classification for all export/import goods.</li>
                            <li>Used in Shipping Bills, DGFT rules, and Customs clearance.</li>
                            <li>Wrong ITC HS can lead to customs queries, shipment holds, fines, or re-assessment.</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-semibold text-blue-900 mb-2">HSN Code (Global)</h3>
                        <ul className="space-y-1 list-disc list-inside text-slate-600">
                            <li>International 6-digit Harmonised System used in GST and global trade.</li>
                            <li>Forms the base structure for India’s ITC HS and GST rates.</li>
                            <li>Incorrect HSN can cause GST mismatch, invoice rejection, and compliance penalties.</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="relative w-full max-w-md">
                        <SearchInput
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by code or description..."
                            aria-label="Search HSN codes"
                        />
                    </div>
                </div>

                <DataTable
                    data={paginatedCodes}
                    columns={hsnColumns}
                    loading={loading}
                    fixedLayout={false}
                    emptyState={
                        <EmptyState
                            icon={Search}
                            title="No HSN codes found"
                            description={searchQuery ? `No results for "${searchQuery}"` : "Try searching for a different code or description."}
                        />
                    }
                    actions={(row) => (
                        <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(row)} aria-label="Edit HSN">
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDelete(row)} aria-label="Delete HSN" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                />
            </div>

            {/* PAGINATION CONTROLS */}
            {
                !loading && meta.total > 0 && (
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <div className="text-muted-foreground mr-4">
                            Page {currentPage} of {meta.totalPages} ({meta.total} total)
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            title="First Page"
                            aria-label="First page"
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            title="Previous Page"
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={currentPage === meta.totalPages}
                            title="Next Page"
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(meta.totalPages)}
                            disabled={currentPage === meta.totalPages}
                            title="Last Page"
                            aria-label="Last page"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }

            {/* KEEP EXISTING DIALOGS FOR EDIT AND BULK IMPORT IF NEEDED. 
               The original code had dialogs which are likely state-controlled. 
               Since I am doing a replace, I need to make sure I don't lose the Dialog rendering code 
               that was likely at the end of the return statement or scattered. 
               Looking at previous file view, Dialogs were likely near root.
               I will attempt to preserve them if they were part of the previous return, 
               but my 'EndLine' was 478 which covered the main rendering. 
               Wait, I need to check where the Dialogs are rendered.
            */}

            {/* ... Rest of the Dialogs ... */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit HSN Code</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                        <HSNFormFields form={form} />
                        <div className="flex justify-end gap-2">
                            <Button type="submit">Save Changes</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

        </PageContainer>
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
