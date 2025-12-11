"use client";

import { useEffect, useState } from "react";
import { Search, Package, Sparkles, Loader2, AlertCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { HSNSelectionDialog } from "@/components/admin/HSNSelectionDialog";

import { ProductTable } from "@/components/products/ProductTable";
import { ProductDialog } from "@/components/products/ProductDialog";
import { ProductBulkUpload } from "@/components/products/ProductBulkUpload";
import { ProductFormValues } from "@/lib/schemas/product";
import { Plus } from "lucide-react";

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false); // For Add/Edit Product Dialog

    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [deletingProduct, setDeletingProduct] = useState<any>(null);
    const [deletingSKU, setDeletingSKU] = useState<any>(null);
    const [deleteAllOpen, setDeleteAllOpen] = useState(false);
    const [deletingAll, setDeletingAll] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');

    // HSN Dialog States
    const [hsnDialogOpen, setHsnDialogOpen] = useState(false);
    const [selectedProductForHSN, setSelectedProductForHSN] = useState<any>(null);
    const [hsnCodeInput, setHsnCodeInput] = useState("");
    const [hsnSuggestions, setHsnSuggestions] = useState<any[]>([]);
    const [selectionDialogOpen, setSelectionDialogOpen] = useState(false); // AI HSN Selection
    const [loadingHSN, setLoadingHSN] = useState(false);

    const [generatingSKU, setGeneratingSKU] = useState<string | null>(null);
    const itemsPerPage = 12;
    const { toast } = useToast();

    // -- Handlers --

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            if (data.products) setProducts(data.products);
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to fetch products", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            const res = await fetch("/api/categories");
            const data = await res.json();
            if (data.categories) setCategories(data.categories);
        } catch (err) {
            console.error("Failed to fetch categories:", err);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const handleSaveProduct = async (values: ProductFormValues) => {
        try {
            const url = editingProduct ? "/api/products" : "/api/products";
            const method = editingProduct ? "PUT" : "POST";

            // Convert generic attributes array back to key-value object
            const attributesObj = values.attributes?.reduce((acc: any, curr) => {
                if (curr.key && curr.value) acc[curr.key] = curr.value;
                return acc;
            }, {}) || {};

            // Merge explicit attributes
            if (values.material_primary && values.material_primary.trim() !== "") attributesObj.material_primary = values.material_primary;
            if (values.specifications && values.specifications.trim() !== "") attributesObj.specifications = values.specifications;
            if (values.manufacturing_method && values.manufacturing_method.trim() !== "") attributesObj.manufacturing_method = values.manufacturing_method;
            if (values.intended_use && values.intended_use.trim() !== "") attributesObj.intended_use = values.intended_use;
            if (values.features && values.features.trim() !== "") attributesObj.features = values.features;
            if (values.tags && values.tags.trim() !== "") attributesObj.tags = values.tags;

            const {
                material_primary, specifications, manufacturing_method, intended_use, features, tags,
                attributes, ...rest
            } = values;

            const body = editingProduct
                ? { ...rest, id: editingProduct.id, attributes: attributesObj }
                : { ...rest, attributes: attributesObj };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsOpen(false);
                setEditingProduct(null);
                fetchProducts();
                toast({
                    title: "Success",
                    description: editingProduct ? "Product updated successfully" : "Product created successfully",
                });
            } else {
                throw new Error("Failed to save product");
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to save product", variant: "destructive" });
        }
    };

    const openEditDialog = (product: any) => {
        setEditingProduct(product);
        setIsOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingProduct) return;

        try {
            const res = await fetch(`/api/products?id=${deletingProduct.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                fetchProducts();
                toast({ title: "Success", description: "Product deleted successfully" });
            } else {
                throw new Error("Failed to delete product");
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
        } finally {
            setDeletingProduct(null);
        }
    };

    const confirmDeleteSKU = async () => {
        if (!deletingSKU) return;
        try {
            const res = await fetch(`/api/skus?id=${deletingSKU.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed");
            toast({ title: "Deleted", description: "SKU removed successfully" });
            fetchProducts();
        } catch (e) {
            toast({ title: "Error", description: "Failed to delete SKU", variant: "destructive" });
        } finally {
            setDeletingSKU(null);
        }
    };

    const handleDeleteAll = async () => {
        setDeletingAll(true);
        try {
            const res = await fetch("/api/products?all=true", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete all products");

            toast({ title: "Products Deleted", description: data.message || "All products and SKUs deleted successfully." });
            setDeleteAllOpen(false);
            fetchProducts();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setDeletingAll(false);
        }
    };

    // -- SKU & HSN Handlers --

    const handleGenerateSKU = async (product: any) => {
        if (generatingSKU) return;
        setGeneratingSKU(product.id);

        try {
            // Generate SKU code automatically
            const categoryPrefix = product.category.substring(0, 4).toUpperCase();
            const productSlug = product.name.replace(/\s+/g, '-').toUpperCase().substring(0, 15);
            const skuCode = `${categoryPrefix}-${productSlug}-001`;

            // Create SKU via API
            const res = await fetch("/api/skus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    product_id: product.id,
                    sku_code: skuCode,
                    name: product.name,
                    unit: "pcs",
                    base_price: 0
                })
            });

            if (res.ok) {
                fetchProducts();
                toast({
                    title: "Success!",
                    description: `SKU ${skuCode} generated successfully`,
                    duration: 3000
                });
            } else {
                throw new Error("Failed to generate SKU");
            }
        } catch (err: any) {
            console.error(err);
            toast({ title: "Error", description: err.message || "Failed to generate SKU", variant: "destructive" });
        } finally {
            setGeneratingSKU(null);
        }
    };

    const handleAiSuggest = async (product: any) => {
        toast({ title: "Thinking...", description: "Analyzing product for HSN match..." });
        try {
            const res = await fetch("/api/hsn/suggest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId: product.id })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to get suggestions");

            if (data.candidates && data.candidates.length > 0) {
                setHsnSuggestions(data.candidates);
                setSelectedProductForHSN(product);
                setSelectionDialogOpen(true);
            } else {
                toast({ title: "No Match", description: "No confident HSN matches found." });
            }
        } catch (e: any) {
            console.error(e);
            toast({ title: "Error", description: e.message, variant: "destructive" });
        }
    };

    // Manual HSN Link Handler
    const handleLinkHSN = async (product: any) => {
        // ... (Original logic for manual HSN link dialog if we kept it)
        // Actually, this logic was inside the old page but triggered by... ?
        // Ah, it was not triggered by a button in the old table. The old table only had AI Suggest.
        // Wait, did I miss a button? 
        // In the old code: 
        // <Button variant="ghost" size="icon" ... onClick={() => handleAiSuggest(product)} ...>
        // There was no direct "Link HSN" button visible in the table rows I saw.
        // But let's check lines 998+ in previous view_file.
        // It had AI Suggest (Sparkles), Edit, Delete.
        // So `handleLinkHSN` might have been unused or I missed its trigger?
        // Ah, `handleLinkHSN` was defined but maybe not used in the table directly?
        // Let's keep it just in case or implementing it properly if needed.
        // Wait, `handleAiSuggest` sets `selectedProductForHSN` which opens `HSNSelectionDialog`.
        // The manual dialog `hsnDialogOpen` was used in `handleLinkHSN`.
        // If it's not used in the UI, I can skip it or add it.
        // Let's safe keep the manual HSN dialog logic part of the render just in case validation needs it.
        // But for file size reduction, if it's dead code, I should remove it.
        // I will keep the HSN dialog rendering in the page for now as it handles manual entry fallback from AI flow maybe?
        // In `HSNSelectionDialog` usage: `onSelect` calls `fetchProducts` and closes.
        // Does `HSNSelectionDialog` have a "Manual" fallback? 
        // Anyhow, I'll include the manual dialog logic to be safe.

        setSelectedProductForHSN(product);
        setHsnCodeInput("");
        setHsnSuggestions([]);
        setHsnDialogOpen(true);
        setLoadingHSN(true);
        // ... fetching logic ...
        try {
            const genericWords = ['oil', 'powder', 'product', 'organic', 'pure', 'natural', 'premium'];
            const words = product.name.trim().split(' ').filter((w: string) => w.length > 2);
            let searchTerm = words[words.length - 1];
            for (let i = words.length - 1; i >= 0; i--) {
                if (!genericWords.includes(words[i].toLowerCase())) {
                    searchTerm = words[i];
                    break;
                }
            }
            const params = new URLSearchParams({
                search: searchTerm,
                category: product.category || ''
            });

            const res = await fetch(`/api/hsn?${params.toString()}`);
            const data = await res.json();
            if (data.hsnCodes && data.hsnCodes.length > 0) {
                setHsnSuggestions(data.hsnCodes.slice(0, 5));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHSN(false);
        }
    };

    const submitHSNLink = async () => {
        if (!selectedProductForHSN || !hsnCodeInput) return;
        try {
            const res = await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: selectedProductForHSN.id,
                    name: selectedProductForHSN.name,
                    category: selectedProductForHSN.category,
                    description: selectedProductForHSN.description,
                    image_url: selectedProductForHSN.image_url,
                    hsn_code: hsnCodeInput
                })
            });

            if (res.ok) {
                fetchProducts();
                toast({
                    title: "Success!",
                    description: `HSN code ${hsnCodeInput} linked successfully`,
                    duration: 3000
                });
                setHsnDialogOpen(false);
                setSelectedProductForHSN(null);
                setHsnCodeInput("");
            } else {
                throw new Error("Failed to link HSN");
            }
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to link HSN code", variant: "destructive" });
        }
    };


    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                    <p className="text-muted-foreground">Manage your master product catalog and categories.</p>
                </div>
                <div className="flex gap-2">
                    <ProductBulkUpload onSuccess={fetchProducts} />

                    <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="icon" title="Delete All Products">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-destructive/30 border-2">
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-destructive font-bold flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5" /> Delete All Products?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete <b>ALL</b> your products.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={deletingAll}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAll} disabled={deletingAll} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                    {deletingAll ? "Deleting..." : "Yes, Delete Everything"}
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button onClick={() => { setEditingProduct(null); setIsOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> Add Product
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                    />
                </div>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            </div>

            {loading ? (
                <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : filteredProducts.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="No products found"
                    description="Create your first product."
                    actionLabel="Add Product"
                    onAction={() => { setEditingProduct(null); setIsOpen(true); }}
                    iconColor="text-orange-600 dark:text-orange-200"
                    iconBgColor="bg-orange-100 dark:bg-orange-900"
                />
            ) : (
                <>
                    <ProductTable
                        products={paginatedProducts}
                        viewMode={viewMode}
                        onEdit={openEditDialog}
                        onDelete={setDeletingProduct}
                        onDeleteSKU={setDeletingSKU}
                        onGenerateSKU={handleGenerateSKU}
                        onAiSuggest={handleAiSuggest}
                        generatingSKUId={generatingSKU}
                    />

                    {totalPages > 1 && (
                        <div className="flex items-center justify-end gap-2 text-sm">
                            {/* Pagination controls ... reusing from before or simplifying */}
                            <span className="text-muted-foreground mr-4">Page {currentPage} of {totalPages}</span>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Prev</Button>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Next</Button>
                        </div>
                    )}
                </>
            )}

            <ProductDialog
                open={isOpen}
                onOpenChange={setIsOpen}
                product={editingProduct}
                categories={categories}
                onSave={handleSaveProduct}
            />

            {/* Dialogs for deletion confirmations */}
            <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete "{deletingProduct?.name}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingProduct(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!deletingSKU} onOpenChange={(open) => !open && setDeletingSKU(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete SKU?</AlertDialogTitle>
                        <AlertDialogDescription>Remove SKU "{deletingSKU?.sku_code}"?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingSKU(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteSKU} className="bg-destructive text-destructive-foreground">Delete SKU</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Manual HSN Link Dialog - retained logic */}
            <Dialog open={hsnDialogOpen} onOpenChange={setHsnDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Link HSN Code</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-4">
                        <Label>Product: {selectedProductForHSN?.name}</Label>
                        {loadingHSN ? <Loader2 className="animate-spin" /> : (
                            hsnSuggestions.length > 0 ? (
                                <div className="space-y-2">
                                    <Label>Suggestions:</Label>
                                    {hsnSuggestions.map(hsn => (
                                        <Card key={hsn.id} className="p-2 cursor-pointer hover:bg-accent" onClick={() => setHsnCodeInput(hsn.gst_hsn_code)}>
                                            <div className="font-bold">{hsn.gst_hsn_code}</div>
                                            <div className="text-xs">{hsn.description}</div>
                                        </Card>
                                    ))}
                                </div>
                            ) : <div className="text-muted-foreground">No suggestions.</div>
                        )}
                        <Input value={hsnCodeInput} onChange={e => setHsnCodeInput(e.target.value)} placeholder="Enter HSN Code" />
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setHsnDialogOpen(false)}>Cancel</Button>
                            <Button onClick={submitHSNLink} disabled={!hsnCodeInput}>Link HSN</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {selectedProductForHSN && (
                <HSNSelectionDialog
                    open={selectionDialogOpen}
                    onOpenChange={setSelectionDialogOpen}
                    candidates={hsnSuggestions}
                    product={selectedProductForHSN}
                    onSelect={() => { fetchProducts(); setSelectionDialogOpen(false); }}
                />
            )}
        </div>
    );
}
