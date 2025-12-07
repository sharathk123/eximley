"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Upload, Pencil, Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import * as XLSX from 'xlsx';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const skuSchema = z.object({
    sku_code: z.string().min(1, "Required"),
    name: z.string().min(1, "Required"),
    unit: z.string().optional(),
    base_price: z.preprocess((val) => Number(val), z.number().min(0)),
    product_id: z.string().optional(),
});

export default function SKUPage() {
    const [skus, setSkus] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Dialog States
    const [openAdd, setOpenAdd] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openBulk, setOpenBulk] = useState(false);

    // Selection
    const [editingSku, setEditingSku] = useState<any>(null);

    // Pagination & Search State
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Derived State
    const filteredSkus = skus.filter(sku =>
        sku.sku_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sku.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredSkus.length / itemsPerPage);
    const paginatedSkus = filteredSkus.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Bulk Upload State
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Form for Add/Edit
    const form = useForm<z.infer<typeof skuSchema>>({
        resolver: zodResolver(skuSchema) as any,
        defaultValues: { sku_code: "", name: "", unit: "pcs", base_price: 0 as any }
    });

    const fetchSkus = () => {
        setLoading(true);
        fetch("/api/skus")
            .then(res => res.json())
            .then(data => {
                if (data.skus) setSkus(data.skus);
            })
            .finally(() => setLoading(false));
    };

    const fetchProducts = () => {
        fetch("/api/products")
            .then(res => res.json())
            .then(data => {
                if (data.products) setProducts(data.products);
            });
    };

    // Reset to page 1 on fetch? Optional, but good practice if data changes drastically
    useEffect(() => {
        fetchSkus();
        fetchProducts();
    }, []);

    // --- CREATE ---
    const onAddSubmit = async (values: z.infer<typeof skuSchema>) => {
        try {
            const res = await fetch("/api/skus", {
                method: "POST",
                body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            setOpenAdd(false);
            form.reset();
            fetchSkus();
        } catch (e: any) {
            alert(e.message);
        }
    };

    // --- EDIT ---
    const startEdit = (sku: any) => {
        setEditingSku(sku);
        form.reset({
            sku_code: sku.sku_code,
            name: sku.name,
            unit: sku.unit || "pcs",
            base_price: sku.base_price
        });
        setOpenEdit(true);
    };

    const onEditSubmit = async (values: z.infer<typeof skuSchema>) => {
        if (!editingSku) return;
        try {
            const res = await fetch(`/api/skus/${editingSku.id}`, {
                method: "PUT",
                body: JSON.stringify(values)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            setOpenEdit(false);
            setEditingSku(null);
            fetchSkus();
        } catch (e: any) {
            alert(e.message);
        }
    };

    // --- DELETE ---
    const onDelete = async (sku: any) => {
        if (!confirm(`Are you sure you want to delete ${sku.sku_code}?`)) return;

        try {
            const res = await fetch(`/api/skus/${sku.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            fetchSkus();
        } catch (e: any) {
            alert(e.message);
        }
    };

    // --- BULK UPLOAD ---
    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: "binary" });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];

            // Read as array of arrays to check headers
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            if (!rows || rows.length === 0) {
                alert("File appears empty");
                return;
            }

            // Get headers (assume first row)
            const headers = rows[0].map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));
            console.log("Detected headers:", headers);

            // Check if this looks like an HSN file instead
            const hasHsnColumns = headers.some((h: string) =>
                h.includes('hsn') || h.includes('chapter') || h.includes('heading') || h.includes('tariff') || h.includes('gst') || h.includes('duty')
            );

            // Check for SKU-specific columns
            const hasSkuColumns = headers.some((h: string) =>
                h.includes('sku') || h.includes('code') || h.includes('name') || h.includes('price')
            );

            if (hasHsnColumns && !hasSkuColumns) {
                alert(
                    `❌ Wrong file type!\n\n` +
                    `This appears to be an HSN file, not a SKU file.\n\n` +
                    `Found columns: ${rows[0].join(', ')}\n\n` +
                    `For SKU bulk upload, please use a file with:\n` +
                    `• SKU Code (required)\n` +
                    `• Name (required)\n` +
                    `• Unit (optional)\n` +
                    `• Base Price (optional)\n\n` +
                    `To upload HSN codes, please use the HSN Codes page.`
                );
                return;
            }

            // Read JSON
            const data = XLSX.utils.sheet_to_json(ws);

            if (data.length === 0) {
                alert("No data found in file");
                return;
            }

            // Map keys loosely (lowercase headers etc if needed, but for now expect match)
            setBulkData(data);
        };
        reader.readAsBinaryString(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        processFile(file);
    };

    const confirmBulkUpload = async () => {
        setUploading(true);
        try {
            const res = await fetch("/api/skus/bulk", {
                method: "POST",
                body: JSON.stringify({ skus: bulkData })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");

            alert(`Successfully uploaded ${data.count} SKUs!`);
            setOpenBulk(false);
            setBulkData([]);
            fetchSkus();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };


    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">SKU Management</h1>
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
                        <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Bulk Upload SKUs (Excel)</DialogTitle></DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div
                                    className={`p-8 border-2 border-dashed rounded-md text-center transition-colors ${isDragging ? "border-primary bg-accent" : "border-border bg-muted hover:bg-muted"
                                        }`}
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
                                            id="file-upload"
                                        />
                                        <Button variant="secondary" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>
                                            Browse Files
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">Expected columns: sku_code, name, unit, base_price</p>
                                </div>

                                {bulkData.length > 0 && (
                                    <div className="max-h-60 overflow-auto border rounded-md">
                                        <Table>
                                            <TableHeader className="bg-muted sticky top-0 shadow-sm">
                                                <TableRow>
                                                    <TableHead className="font-bold text-foreground">Code</TableHead>
                                                    <TableHead className="font-bold text-foreground">Name</TableHead>
                                                    <TableHead className="font-bold text-foreground">Unit</TableHead>
                                                    <TableHead className="font-bold text-foreground text-right">Price</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bulkData.slice(0, 5).map((row, i) => (
                                                    <TableRow key={i}>
                                                        <TableCell className="font-medium">{row.sku_code}</TableCell>
                                                        <TableCell className="truncate max-w-[200px]">{row.name}</TableCell>
                                                        <TableCell>{row.unit}</TableCell>
                                                        <TableCell className="text-right">{row.base_price}</TableCell>
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

                    <Dialog open={openAdd} onOpenChange={setOpenAdd}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="w-4 h-4 mr-2" /> Add SKU
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Add New SKU</DialogTitle></DialogHeader>
                            <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4 pt-4">
                                <SKUFormFields form={form} products={products} />
                                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                    Save SKU
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
                        placeholder="Search by SKU code or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8"
                    />
                </div>
            </div>

            {/* EDIT DIALOG */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Edit SKU</DialogTitle></DialogHeader>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                        <SKUFormFields form={form} products={products} />
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            Update SKU
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="font-bold text-foreground">Code</TableHead>
                            <TableHead className="font-bold text-foreground">Product</TableHead>
                            <TableHead className="font-bold text-foreground">Name</TableHead>
                            <TableHead className="font-bold text-foreground">Unit</TableHead>
                            <TableHead className="font-bold text-foreground text-right">Base Price</TableHead>
                            <TableHead className="font-bold text-foreground w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                        ) : paginatedSkus.length === 0 ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No SKUs found.</TableCell></TableRow>
                        ) : (
                            paginatedSkus.map(sku => (
                                <TableRow key={sku.id}>
                                    <TableCell className="font-medium">{sku.sku_code}</TableCell>
                                    <TableCell>{sku.product_name || '-'}</TableCell>
                                    <TableCell>{sku.name}</TableCell>
                                    <TableCell>{sku.unit}</TableCell>
                                    <TableCell className="text-right">{sku.base_price}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(sku)}>
                                                <Pencil className="w-4 h-4 text-primary" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => onDelete(sku)}>
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
                !loading && filteredSkus.length > 0 && (
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <div className="text-muted-foreground mr-4">
                            Page {currentPage} of {totalPages} ({filteredSkus.length} total)
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
        </div >
    );
}

function SKUFormFields({ form, products }: { form: any, products: any[] }) {
    return (
        <>
            <div className="grid gap-2">
                <Label>Parent Product</Label>
                <div className="flex gap-2">
                    <Select
                        onValueChange={(value) => form.setValue("product_id", value)}
                        defaultValue={form.getValues("product_id")}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select Product (Optional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {products.map((p) => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="grid gap-2">
                <Label>SKU Code</Label>
                <Input {...form.register("sku_code")} placeholder="ITEM-001" />
            </div>
            <div className="grid gap-2">
                <Label>Name</Label>
                <Input {...form.register("name")} placeholder="Item Name" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Unit</Label>
                    <Input {...form.register("unit")} placeholder="pcs" />
                </div>
                <div className="grid gap-2">
                    <Label>Base Price</Label>
                    <Input type="number" {...form.register("base_price")} placeholder="0.00" />
                </div>
            </div>
        </>
    );
}
