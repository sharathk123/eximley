"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { ViewToggle } from "@/components/ui/view-toggle";
import { SearchInput } from "@/components/ui/search-input";
import { Input } from "@/components/ui/input";
import { Plus, Users, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
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

import { EntityFormValues } from "@/lib/schemas/entity";
import { EntityList } from "@/components/entities/EntityList";
import { LoadingState } from "@/components/ui/loading-state";
import { EntityDialog } from "@/components/entities/EntityDialog";
import { EntityBulkUpload } from "@/components/entities/EntityBulkUpload";
import { PageContainer } from "@/components/ui/page-container";

export default function EntitiesPage() {
    const [entities, setEntities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<any>(null);
    const [deletingEntity, setDeletingEntity] = useState<any>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const itemsPerPage = 12;
    const { toast } = useToast();

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

    const handleCreate = () => {
        setEditingEntity(null);
        setIsCreateOpen(true);
    };

    const handleEdit = (entity: any) => {
        setEditingEntity(entity);
        setIsCreateOpen(true);
    };

    const onFormSubmit = async (values: EntityFormValues) => {
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
            setIsCreateOpen(false);
            setEditingEntity(null);
            toast({
                title: "Success",
                description: editingEntity ? "Contact updated successfully" : "Contact added successfully"
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to save contact", variant: "destructive" });
        }
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
        <PageContainer>
            <PageHeader
                title="Contacts Directory"
                description="Manage Buyers, Suppliers, and Partners."
            >
                <EntityBulkUpload onSuccess={fetchEntities} />
                <Button onClick={handleCreate}>
                    <Plus className="mr-2 h-4 w-4" /> Add Contact
                </Button>
            </PageHeader>

            <div className="flex items-center justify-between gap-4">
                <SearchInput
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                    }}
                    placeholder="Search entities..."
                />
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
                        <LoadingState message="Loading entities..." size="sm" />
                    ) : filteredEntities.length === 0 ? (
                        <EmptyState
                            icon={Users}
                            title="No contacts found"
                            description="Add buyers, suppliers, or partners to manage your network."
                            actionLabel="Add Contact"
                            onAction={handleCreate}
                        />
                    ) : (
                        <>
                            <EntityList
                                entities={paginatedEntities}
                                viewMode={viewMode}
                                onEdit={handleEdit}
                                onDelete={setDeletingEntity}
                            />

                            {totalPages > 1 && (
                                <Pagination className="mt-4">
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                        </PaginationItem>
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink onClick={() => setCurrentPage(page)} isActive={currentPage === page} className="cursor-pointer">
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"} />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            )}
                        </>
                    )}
                </TabsContent>
            </Tabs>

            <EntityDialog
                open={isCreateOpen}
                onOpenChange={setIsCreateOpen}
                initialData={editingEntity}
                onSubmit={onFormSubmit}
            />

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
        </PageContainer>
    );
}
