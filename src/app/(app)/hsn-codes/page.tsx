"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface HSNCode {
    id: string;
    hsn_code?: string; // KEEP optional for backward compat if needed, but we rely on itc_hs_code now
    itc_hs_code: string;
    commodity: string;
    gst_hsn_code: string;
    description: string;
    gst_rate: number;
    chapter?: string; // Derived
}

interface ChapterGroup {
    chapter: string;
    count: number;
    codes: HSNCode[];
}

export default function HSNCodesPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const returnTo = searchParams.get('returnTo');
    const productId = searchParams.get('productId');

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
    const [chapters, setChapters] = useState<ChapterGroup[]>([]);
    const [searchResults, setSearchResults] = useState<HSNCode[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedHSN, setSelectedHSN] = useState<string | null>(null);

    // Fetch chapters on mount
    useEffect(() => {
        fetchChapters();
    }, []);

    // Search when term changes
    useEffect(() => {
        if (searchTerm.length >= 2) {
            searchHSN();
        } else {
            setSearchResults([]);
        }
    }, [searchTerm]);

    const fetchChapters = async () => {
        try {
            const res = await fetch('/api/hsn/chapters');
            const data = await res.json();
            setChapters(data.chapters || []);
        } catch (err) {
            console.error('Error fetching chapters:', err);
        }
    };

    const searchHSN = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/hsn?limit=500&search=${encodeURIComponent(searchTerm)}`);
            const data = await res.json();
            setSearchResults(data.hsnCodes || []);
        } catch (err) {
            console.error('Error searching HSN:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectChapter = async (chapter: string) => {
        setSelectedChapter(chapter);
        setLoading(true);
        try {
            const res = await fetch(`/api/hsn?limit=500&chapter=${chapter}`);
            const data = await res.json();
            setSearchResults(data.hsnCodes || []);
        } catch (err) {
            console.error('Error fetching chapter codes:', err);
        } finally {
            setLoading(false);
        }
    };

    const selectHSNCode = (hsn: HSNCode) => {
        const codeToUse = hsn.gst_hsn_code || hsn.itc_hs_code;
        setSelectedHSN(codeToUse);

        // If called from product form, return the HSN code
        if (returnTo && productId) {
            // Store in session storage for the product form to pick up
            sessionStorage.setItem(`hsn_${productId}`, codeToUse);
            router.push(`/${returnTo}`);
        }
    };

    return (
        <div className="container mx-auto p-6 max-w-7xl">
            {/* Header */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push('/products')}
                    >
                        ← Back to Products
                    </Button>
                </div>
                <h1 className="text-3xl font-bold mb-2">HSN Code Lookup</h1>
                <p className="text-muted-foreground">
                    Browse by chapter or search for HSN codes (ITC, GST, or Description)
                </p>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by HSN code, commodity, or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Chapter List */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Browse by Chapter</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
                            {chapters.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Loading chapters...</p>
                            ) : (
                                chapters.map((chapterGroup) => (
                                    <button
                                        key={chapterGroup.chapter}
                                        onClick={() => selectChapter(chapterGroup.chapter)}
                                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-accent ${selectedChapter === chapterGroup.chapter
                                            ? 'border-primary bg-accent'
                                            : 'border-border'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold">Chapter {chapterGroup.chapter}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {chapterGroup.count} codes
                                                </p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Results */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {searchTerm
                                    ? `Search Results (${searchResults.length})`
                                    : selectedChapter
                                        ? `Chapter ${selectedChapter} Codes`
                                        : 'Select a chapter or search'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 max-h-[600px] overflow-y-auto">
                            {loading ? (
                                <p className="text-center text-muted-foreground py-8">Loading...</p>
                            ) : searchResults.length === 0 ? (
                                <EmptyState
                                    icon={Search}
                                    title="No HSN codes found"
                                    description="Try searching with different keywords or browse by chapter"
                                />
                            ) : (
                                searchResults.map((hsn) => (
                                    <Card
                                        key={hsn.id}
                                        className={`cursor-pointer hover:border-primary transition-colors ${selectedHSN === (hsn.gst_hsn_code || hsn.itc_hs_code) ? 'border-primary bg-accent' : ''
                                            }`}
                                        onClick={() => selectHSNCode(hsn)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="font-mono text-base">
                                                            GST: {hsn.gst_hsn_code}
                                                        </Badge>
                                                        {hsn.itc_hs_code && (
                                                            <Badge variant="secondary" className="font-mono text-sm">
                                                                ITC: {hsn.itc_hs_code}
                                                            </Badge>
                                                        )}
                                                        {selectedHSN === (hsn.gst_hsn_code || hsn.itc_hs_code) && (
                                                            <Check className="h-5 w-5 text-primary" />
                                                        )}
                                                    </div>
                                                    <p className="font-semibold mt-1 text-sm">{hsn.commodity}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {hsn.gst_rate !== null && (
                                                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                                            GST: {hsn.gst_rate}%
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3">
                                                {hsn.description}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Action Buttons */}
            {returnTo && selectedHSN && (
                <div className="fixed bottom-6 right-6">
                    <Button size="lg" onClick={() => {
                        // Find the full HSN object again if needed, or just persist the code
                        // In selectHSNCode we set selectedHSN state.
                        // We can just rely on state here.
                        if (returnTo && productId) {
                            sessionStorage.setItem(`hsn_${productId}`, selectedHSN);
                            router.push(`/${returnTo}`);
                        }
                    }}>
                        Use HSN Code {selectedHSN}
                    </Button>
                </div>
            )}
        </div>
    );
}
