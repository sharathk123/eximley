"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
import { Search, Plus, Loader2, Edit, Trash2, MessageSquare, FileText, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { EnquiryEditDialog } from "@/components/enquiries/EnquiryEditDialog";
import { EnquiryDetailsDialog } from "@/components/enquiries/EnquiryDetailsDialog";
import { EnquiryBulkUploadDialog } from "@/components/enquiries/EnquiryBulkUploadDialog";

export default function EnquiriesPage() {
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [openAdd, setOpenAdd] = useState(false);

    // Dialog states
    const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
    const [viewingEnquiry, setViewingEnquiry] = useState<any>(null);
    const [deletingEnquiry, setDeletingEnquiry] = useState<any>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const itemsPerPage = 12;
    const { toast } = useToast();

    useEffect(() => {
        fetchEnquiries();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

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

    const handleEdit = (enquiry: any) => {
        setEditingEnquiry(enquiry);
        setOpenAdd(true);
    };

    const handleView = (enquiry: any) => {
        setViewingEnquiry(enquiry);
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

    const handleConvertToPI = async (enquiry: any) => {
        if (!enquiry) return;

        try {
            const res = await fetch("/api/enquiries/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enquiry_id: enquiry.id }),
            });

            if (!res.ok) throw new Error("Failed to convert enquiry");

            const data = await res.json();
            await fetchEnquiries();
            toast({
                title: "Success",
                description: `Enquiry converted successfully! Quote Number: ${data.quote?.quote_number || 'Created'}`,
                action: (
                    <Button variant="outline" size="sm" onClick={() => window.location.href = `/quotes?id=${data.quote?.id}`}>
                        View Quote
                    </Button>
                ),
            });
            setViewingEnquiry(null); // Close details if open
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to convert enquiry", variant: "destructive" });
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

            if (viewingEnquiry && viewingEnquiry.id === enquiry.id) {
                setViewingEnquiry({ ...viewingEnquiry, status });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
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
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Enquiries</h2>
                    <p className="text-muted-foreground mt-1">Manage customer enquiries and convert to orders.</p>
                </div>
                <div className="flex gap-2">
                    <EnquiryBulkUploadDialog onUploadComplete={fetchEnquiries} />
                    <Button onClick={() => {
                        setEditingEnquiry(null);
                        setOpenAdd(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Enquiry
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search enquiries by name, email, or company..."
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
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                    ) : filteredEnquiries.length === 0 ? (
                        <EmptyState
                            icon={MessageSquare}
                            title="No enquiries found"
                            description={searchQuery ? "No results match your search." : "Typically, new enquiries will appear here."}
                            actionLabel={searchQuery ? "Clear Search" : "Add Enquiry"}
                            onAction={searchQuery ? () => setSearchQuery("") : () => setOpenAdd(true)}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            {viewMode === 'card' ? (
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {paginatedEnquiries.map((enquiry) => (
                                        <Card
                                            key={enquiry.id}
                                            className="shadow-sm hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary"
                                            onClick={() => handleView(enquiry)}
                                        >
                                            <CardContent className="p-5 space-y-3">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-lg">{enquiry.customer_name}</div>
                                                        <div className="text-sm text-muted-foreground">{enquiry.enquiry_number}</div>
                                                    </div>
                                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-muted"
                                                            onClick={() => handleEdit(enquiry)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
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
                                                    {enquiry.email && <div>Email: {enquiry.email}</div>}
                                                    {enquiry.subject && <div>Subject: {enquiry.subject}</div>}
                                                    {enquiry.next_follow_up_date && (
                                                        <div className="text-xs text-orange-600 font-medium">Follow-up: {new Date(enquiry.next_follow_up_date).toLocaleDateString()}</div>
                                                    )}
                                                    {enquiry.quotes && enquiry.quotes.length > 0 && (
                                                        <div className="pt-1 text-xs">
                                                            Quote: <span className="font-medium text-primary">{enquiry.quotes[0].quote_number}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                                                    {enquiry.status !== 'converted' && enquiry.status !== 'won' && enquiry.status !== 'lost' && (
                                                        <>
                                                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleConvertToPI(enquiry)}>
                                                                <FileText className="h-3 w-3 mr-1" /> Quote
                                                            </Button>
                                                            <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleMarkStatus(enquiry, 'won')}>
                                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Won
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="border rounded-md bg-card">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-[120px]">Enquiry #</TableHead>
                                                <TableHead className="w-[150px]">Customer</TableHead>
                                                <TableHead className="w-[150px]">Company</TableHead>
                                                <TableHead className="hidden md:table-cell w-[200px]">Interested Products</TableHead>
                                                <TableHead className="hidden md:table-cell w-[100px]">Source</TableHead>
                                                <TableHead className="w-[100px]">Status</TableHead>
                                                <TableHead className="w-[100px]">Priority</TableHead>
                                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {paginatedEnquiries.map((enquiry) => (
                                                <TableRow
                                                    key={enquiry.id}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => handleView(enquiry)}
                                                >
                                                    <TableCell className="font-medium">{enquiry.enquiry_number}</TableCell>
                                                    <TableCell>{enquiry.customer_name}</TableCell>
                                                    <TableCell>{enquiry.customer_company || "—"}</TableCell>
                                                    <TableCell className="hidden md:table-cell">
                                                        {enquiry.enquiry_items && enquiry.enquiry_items.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                                {enquiry.enquiry_items.map((item: any, index: number) => (
                                                                    <Badge key={index} variant="secondary" className="px-1 py-0 text-[10px] font-normal h-5 truncate max-w-[150px]">
                                                                        {item.skus?.products?.name || item.skus?.name || item.skus?.sku_code || "Unknown"}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : <span className="text-muted-foreground text-xs">—</span>}
                                                    </TableCell>
                                                    <TableCell className="hidden md:table-cell capitalize">{enquiry.source?.replace('_', ' ') || "—"}</TableCell>
                                                    <TableCell><Badge variant={getStatusColor(enquiry.status)}>{enquiry.status}</Badge></TableCell>
                                                    <TableCell><Badge variant={getPriorityColor(enquiry.priority)}>{enquiry.priority}</Badge></TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
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
                                <Pagination className="mt-4">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                            />
                                        </PaginationItem>
                                        <PaginationItem>
                                            <span className="px-4 text-sm">
                                                Page {currentPage} of {totalPages}
                                            </span>
                                        </PaginationItem>
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

            <EnquiryEditDialog
                open={openAdd}
                onOpenChange={setOpenAdd}
                enquiry={editingEnquiry}
                onSave={fetchEnquiries}
            />

            <EnquiryDetailsDialog
                open={!!viewingEnquiry}
                onOpenChange={(open) => !open && setViewingEnquiry(null)}
                enquiry={viewingEnquiry}
                onEdit={(enquiry) => {
                    setViewingEnquiry(null); // Close details
                    handleEdit(enquiry);
                }}
                onConvert={handleConvertToPI}
                onMarkStatus={(status) => viewingEnquiry && handleMarkStatus(viewingEnquiry, status)}
            />

            <AlertDialog open={!!deletingEnquiry} onOpenChange={(open) => !open && setDeletingEnquiry(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the enquiry
                            {deletingEnquiry && <span className="font-medium text-foreground"> {deletingEnquiry.enquiry_number}</span>}
                            and remove it from our servers.
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
