import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";

export function useProformaManagement() {
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

    // Action Loading States
    const [convertingPI, setConvertingPI] = useState<any>(null);
    const [deletingPI, setDeletingPI] = useState<any>(null);

    const itemsPerPage = 12;

    useEffect(() => {
        fetchInvoices();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    async function fetchInvoices() {
        setLoading(true);
        try {
            const res = await fetch("/api/invoices/proforma", { cache: 'no-store' });
            const data = await res.json();
            console.log('Fetched Invoices:', data.invoices?.length);
            if (data.invoices) setInvoices(data.invoices);
        } catch (error) {
            console.error("Failed to fetch PIs:", error);
            toast({ title: "Error", description: "Failed to fetch invoices", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }

    const handleDelete = async (invoice: any) => {
        if (!invoice) return;
        try {
            const res = await fetch(`/api/invoices/proforma?id=${invoice.id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Failed to delete PI");

            await fetchInvoices();
            toast({ title: "Success", description: "Invoice deleted successfully" });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to delete invoice", variant: "destructive" });
        } finally {
            setDeletingPI(null);
        }
    };

    const handleConvertToOrder = async (invoice: any) => {
        if (!invoice) return;
        try {
            const res = await fetch("/api/invoices/proforma/convert", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pi_id: invoice.id }),
            });

            if (!res.ok) throw new Error("Failed to convert PI");

            const data = await res.json();
            await fetchInvoices();
            toast({
                title: "Success",
                description: `Order created successfully! Order #: ${data.order?.order_number || 'Created'}`
            });
        } catch (error) {
            console.error(error);
            toast({ title: "Error", description: "Failed to convert PI", variant: "destructive" });
        } finally {
            setConvertingPI(null);
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.entities?.name?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesTab = activeTab === "all" || inv.status === activeTab;
        return matchesSearch && matchesTab;
    });

    const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

    return {
        // State
        invoices: paginatedInvoices,
        loading,
        searchQuery,
        activeTab,
        currentPage,
        totalPages,
        selectedInvoices,

        // Modal States
        deletingPI,
        convertingPI,
        setDeletingPI,
        setConvertingPI,

        // Setters
        setSearchQuery,
        setActiveTab,
        setCurrentPage,
        setSelectedInvoices,

        // Actions
        refresh: fetchInvoices,
        handleDelete,
        handleConvertToOrder
    };
}
