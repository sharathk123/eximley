"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Pencil, Trash2, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Edit } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const hsnSchema = z.object({
    itc_hs_code: z.string().min(1, "ITC HS Code is required"),
    commodity: z.string().optional(),
    gst_hsn_code: z.string().min(1, "GST HSN Code is required"),
    itc_hs_code_description: z.string().optional(),
    gst_hsn_code_description: z.string().optional(),
    chapter: z.string().optional(),
    gst_rate: z.preprocess((val) => Number(val), z.number().min(0)),
    govt_notification_no: z.string().optional(),
    govt_published_date: z.string().optional(),
});

type HSN = {
    id: string;
    itc_hs_code: string;
    commodity: string;
    gst_hsn_code: string;
    itc_hs_code_description?: string;
    gst_hsn_code_description?: string;
    chapter?: string;
    gst_rate: number;
    govt_notification_no?: string;
    govt_published_date?: string;
    updated_at: string;
};

export default function HSNTable() {
    const { toast } = useToast();
    const [hsnCodes, setHsnCodes] = useState<HSN[]>([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingHsn, setEditingHsn] = useState<HSN | null>(null);
    const [openEdit, setOpenEdit] = useState(false);

    // Delete state
    const [hsnToDelete, setHsnToDelete] = useState<HSN | null>(null);

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
            itc_hs_code_description: "",
            gst_hsn_code_description: "",
            chapter: "",
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
            toast({ title: "HSN Created", description: "Successfully added new HSN code." });
        } catch (e) {
            console.error(e);
            toast({ variant: "destructive", title: "Error", description: "Failed to create HSN" });
        }
    }

    // --- EDIT ---
    const startEdit = (hsn: HSN) => {
        setEditingHsn(hsn);
        form.reset({
            itc_hs_code: hsn.itc_hs_code,
            commodity: hsn.commodity,
            gst_hsn_code: hsn.gst_hsn_code,
            itc_hs_code_description: hsn.itc_hs_code_description || "",
            gst_hsn_code_description: hsn.gst_hsn_code_description || "",
            chapter: hsn.chapter || "",
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
            toast({ title: "HSN Updated", description: "Successfully updated HSN code." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "Failed to update" });
        }
    };

    // --- DELETE ---
    const confirmDelete = async () => {
        if (!hsnToDelete) return;
        try {
            const res = await fetch(`/api/hsn/${hsnToDelete.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            fetchHsn();
            toast({ title: "HSN Deleted", description: "Successfully deleted HSN code." });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message || "Failed to delete" });
        } finally {
            setHsnToDelete(null);
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
                            className="pl-8 focus-visible:ring-primary"
                        />
                    </div>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <div className="flex gap-2">
                        <DialogTrigger asChild>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                                <Plus className="w-4 h-4 mr-2" /> Add HSN
                            </Button>
                        </DialogTrigger>
                    </div>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader><DialogTitle>Add New HSN Code</DialogTitle></DialogHeader>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                            <HSNFormFields form={form} />
                            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Save HSN
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md bg-card">
                <DataTable
                    data={hsnCodes}
                    loading={loading}
                    columns={[
                        {
                            key: "itc_hs_code",
                            header: "ITC HS",
                            width: "w-[120px]",
                            sortable: true,
                            cellClassName: "font-mono font-medium text-xs bg-primary/5 text-primary rounded-sm px-2 py-0.5 inline-block border border-primary/20",
                            cell: (row) => row.itc_hs_code
                        },
                        {
                            key: "gst_hsn_code",
                            header: "GST HSN",
                            width: "w-[100px]",
                            sortable: true,
                            cellClassName: "font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-sm border border-border inline-block",
                            cell: (row) => row.gst_hsn_code
                        },
                        {
                            key: "chapter",
                            header: "Chapter",
                            width: "w-[150px]",
                            cell: (row) => (
                                <div className="text-sm font-medium text-foreground/80 leading-snug whitespace-normal break-words max-w-[150px]">
                                    {row.chapter || <span className="text-muted-foreground/40 italic">-</span>}
                                </div>
                            )
                        },
                        {
                            key: "commodity",
                            header: "Commodity",
                            width: "w-[200px]",
                            cell: (row) => (
                                <div className="text-sm text-foreground/70 leading-snug whitespace-normal break-words max-w-[200px]">
                                    {row.commodity || <span className="text-muted-foreground/40 italic">-</span>}
                                </div>
                            )
                        },
                        {
                            key: "itc_desc",
                            header: "ITC HS Description",
                            cell: (row) => (
                                <div className="text-sm text-foreground/90 leading-relaxed whitespace-normal break-words min-w-[250px] max-w-[300px]" title={row.itc_hs_code_description}>
                                    {row.itc_hs_code_description || <span className="text-muted-foreground/40 italic">No description available</span>}
                                </div>
                            )
                        },
                        {
                            key: "gst_desc",
                            header: "GST HSN Description",
                            cell: (row) => (
                                <div className="text-sm text-foreground/90 leading-relaxed whitespace-normal break-words min-w-[250px] max-w-[300px]" title={row.gst_hsn_code_description}>
                                    {row.gst_hsn_code_description || <span className="text-muted-foreground/40 italic">No description available</span>}
                                </div>
                            )
                        },
                        {
                            key: "gst_rate",
                            header: "GST %",
                            width: "w-[80px]",
                            cellClassName: "text-center",
                            cell: (row) => row.gst_rate !== null && row.gst_rate !== undefined ? (
                                <Badge variant={row.gst_rate > 18 ? "destructive" : row.gst_rate > 12 ? "secondary" : "default"} className={`font-bold ${row.gst_rate <= 12 ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}`}>
                                    {row.gst_rate}%
                                </Badge>
                            ) : <span className="text-muted-foreground/40 italic">-</span>
                        }
                    ]}
                    actions={(row) => (
                        <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => startEdit(row)} className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full">
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setHsnToDelete(row)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full">
                                <Trash2 className="w-3.5 h-3.5" />
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

            {/* DELETE ALERT DIALOG */}
            <AlertDialog open={!!hsnToDelete} onOpenChange={() => setHsnToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete HSN Code <b>{hsnToDelete?.itc_hs_code}</b>.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
                <Label>Chapter / Category</Label>
                <Input {...form.register("chapter")} placeholder="e.g. Articles of Iron or Steel" />
            </div>

            <div className="grid gap-2">
                <Label>ITC HS Code Description</Label>
                <Textarea {...form.register("itc_hs_code_description")} placeholder="Description from ITC HS Code source" className="h-20" />
            </div>

            <div className="grid gap-2">
                <Label>GST HSN Code Description</Label>
                <Textarea {...form.register("gst_hsn_code_description")} placeholder="Description from GST HSN Code source" className="h-20" />
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
