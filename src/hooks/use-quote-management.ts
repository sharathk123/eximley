import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useQuoteManagement() {
    const { toast } = useToast();
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
    const [currentPage, setCurrentPage] = useState(1);

    // Action Loading States
    const [bulkActionLoading, setBulkActionLoading] = useState(false);
    const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

    const itemsPerPage = 12;

    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchQuotes() {
        setLoading(true);
        try {
            const res = await fetch("/api/quotes");
            const data = await res.json();
            if (data.quotes) setQuotes(data.quotes);
        } catch (error) {
            console.error("Failed to fetch quotes:", error);
            toast({ title: "Error", description: "Failed to fetch quotes", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const updateStatus = async (ids: string[], status: string) => {
        setBulkActionLoading(true);
        try {
            await Promise.all(
                ids.map(id =>
                    fetch(`/api/quotes/${id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status })
                    })
                )
            );
            toast({ title: "Success", description: `${ids.length} quote(s) updated to ${status}` });
            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const deleteQuotes = async (ids: string[]) => {
        if (!ids.length) return;
        setBulkActionLoading(true); // Re-using bulk loading state
        try {
            await Promise.all(ids.map(id => fetch(`/api/quotes?id=${id}`, { method: 'DELETE' })));
            toast({ title: "Success", description: `${ids.length} quote(s) deleted` });
            setSelectedQuotes([]);
            await fetchQuotes();
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete quotes", variant: "destructive" });
        } finally {
            setBulkActionLoading(false);
        }
    };

    const convertToPI = async (quoteId: string) => {
        try {
            const res = await fetch("/api/quotes/convert-to-pi", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote_id: quoteId }),
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            await fetchQuotes();
            toast({ title: "Success", description: `Quote converted to PI: ${data.pi?.invoice_number || 'Created'}` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to convert quote", variant: "destructive" });
        }
    };

    const createRevision = async (quoteId: string) => {
        try {
            const res = await fetch("/api/quotes/revise", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ quote_id: quoteId }),
            });
            if (!res.ok) throw new Error("Failed");
            const data = await res.json();
            await fetchQuotes();
            toast({ title: "Success", description: `Revision created: ${data.quote?.quote_number} (v${data.quote?.version})` });
        } catch (error) {
            toast({ title: "Error", description: "Failed to create revision", variant: "destructive" });
        }
    };

    const filteredQuotes = quotes.filter(quote => {
        const matchesSearch = quote.quote_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quote.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || quote.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedQuotes = filteredQuotes.slice(startIndex, startIndex + itemsPerPage);

    return {
        // State
        quotes: paginatedQuotes,
        loading,
        searchQuery,
        activeTab,
        selectedQuotes,
        currentPage,
        totalPages,
        bulkActionLoading,
        generatingPdf,

        // Setters
        setSearchQuery,
        setActiveTab,
        setSelectedQuotes,
        setCurrentPage,
        setGeneratingPdf,

        // Actions
        refresh: fetchQuotes,
        updateStatus,
        deleteQuotes,
        convertToPI,
        createRevision
    };
}
