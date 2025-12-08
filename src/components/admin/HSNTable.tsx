"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Pencil, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const hsnSchema = z.object({
    hsn_code: z.string().min(1, "Required"),
    description: z.string().optional(),
    gst_rate: z.preprocess((val) => Number(val), z.number().min(0)),
    chapter: z.string().optional(),
});

type HSN = {
    id: string;
    hsn_code: string;
    description: string;
    gst_rate: number;
    chapter: string;
};

export default function HSNTable() {
    const [hsnCodes, setHsnCodes] = useState<HSN[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [editingHsn, setEditingHsn] = useState<HSN | null>(null);
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
        defaultValues: { hsn_code: "", description: "", gst_rate: 0 as any, chapter: "" }
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
            hsn_code: hsn.hsn_code,
            description: hsn.description,
            gst_rate: hsn.gst_rate,
            chapter: hsn.chapter
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
        if (!confirm(`Delete HSN ${hsn.hsn_code}?`)) return;
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
                    <DialogContent>
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

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-bold text-foreground w-[120px]">HSN Code</TableHead>
                            <TableHead className="font-bold text-foreground">Description</TableHead>
                            <TableHead className="font-bold text-foreground text-right">GST Rate</TableHead>
                            <TableHead className="font-bold text-foreground">Chapter</TableHead>
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
                                    <TableCell className="text-xs whitespace-normal break-words max-w-[300px]">{hsn.description}</TableCell>
                                    <TableCell className="text-right">{(() => {
                                        const rate = hsn.gst_rate || 0;
                                        return rate < 1 && rate > 0 ? (rate * 100).toFixed(2) : rate;
                                    })()}%</TableCell>
                                    <TableCell>{hsn.chapter || '-'}</TableCell>
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
        </div>
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
                    <Label>Chapter</Label>
                    <Input {...form.register("chapter")} placeholder="84" />
                </div>
            </div>
        </>
    );
}
