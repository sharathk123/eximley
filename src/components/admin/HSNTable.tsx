"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";

const hsnSchema = z.object({
    itc_hs_code: z.string().min(1, "ITC HS Code is required"),
    commodity: z.string().optional(),
    gst_hsn_code: z.string().min(1, "GST HSN Code is required"),
    description: z.string().optional(),
    gst_rate: z.preprocess((val) => Number(val), z.number().min(0)),
    govt_notification_no: z.string().optional(),
    govt_published_date: z.string().optional(),
});

type HSN = {
    id: string;
    itc_hs_code: string;
    commodity: string;
    gst_hsn_code: string;
    description: string;
    gst_rate: number;
    govt_notification_no?: string;
    govt_published_date?: string;
    updated_at: string;
};

export default function HSNTable() {
    const [hsnCodes, setHsnCodes] = useState<HSN[]>([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingHsn, setEditingHsn] = useState<HSN | null>(null);
    const [openEdit, setOpenEdit] = useState(false);

    // Filter & Pagination State
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const form = useForm<z.infer<typeof hsnSchema>>({
        resolver: zodResolver(hsnSchema) as any,
        defaultValues: {
            itc_hs_code: "",
            commodity: "",
            gst_hsn_code: "",
            description: "",
            gst_rate: 0 as any,
            govt_notification_no: "",
            govt_published_date: ""
        }
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
                setCurrentPage(1); // This will trigger the page change effect
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const onSubmit = async (values: z.infer<typeof hsnSchema>) => {
        try {
            const res = await fetch("/api/hsn", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
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
    const startEdit = (hsn: HSN) => {
        setEditingHsn(hsn);
        form.reset({
            itc_hs_code: hsn.itc_hs_code,
            commodity: hsn.commodity,
            gst_hsn_code: hsn.gst_hsn_code,
            description: hsn.description,
            gst_rate: hsn.gst_rate,
            govt_notification_no: hsn.govt_notification_no || "",
            govt_published_date: hsn.govt_published_date || "",
        });
        setOpenEdit(true);
    };

    const onEditSubmit = async (values: z.infer<typeof hsnSchema>) => {
        if (!editingHsn) return;
        try {
            const res = await fetch(`/api/hsn/${editingHsn.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
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
    const onDelete = async (hsn: HSN) => {
        if (!confirm(`Delete HSN ${hsn.itc_hs_code}?`)) return;
        try {
            const res = await fetch(`/api/hsn/${hsn.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            fetchHsn();
        } catch (e: any) {
            alert(e.message || "Failed to delete");
        }
    };

    return (
        <div className="space-y-6">
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

            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 max-w-sm flex-1">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by code or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 focus-visible:ring-green-500"
                        />
                    </div>
                </div>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                            <Plus className="w-4 h-4 mr-2" /> Add HSN
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add New HSN Code</DialogTitle></DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <HSNFormFields form={form} />
                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save HSN
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card overflow-x-auto">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-bold text-foreground w-[120px]">ITC HS</TableHead>
                            <TableHead className="font-bold text-foreground w-[100px]">GST HSN</TableHead>
                            <TableHead className="font-bold text-foreground w-[25%]">Commodity</TableHead>
                            <TableHead className="font-bold text-foreground">Description</TableHead>
                            <TableHead className="font-bold text-foreground text-center w-[100px]">GST %</TableHead>
                            <TableHead className="font-bold text-foreground w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center"><Loader2 className="animate-spin inline" /></TableCell></TableRow>
                        ) : hsnCodes.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No HSN codes found.</TableCell></TableRow>
                        ) : (
                            hsnCodes.map(hsn => (
                                <TableRow key={hsn.id}>
                                    <TableCell className="font-medium whitespace-nowrap">{hsn.itc_hs_code}</TableCell>
                                    <TableCell className="font-mono text-xs">{hsn.gst_hsn_code}</TableCell>
                                    <TableCell className="text-xs whitespace-normal break-words align-top">{hsn.commodity}</TableCell>
                                    <TableCell className="text-xs whitespace-normal break-words align-top">
                                        {hsn.description}
                                    </TableCell>
                                    <TableCell className="text-center">{hsn.gst_rate}%</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => startEdit(hsn)}>
                                                <Pencil className="w-4 h-4 text-green-600" />
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
                        >
                            <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            title="Previous Page"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))}
                            disabled={currentPage === meta.totalPages}
                            title="Next Page"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setCurrentPage(meta.totalPages)}
                            disabled={currentPage === meta.totalPages}
                            title="Last Page"
                        >
                            <ChevronsRight className="h-4 w-4" />
                        </Button>
                    </div>
                )
            }

            {/* EDIT DIALOG */}
            <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Edit HSN Code</DialogTitle></DialogHeader>
                    <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4 pt-4">
                        <HSNFormFields form={form} />
                        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                            Update HSN
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function HSNFormFields({ form }: { form: any }) {
    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>ITC HS Code</Label>
                    <Input {...form.register("itc_hs_code")} placeholder="e.g. 10063010" />
                    {form.formState.errors.itc_hs_code && <span className="text-red-500 text-xs">{form.formState.errors.itc_hs_code.message}</span>}
                </div>
                <div className="grid gap-2">
                    <Label>GST HSN Code</Label>
                    <Input {...form.register("gst_hsn_code")} placeholder="e.g. 1006" />
                    {form.formState.errors.gst_hsn_code && <span className="text-red-500 text-xs">{form.formState.errors.gst_hsn_code.message}</span>}
                </div>
            </div>

            <div className="grid gap-2">
                <Label>Commodity</Label>
                <Input {...form.register("commodity")} placeholder="Short name or category" />
            </div>

            <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea {...form.register("description")} placeholder="Detailed description of goods" className="h-24" />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                    <Label>GST Rate (%)</Label>
                    <Input type="number" step="0.01" {...form.register("gst_rate")} placeholder="18" />
                </div>
                <div className="grid gap-2">
                    <Label>Notification No.</Label>
                    <Input {...form.register("govt_notification_no")} placeholder="e.g. 1/2017-CTR" />
                </div>
                <div className="grid gap-2">
                    <Label>Published Date</Label>
                    <Input type="date" {...form.register("govt_published_date")} />
                </div>
            </div>
        </div>
    );
}
