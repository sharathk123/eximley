"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
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
import { Search, Plus, Loader2, Upload, Edit, Trash2, LayoutGrid, List, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Textarea } from "@/components/ui/textarea";
import * as XLSX from 'xlsx';

const enquirySchema = z.object({
    customer_name: z.string().min(1, "Customer name is required"),
    customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
    customer_phone: z.string().optional(),
    customer_company: z.string().optional(),
    customer_country: z.string().optional(),
    source: z.string().optional(),
    subject: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    next_follow_up_date: z.string().optional(),
});


export default function EnquiriesPage() {
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [openAdd, setOpenAdd] = useState(false);
    const [openBulk, setOpenBulk] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
    const [deletingEnquiry, setDeletingEnquiry] = useState<any>(null);
    const [convertingEnquiry, setConvertingEnquiry] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
    const itemsPerPage = 12;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof enquirySchema>>({
        resolver: zodResolver(enquirySchema),
        defaultValues: {
            customer_name: "",
            customer_email: "",
            customer_phone: "",
            customer_company: "",
            customer_country: "",
            source: "other",
            subject: "",
            description: "",
            priority: "medium",
            next_follow_up_date: "",
        },
    });

    useEffect(() => {
        fetchEnquiries();
    }, []);

    async function fetchEnquiries() {
        setLoading(true);
        try {
            const res = await fetch("/api/enquiries");
            const data = await res.json();
            if (data.enquiries) setEnquiries(data.enquiries);
        } catch (error) {
            console.error("Failed to fetch enquiries:", error);
            toast({ title: "Error", description: "Failed to fetch enquiries", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    async function onAddSubmit(values: z.infer<typeof enquirySchema>) {
        try {
            const url = "/api/enquiries";
            const method = editingEnquiry ? "PUT" : "POST";
            const body = editingEnquiry ? { ...values, id: editingEnquiry.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) throw new Error("Failed to save enquiry");

            await fetchEnquiries();
            setOpenAdd(false);
            setEditingEnquiry(null);
            form.reset();
            toast({
                title: "Success",
                description: editingEnquiry ? "Enquiry updated successfully" : "Enquiry added successfully"
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save enquiry", variant: "destructive" });
        }
    }

    const handleEdit = (enquiry: any) => {
        setEditingEnquiry(enquiry);
        form.reset({
            customer_name: enquiry.customer_name,
            customer_email: enquiry.customer_email || "",
            customer_phone: enquiry.customer_phone || "",
            customer_company: enquiry.customer_company || "",
            customer_country: enquiry.customer_country || "",
            source: enquiry.source || "other",
            subject: enquiry.subject || "",
            description: enquiry.description || "",
            priority: enquiry.priority || "medium",
            next_follow_up_date: enquiry.next_follow_up_date || "",
        });
        setOpenAdd(true);
    };

    const handleDelete = async () => {
        if (!deletingEnquiry) return;

        try {
            const res = await fetch(`/api/enquiries?id=${deletingEnquiry.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete enquiry");

            await fetchEnquiries();
            toast({ title: "Success", description: "Enquiry deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete enquiry", variant: "destructive" });
        } finally {
            setDeletingEnquiry(null);
        }
    };

    const handleConvertToPI = async () => {
        if (!convertingEnquiry) return;

        try {
            const res = await fetch("/api/enquiries/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enquiry_id: convertingEnquiry.id }),
            });

            if (!res.ok) throw new Error("Failed to convert enquiry");

            const data = await res.json();
            await fetchEnquiries();
            toast({
                title: "Success",
                description: `Enquiry converted to PI successfully! PI Number: ${data.pi?.invoice_number || 'Created'}`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to convert enquiry", variant: "destructive" });
        } finally {
            setConvertingEnquiry(null);
        }
    };

    const handleMarkStatus = async (enquiry: any, status: string, reason?: string) => {
        try {
            const updates: any = { id: enquiry.id, status };
            if (status === 'lost' && reason) {
                updates.lost_reason = reason;
            }

            const res = await fetch("/api/enquiries", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates),
            });

            if (!res.ok) throw new Error("Failed to update status");

            await fetchEnquiries();
            toast({ title: "Success", description: `Enquiry marked as ${status}` });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
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
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("No data found in file");
                    return;
                }

                setBulkData(data);
            } catch (e: any) {
                console.error(e);
                alert("Error parsing file: " + e.message);
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmBulkUpload = async () => {
        setUploading(true);
        try {
            const res = await fetch("/api/enquiries/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enquiries: bulkData })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed");

            toast({ title: "Success", description: `Successfully uploaded ${data.count} enquiries!` });
            setOpenBulk(false);
            setBulkData([]);
            fetchEnquiries();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    const filteredEnquiries = enquiries.filter(enquiry => {
        const matchesSearch = enquiry.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            enquiry.customer_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            enquiry.customer_company?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || enquiry.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEnquiries = filteredEnquiries.slice(startIndex, startIndex + itemsPerPage);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'default';
            case 'contacted': return 'secondary';
            case 'quoted': return 'outline';
            case 'won': return 'default';
            case 'lost': return 'destructive';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'urgent': return 'destructive';
            case 'high': return 'default';
            case 'medium': return 'secondary';
            case 'low': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Enquiries</h2>
                    <p className="text-muted-foreground">Manage customer enquiries and convert to orders.</p>
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
                                <DialogTitle>Bulk Upload Enquiries (Excel)</DialogTitle>
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
                                            id="enquiry-file-upload"
                                        />
                                        <Button variant="secondary" size="sm" onClick={() => document.getElementById('enquiry-file-upload')?.click()}>
                                            Browse Files
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">Expected columns: Customer Name, Email, Phone, Company, Country, Source, Subject, Description, Priority</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-60 overflow-auto border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-left font-bold">Customer Name</th>
                                                    <th className="p-2 text-left font-bold">Email</th>
                                                    <th className="p-2 text-left font-bold">Company</th>
                                                    <th className="p-2 text-left font-bold">Priority</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bulkData.slice(0, 10).map((row, idx) => (
                                                    <tr key={idx} className="border-t">
                                                        <td className="p-2">{row.customer_name || row['Customer Name']}</td>
                                                        <td className="p-2">{row.customer_email || row['Email']}</td>
                                                        <td className="p-2">{row.customer_company || row['Company']}</td>
                                                        <td className="p-2">{row.priority || row['Priority'] || 'medium'}</td>
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
                            setEditingEnquiry(null);
                            form.reset();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Enquiry
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editingEnquiry ? "Edit Enquiry" : "Add New Enquiry"}</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                                    <FormField control={form.control} name="customer_name" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Customer Name *</FormLabel>
                                            <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="customer_email" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Email</FormLabel>
                                                <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_phone" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Phone</FormLabel>
                                                <FormControl><Input placeholder="+1..." {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="customer_company" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Company</FormLabel>
                                                <FormControl><Input placeholder="Acme Corp" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="customer_country" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Country</FormLabel>
                                                <FormControl><Input placeholder="USA" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField control={form.control} name="source" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Source</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="email">Email</SelectItem>
                                                        <SelectItem value="phone">Phone</SelectItem>
                                                        <SelectItem value="website">Website</SelectItem>
                                                        <SelectItem value="trade_show">Trade Show</SelectItem>
                                                        <SelectItem value="referral">Referral</SelectItem>
                                                        <SelectItem value="other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="priority" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Priority</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="low">Low</SelectItem>
                                                        <SelectItem value="medium">Medium</SelectItem>
                                                        <SelectItem value="high">High</SelectItem>
                                                        <SelectItem value="urgent">Urgent</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <FormField control={form.control} name="subject" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Subject</FormLabel>
                                            <FormControl><Input placeholder="Product inquiry" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="description" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Description</FormLabel>
                                            <FormControl><Textarea placeholder="Details..." {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <FormField control={form.control} name="next_follow_up_date" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Next Follow-up Date</FormLabel>
                                            <FormControl><Input type="date" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />

                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button variant="outline" type="button" onClick={() => {
                                            setOpenAdd(false);
                                            setEditingEnquiry(null);
                                            form.reset();
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button type="submit" disabled={form.formState.isSubmitting}>
                                            {form.formState.isSubmitting ? "Saving..." : editingEnquiry ? "Update Enquiry" : "Save Enquiry"}
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
                        placeholder="Search enquiries..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <div className="flex gap-1 border rounded-md p-1">
                    <Button
                        variant={viewMode === 'card' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('card')}
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === 'list' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(value) => {
                setActiveTab(value);
                setCurrentPage(1);
            }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="new">New</TabsTrigger>
                    <TabsTrigger value="contacted">Contacted</TabsTrigger>
                    <TabsTrigger value="quoted">Quoted</TabsTrigger>
                    <TabsTrigger value="won">Won</TabsTrigger>
                    <TabsTrigger value="lost">Lost</TabsTrigger>
                    <TabsTrigger value="converted">Converted</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>
                    ) : filteredEnquiries.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground border rounded-md bg-card">
                            No enquiries found. Click "Add Enquiry" to create one.
                        </div>
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedEnquiries.map((enquiry) => (
                                        <Card key={enquiry.id} className="shadow-sm hover:shadow-md transition-shadow">
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg">{enquiry.customer_name}</div>
                                                        <div className="text-sm text-muted-foreground">{enquiry.enquiry_number}</div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => handleEdit(enquiry)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => setDeletingEnquiry(enquiry)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <Badge variant={getStatusColor(enquiry.status)}>{enquiry.status}</Badge>
                                                    <Badge variant={getPriorityColor(enquiry.priority)}>{enquiry.priority}</Badge>
                                                </div>

                                                <div className="space-y-1 text-sm text-muted-foreground pt-2">
                                                    {enquiry.customer_company && <div>Company: {enquiry.customer_company}</div>}
                                                    {enquiry.customer_email && <div>Email: {enquiry.customer_email}</div>}
                                                    {enquiry.subject && <div>Subject: {enquiry.subject}</div>}
                                                    {enquiry.next_follow_up_date && (
                                                        <div>Follow-up: {new Date(enquiry.next_follow_up_date).toLocaleDateString()}</div>
                                                    )}
                                                </div>

                                                {enquiry.status !== 'converted' && enquiry.status !== 'won' && enquiry.status !== 'lost' && (
                                                    <div className="flex gap-2 pt-2">
                                                        <Button size="sm" variant="outline" onClick={() => setConvertingEnquiry(enquiry)}>
                                                            <FileText className="h-3 w-3 mr-1" /> Create Quote
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleMarkStatus(enquiry, 'won')}>
                                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Won
                                                        </Button>
                                                        <Button size="sm" variant="outline" onClick={() => handleMarkStatus(enquiry, 'lost', 'other')}>
                                                            <XCircle className="h-3 w-3 mr-1" /> Lost
                                                        </Button>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="border rounded-lg">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Enquiry #</TableHead>
                                                <TableHead>Customer</TableHead>
                                                <TableHead>Company</TableHead>
                                                <TableHead>Source</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Priority</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEnquiries.map((enquiry) => (
                                                <TableRow key={enquiry.id}>
                                                    <TableCell className="font-medium">{enquiry.enquiry_number}</TableCell>
                                                    <TableCell>{enquiry.customer_name}</TableCell>
                                                    <TableCell>{enquiry.customer_company || "—"}</TableCell>
                                                    <TableCell className="capitalize">{enquiry.source || "—"}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(enquiry.status)}>{enquiry.status}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={getPriorityColor(enquiry.priority)}>{enquiry.priority}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleEdit(enquiry)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive"
                                                                onClick={() => setDeletingEnquiry(enquiry)}
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
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    onClick={() => setCurrentPage(page)}
                                                    isActive={currentPage === page}
                                                    className="cursor-pointer"
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingEnquiry} onOpenChange={(open) => !open && setDeletingEnquiry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the enquiry "{deletingEnquiry?.enquiry_number}". This action cannot be undone.
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

            {/* Create Quote Confirmation Dialog */}
            <AlertDialog open={!!convertingEnquiry} onOpenChange={(open) => !open && setConvertingEnquiry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Convert to Proforma Invoice?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will create a new Proforma Invoice from enquiry "{convertingEnquiry?.enquiry_number}" and mark the enquiry as converted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConvertToPI}>
                            Create Quote
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
