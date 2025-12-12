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
import { Search, Plus, Loader2, MessageSquare, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/ui/empty-state";
import { EnquiryBulkUploadDialog } from "@/components/enquiries/EnquiryBulkUploadDialog";
import { EnquiryList } from "@/components/enquiries/EnquiryList";
import { PageHeader } from "@/components/ui/page-header";
import { useRouter } from "next/navigation";

export default function EnquiriesPage() {
    const router = useRouter();
    const [enquiries, setEnquiries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Dialog states
    const [deletingEnquiry, setDeletingEnquiry] = useState<any>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list'); // Default to list view
    const itemsPerPage = 12;
    const { toast } = useToast();

    useEffect(() => {
        fetchEnquiries();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchEnquiries();
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchEnquiries() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.set("search", searchQuery);

            const res = await fetch(`/api/enquiries?${params.toString()}`, { cache: 'no-store' });
            const data = await res.json();
            if (data.enquiries) setEnquiries(data.enquiries);
        } catch (error) {
            console.error("Failed to fetch enquiries:", error);
            toast({ title: "Error", description: "Failed to fetch enquiries", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

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
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        }
    };

    const filteredEnquiries = enquiries.filter(enquiry => {
        const matchesTab = activeTab === "all" || enquiry.status === activeTab;
        return matchesTab;
    });

    const totalPages = Math.ceil(filteredEnquiries.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedEnquiries = filteredEnquiries.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <PageHeader
                title="Enquiries"
                description="Manage customer enquiries and convert to orders."
            >
                <EnquiryBulkUploadDialog onUploadComplete={fetchEnquiries} />
                <Button onClick={() => router.push("/enquiries/create")}>
                    <Plus className="mr-2 h-4 w-4" /> Add Enquiry
                </Button>
            </PageHeader>

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
                            onAction={searchQuery ? () => setSearchQuery("") : () => router.push("/enquiries/create")}
                            iconColor="text-blue-600 dark:text-blue-200"
                            iconBgColor="bg-blue-100 dark:bg-blue-900"
                        />
                    ) : (
                        <>
                            <EnquiryList
                                enquiries={paginatedEnquiries}
                                viewMode={viewMode}
                                onDelete={setDeletingEnquiry}
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
