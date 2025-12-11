"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
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
import { Search, Plus, Loader2, MessageSquare } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { EnquiryEditDialog } from "@/components/enquiries/EnquiryEditDialog";
import { EnquiryDetailsDialog } from "@/components/enquiries/EnquiryDetailsDialog";
import { EnquiryBulkUploadDialog } from "@/components/enquiries/EnquiryBulkUploadDialog";
import { EnquiryList } from "@/components/enquiries/EnquiryList";

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
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card'); // Defaulting to card for premium look
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
            setViewingEnquiry(null);
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Enquiries</h2>
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
                        placeholder="Search enquiries..."
                        className="pl-8 bg-card border-border"
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
                <TabsList className="bg-muted">
                    {['all', 'new', 'contacted', 'quoted', 'won', 'lost', 'converted'].map(tab => (
                        <TabsTrigger key={tab} value={tab} className="capitalize data-[state=active]:bg-background data-[state=active]:text-foreground">
                            {tab}
                        </TabsTrigger>
                    ))}
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
                            iconColor="text-primary"
                            iconBgColor="bg-primary/10"
                        />
                    ) : (
                        <>
                            <EnquiryList
                                enquiries={paginatedEnquiries}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={setDeletingEnquiry}
                                onView={handleView}
                                onConvert={handleConvertToPI}
                                onMarkStatus={handleMarkStatus}
                            />

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
                                            <span className="px-4 text-sm text-muted-foreground">
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
                    setViewingEnquiry(null);
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
