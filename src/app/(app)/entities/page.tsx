"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import { Plus, Search, Building2, User, Users, Upload, Loader2, Edit, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, CheckCircle2, MapPin, Mail, Phone } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from 'xlsx';

const entitySchema = z.object({
    type: z.enum(["buyer", "supplier", "partner", "other"]),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    address: z.string().optional(),
    tax_id: z.string().optional(),
    verification_status: z.enum(["verified", "unverified"]).optional(),
});

export default function EntitiesPage() {
    const [entities, setEntities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [openAdd, setOpenAdd] = useState(false);
    const [openBulk, setOpenBulk] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [editingEntity, setEditingEntity] = useState<any>(null);
    const [deletingEntity, setDeletingEntity] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const itemsPerPage = 12;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof entitySchema>>({
        resolver: zodResolver(entitySchema),
        defaultValues: {
            type: "buyer",
            name: "",
            email: "",
            phone: "",
            country: "",
            address: "",
            tax_id: "",
            verification_status: "unverified",
        },
    });

    useEffect(() => {
        fetchEntities();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchEntities() {
        setLoading(true);
        try {
            const res = await fetch("/api/entities");
            const data = await res.json();
            if (data.entities) setEntities(data.entities);
        } catch (error) {
            console.error("Failed to fetch entities:", error);
            toast({ title: "Error", description: "Failed to fetch entities", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    async function onAddSubmit(values: z.infer<typeof entitySchema>) {
        try {
            const url = "/api/entities";
            const method = editingEntity ? "PUT" : "POST";
            const body = editingEntity ? { ...values, id: editingEntity.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Failed to save entity");

            await fetchEntities();
            setOpenAdd(false);
            setEditingEntity(null);
            form.reset();
            toast({
                title: "Success",
                description: editingEntity ? "Contact updated successfully" : "Contact added successfully"
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save contact", variant: "destructive" });
        }
    }

    const handleEdit = (entity: any) => {
        setEditingEntity(entity);
        form.reset({
            type: entity.type,
            name: entity.name,
            email: entity.email || "",
            phone: entity.phone || "",
            country: entity.country,
            address: entity.address || "",
            tax_id: entity.tax_id || "",
            verification_status: entity.verification_status || "unverified",
        });
        setOpenAdd(true);
    };

    const handleDelete = async () => {
        if (!deletingEntity) return;

        try {
            const res = await fetch(`/api/entities?id=${deletingEntity.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete entity");

            await fetchEntities();
            toast({ title: "Success", description: "Contact deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete contact", variant: "destructive" });
        } finally {
            setDeletingEntity(null);
        }
    };

    // Bulk Upload Functions
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
            setOpenBulk(false);
            setBulkData([]);
            fetchEntities();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const filteredEntities = entities.filter(entity => {
        const matchesSearch = entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entity.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || entity.type === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredEntities.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEntities = filteredEntities.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Contacts Directory</h2>
                    <p className="text-muted-foreground">Manage Buyers, Suppliers, and Partners.</p>
                </div>
                <div className="flex gap-2">
                    <Dialog open={openBulk} onOpenChange={(open) => {
                        setOpenBulk(open);
                        if (!open) setBulkData([]);
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

                    <Dialog open={openAdd} onOpenChange={(open) => {
                        setOpenAdd(open);
                        if (!open) {
                            setEditingEntity(null);
                            form.reset();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Contact
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingEntity ? "Edit Contact" : "Add New Contact"}</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="type" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Type</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="buyer">Buyer / Customer</SelectItem>
                                                        <SelectItem value="supplier">Supplier / Vendor</SelectItem>
                                                        <SelectItem value="partner">Partner / Provider</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="verification_status" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="verified">Verified</SelectItem>
                                                        <SelectItem value="unverified">Unverified</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Company / Contact Name</FormLabel>
                                            <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="email" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl><Input placeholder="contact@example.com" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="phone" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl><Input placeholder="+91..." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="country" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl><Input placeholder="India" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="tax_id" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Tax ID / GST / VAT</FormLabel>
                                                <FormControl><Input placeholder="Optional" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="address" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Full Address</FormLabel>
                                            <FormControl><Input placeholder="Office address..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button variant="outline" type="button" onClick={() => {
                                            setOpenAdd(false);
                                            setEditingEntity(null);
                                            form.reset();
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting ? "Saving..." : editingEntity ? "Update Contact" : "Save Contact"}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search entities..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                setCurrentPage(1);
            }}>
                <TabsList>
                    <TabsTrigger value="all">All Contacts</TabsTrigger>
                    <TabsTrigger value="buyer">Buyers</TabsTrigger>
                    <TabsTrigger value="supplier">Suppliers</TabsTrigger>
                    <TabsTrigger value="partner">Partners</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : filteredEntities.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No contacts found"
                            description="Add buyers, suppliers, or partners to manage your network."
                            actionLabel="Add Contact"
                            onAction={() => setOpenAdd(true)}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedEntities.map((entity) => (
                                        <Card key={entity.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg flex items-center gap-2">
                                                            {entity.name}
                                                            {entity.verification_status === 'verified' && (
                                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-muted-foreground capitalize">{entity.type}</div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(entity)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => setDeletingEntity(entity)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Badge variant={entity.verification_status === 'verified' ? "default" : "secondary"}>
                                                    {entity.verification_status === 'verified' ? "Verified" : "Unverified"}
                                                </Badge>

                                                <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                                    {entity.country && (
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="w-4 h-4 text-muted-foreground" /> {entity.country}
                                                        </div>
                                                    )}
                                                    {entity.email && (
                                                        <div className="flex items-center gap-2">
                                                            <Mail className="w-4 h-4 text-muted-foreground" /> {entity.email}
                                                        </div>
                                                    )}
                                                    {entity.phone && (
                                                        <div className="flex items-center gap-2">
                                                            <Phone className="w-4 h-4 text-muted-foreground" /> {entity.phone}
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="border rounded-md bg-card">
                                    <Table className="table-fixed">
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[200px]">Name</TableHead>
                                                <TableHead className="w-[120px]">Type</TableHead>
                                                <TableHead className="w-[220px]">Email</TableHead>
                                                <TableHead className="w-[150px]">Country</TableHead>
                                                <TableHead className="w-[120px]">Status</TableHead>
                                                <TableHead className="w-[120px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEntities.map((entity) => (
                                                <TableRow key={entity.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {entity.name}
                                                            {entity.verification_status === 'verified' && (
                                                                <CheckCircle2 className="w-4 h-4 text-primary" />
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="capitalize">{entity.type}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {entity.email || "—"}
                                                    </TableCell>
                                                    <TableCell>{entity.country || "—"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={entity.verification_status === 'verified' ? "default" : "secondary"}>
                                                            {entity.verification_status === 'verified' ? "Verified" : "Unverified"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEdit(entity)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => setDeletingEntity(entity)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}

                            {totalPages > 1 && (
                                <div className="flex items-center justify-end gap-2 text-sm mt-4">
                                    <div className="text-muted-foreground mr-4">
                                        Page {currentPage} of {totalPages} ({filteredEntities.length} total)
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
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!deletingEntity} onOpenChange={(open) => !open && setDeletingEntity(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the contact "{deletingEntity?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
