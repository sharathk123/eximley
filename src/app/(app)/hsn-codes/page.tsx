"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HSNCode {
    id: string;
    hsn_code?: string;
    itc_hs_code: string;
    commodity: string;
    gst_hsn_code: string;
    description: string; // This is the 'description' column from DB, usually merged or from GST
    // For display, we might want specific columns if available, but API returns 'description'
    gst_rate: number;
    chapter?: string;
    itc_hs_code_description?: string;
    gst_hsn_code_description?: string;
}

export default function HSNCodesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');
    const productId = searchParams.get('productId');

    const [searchTerm, setSearchTerm] = useState("");
    const [hsnCodes, setHsnCodes] = useState<HSNCode[]>([]);
    const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedHSN, setSelectedHSN] = useState<string | null>(null);

    // Initial Load & Page Change
    useEffect(() => {
        fetchHsn(currentPage, searchTerm);
    }, [currentPage]);

    // Debounced Search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (currentPage === 1) {
                fetchHsn(1, searchTerm);
            } else {
                setCurrentPage(1);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const fetchHsn = async (page = 1, search = "") => {
        setLoading(true);
        const params = new URLSearchParams({
            page: page.toString(),
            limit: "10", // Match admin table limit
        });
        if (search) params.append("search", search);

        try {
            const res = await fetch(`/api/hsn?${params}`);
            const data = await res.json();
            if (data.hsnCodes) {
                setHsnCodes(data.hsnCodes);
                setMeta(data.meta || { total: 0, totalPages: 0 });
            }
        } catch (err) {
            console.error('Error fetching HSN:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectHSNCode = (hsn: HSNCode) => {
        const codeToUse = hsn.gst_hsn_code || hsn.itc_hs_code;
        setSelectedHSN(codeToUse);

        if (returnTo && productId) {
            sessionStorage.setItem(`hsn_${productId}`, codeToUse);
            router.push(`/${returnTo}`);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl animate-in fade-in space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="pl-0 hover:bg-transparent hover:text-primary transition-colors"
                            onClick={() => router.push('/products')}
                        >
                            ← Back to Products
                        </Button>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">HSN & GST Registry</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Search and browse the complete ITC-HS and GST Rate classifications.
                    </p>
                </div>

                {returnTo && (
                    <div className="bg-primary/10 text-primary border border-primary/20 px-4 py-2 rounded-lg text-sm font-medium">
                        Select a code to assign it to your product
                    </div>
                )}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 bg-card p-1 rounded-xl border shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by HSN Code, Commodity, or Description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 border-0 focus-visible:ring-0 bg-transparent"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="border rounded-xl shadow-sm bg-card overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <TableRow className="border-b border-border/60 hover:bg-transparent">
                            <TableHead className="py-4 pl-6 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[120px]">ITC HS</TableHead>
                            <TableHead className="py-4 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[100px]">GST HSN</TableHead>
                            <TableHead className="py-4 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[150px]">Chapter</TableHead>
                            <TableHead className="py-4 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground w-[200px]">Commodity</TableHead>
                            <TableHead className="py-4 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground min-w-[250px]">Description</TableHead>
                            <TableHead className="py-4 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground text-center w-[100px]">GST Rate</TableHead>
                            {returnTo && <TableHead className="py-4 pr-6 h-12 text-xs font-bold uppercase tracking-wider text-muted-foreground text-right w-[100px]">Action</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={returnTo ? 7 : 6} className="h-32 text-center text-muted-foreground"><Loader2 className="animate-spin inline mr-2 h-5 w-5" /> Loading records...</TableCell></TableRow>
                        ) : hsnCodes.length === 0 ? (
                            <TableRow><TableCell colSpan={returnTo ? 7 : 6} className="h-32 text-center text-muted-foreground italic">No HSN codes found matching "{searchTerm}".</TableCell></TableRow>
                        ) : (
                            hsnCodes.map((hsn, index) => (
                                <TableRow
                                    key={hsn.id}
                                    className={`align-top border-b border-border/40 transition-colors hover:bg-muted/30 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                                        } ${selectedHSN === (hsn.gst_hsn_code || hsn.itc_hs_code) ? 'bg-primary/5 border-primary/20' : ''}`}
                                >
                                    <TableCell className="pl-6 py-4 align-top w-[120px]">
                                        <div className="inline-flex items-center rounded-md border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-semibold text-primary font-mono">
                                            {hsn.itc_hs_code}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top w-[100px]">
                                        <div className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground font-mono">
                                            {hsn.gst_hsn_code}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <div className="text-sm font-medium text-foreground/80 leading-snug whitespace-normal break-words w-[150px]">
                                            {hsn.chapter || <span className="text-muted-foreground/40 italic">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <div className="text-sm text-foreground/70 leading-snug whitespace-normal break-words w-[200px]">
                                            {hsn.commodity || <span className="text-muted-foreground/40 italic">-</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top">
                                        <div className="text-sm text-foreground/90 leading-relaxed whitespace-normal break-words min-w-[250px]">
                                            {/* Prioritize ITC Description if available, else standard description */}
                                            {hsn.itc_hs_code_description || hsn.description || <span className="text-muted-foreground/40 italic">No description available</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 align-top text-center">
                                        {hsn.gst_rate !== null && hsn.gst_rate !== undefined ? (
                                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${hsn.gst_rate > 18 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                    hsn.gst_rate > 12 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                }`}>
                                                {hsn.gst_rate}%
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/40 italic">-</span>
                                        )}
                                    </TableCell>
                                    {returnTo && (
                                        <TableCell className="pr-6 py-4 align-top text-right w-[100px]">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="hover:border-primary hover:text-primary transition-colors"
                                                onClick={() => selectHSNCode(hsn)}
                                            >
                                                Select
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
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
        </div>
    );
}
