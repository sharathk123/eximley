"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Package, Box, Upload, Loader2, Edit, Trash2, LayoutGrid, List, ChevronLeft, ChevronRight, Sparkles, Link as LinkIcon } from "lucide-react";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ViewToggle } from "@/components/ui/view-toggle";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/alert-dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";

const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    description: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
});

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [openBulk, setOpenBulk] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [editingProduct, setEditingProduct] = useState<any>(null);
    const [deletingProduct, setDeletingProduct] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
    const [hsnDialogOpen, setHsnDialogOpen] = useState(false);
    const [selectedProductForHSN, setSelectedProductForHSN] = useState<any>(null);
    const [hsnCodeInput, setHsnCodeInput] = useState("");
    const [hsnSuggestions, setHsnSuggestions] = useState<any[]>([]);
    const [loadingHSN, setLoadingHSN] = useState(false);
    const itemsPerPage = 12;
    const { toast } = useToast();

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            category: "",
            description: "",
            image_url: "",
        },
    });

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

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

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
        // Scroll to top when page changes to prevent jumping
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const onSubmit = async (values: z.infer<typeof productSchema>) => {
        try {
            const url = editingProduct ? "/api/products" : "/api/products";
            const method = editingProduct ? "PUT" : "POST";
            const body = editingProduct ? { ...values, id: editingProduct.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                setIsOpen(false);
                setEditingProduct(null);
                form.reset();
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

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        form.reset({
            name: product.name,
            category: product.category,
            description: product.description || "",
            image_url: product.image_url || "",
        });
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

    const handleGenerateSKU = async (product: any) => {
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
        } catch (err) {
            console.error(err);
            toast({ title: "Error", description: "Failed to generate SKU", variant: "destructive" });
        }
    };

    const handleLinkHSN = async (product: any) => {
        setSelectedProductForHSN(product);
        setHsnCodeInput("");
        setHsnSuggestions([]); // Reset suggestions
        setHsnDialogOpen(true);

        // Fetch HSN suggestions based on product category and name
        setLoadingHSN(true);
        try {
            // Smart search term selection
            // Avoid generic words like "oil", "powder", "product", etc.
            const genericWords = ['oil', 'powder', 'product', 'organic', 'pure', 'natural', 'premium'];
            const words = product.name.trim().split(' ').filter((w: string) => w.length > 2);

            // Find the most specific word (not generic)
            let searchTerm = words[words.length - 1]; // Default to last word
            for (let i = words.length - 1; i >= 0; i--) {
                if (!genericWords.includes(words[i].toLowerCase())) {
                    searchTerm = words[i];
                    break;
                }
            }

            console.log('Searching HSN for:', searchTerm, 'in category:', product.category);

            // Pass both search term and category for better filtering
            const params = new URLSearchParams({
                search: searchTerm,
                category: product.category || ''
            });

            const res = await fetch(`/api/hsn?${params.toString()}`);
            const data = await res.json();
            console.log('HSN API response:', data);
            if (data.hsnCodes && data.hsnCodes.length > 0) {
                setHsnSuggestions(data.hsnCodes.slice(0, 5)); // Top 5 suggestions
                console.log('HSN suggestions set:', data.hsnCodes.slice(0, 5));
            } else {
                console.log('No HSN suggestions found');
            }
        } catch (err) {
            console.error('Error fetching HSN:', err);
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

    // Bulk Upload Functions
    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];

                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                if (!rows || rows.length === 0) {
                    toast({ title: "Invalid File", description: "File appears empty", variant: "destructive" });
                    return;
                }

                const headers = rows[0].map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));

                const hasEntityColumns = headers.some((h: string) =>
                    h.includes('buyer') || h.includes('supplier') || h.includes('entity') || h.includes('taxid')
                );

                if (hasEntityColumns) {
                    toast({
                        title: "Wrong File Type",
                        description: "This appears to be an Entities file. For Products bulk upload, use a file with: Name, Category, Description.",
                        variant: "destructive",
                        duration: 6000
                    });
                    return;
                }

                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast({ title: "No Data", description: "No data found in file", variant: "destructive" });
                    return;
                }

                setBulkData(data);
            } catch (e: any) {
                console.error(e);
                toast({ title: "Parse Error", description: "Error parsing file: " + e.message, variant: "destructive" });
            }
        };
        reader.readAsBinaryString(file);
    };

    const confirmBulkUpload = async () => {
        setUploading(true);
        try {
            const res = await fetch("/api/products/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ products: bulkData })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed");

            toast({ title: "Success", description: `Successfully uploaded ${data.count} products!` });
            setOpenBulk(false);
            setBulkData([]);
            fetchProducts();
        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setUploading(false);
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
                    <p className="text-muted-foreground">
                        Manage your master product catalog and categories.
                    </p>
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
                                <DialogTitle>Bulk Upload Products (Excel)</DialogTitle>
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
                                            id="product-file-upload"
                                        />
                                        <Button variant="secondary" size="sm" onClick={() => document.getElementById('product-file-upload')?.click()}>
                                            Browse Files
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-4">Expected columns: Name, Category, Description</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-60 overflow-auto border rounded-md">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted sticky top-0">
                                                <tr>
                                                    <th className="p-2 text-left font-bold">Name</th>
                                                    <th className="p-2 text-left font-bold">Category</th>
                                                    <th className="p-2 text-left font-bold">Description</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {bulkData.slice(0, 10).map((row, idx) => (
                                                    <tr key={idx} className="border-t">
                                                        <td className="p-2">{row.name || row.Name}</td>
                                                        <td className="p-2">{row.category || row.Category}</td>
                                                        <td className="p-2">{row.description || row.Description}</td>
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

                    <Dialog open={isOpen} onOpenChange={(open) => {
                        setIsOpen(open);
                        if (!open) {
                            setEditingProduct(null);
                            form.reset();
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Product Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Cotton T-Shirt" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="category"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {categories.map((cat) => (
                                                            <SelectItem key={cat.id} value={cat.name}>
                                                                {cat.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Optional description" {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="flex justify-end space-x-2 pt-4">
                                        <Button variant="outline" type="button" onClick={() => {
                                            setIsOpen(false);
                                            setEditingProduct(null);
                                            form.reset();
                                        }}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">{editingProduct ? "Update Product" : "Create Product"}</Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
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
                    description="Create your first product (e.g., 'Men's T-Shirt') then you can add specific SKUs (e.g., 'Size L, Red') to it."
                    actionLabel="Add Product"
                    onAction={() => setIsOpen(true)}
                    iconColor="text-orange-600 dark:text-orange-200"
                    iconBgColor="bg-orange-100 dark:bg-orange-900"
                />
            ) : (
                <>
                    {viewMode === 'card' ? (
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {paginatedProducts.map((product) => (
                                <Card key={product.id} className="hover:shadow-md transition-shadow">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">
                                            {product.category.toUpperCase()}
                                        </CardTitle>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleEdit(product)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive"
                                                onClick={() => setDeletingProduct(product)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{product.name}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {product.description || "No description"}
                                        </p>
                                        {product.hsn_code && (
                                            <div className="mt-2">
                                                <span className="text-xs text-muted-foreground">HSN: </span>
                                                <span className="text-xs font-mono">{product.hsn_code}</span>
                                            </div>
                                        )}
                                        <div className="mt-3">
                                            <span className="text-xs text-muted-foreground mb-1 block">SKUs:</span>
                                            {product.skus && product.skus.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {product.skus.slice(0, 4).map((sku: any, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="px-1 py-0 text-[10px] font-normal h-5">
                                                            {sku.sku_code}
                                                        </Badge>
                                                    ))}
                                                    {product.skus.length > 4 && (
                                                        <Badge variant="outline" className="px-1 py-0 text-[10px] h-5">
                                                            +{product.skus.length - 4}
                                                        </Badge>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground">No SKUs</span>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="border rounded-md bg-card">
                            <Table className="table-fixed">
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[180px]">Name</TableHead>
                                        <TableHead className="w-[120px]">Category</TableHead>
                                        <TableHead className="w-[100px]">HSN Code</TableHead>
                                        <TableHead className="w-[200px]">Description</TableHead>
                                        <TableHead className="w-[280px]">SKUs</TableHead>
                                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{product.category}</Badge>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {product.hsn_code || "—"}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs whitespace-normal break-words max-w-[250px]">
                                                {product.description || "—"}
                                            </TableCell>
                                            <TableCell>
                                                {product.skus && product.skus.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-[250px]">
                                                        {product.skus.slice(0, 3).map((sku: any, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="px-1 py-0 text-[10px] font-normal h-5">
                                                                {sku.sku_code}
                                                            </Badge>
                                                        ))}
                                                        {product.skus.length > 3 && (
                                                            <Badge variant="outline" className="px-1 py-0 text-[10px] h-5">
                                                                +{product.skus.length - 3} more
                                                            </Badge>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs italic">No SKUs</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    {/* Generate SKU Button */}
                                                    {(!product.skus || product.skus.length === 0) && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleGenerateSKU(product)}
                                                            title="Generate SKU"
                                                        >
                                                            <Sparkles className="h-3 w-3 mr-1" />
                                                            SKU
                                                        </Button>
                                                    )}
                                                    {/* Link HSN Button */}
                                                    {!product.hsn_code && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs"
                                                            onClick={() => handleLinkHSN(product)}
                                                            title="Link HSN Code"
                                                        >
                                                            <LinkIcon className="h-3 w-3 mr-1" />
                                                            HSN
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(product)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => setDeletingProduct(product)}
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
                        <div className="flex items-center justify-end gap-2 text-sm">
                            <div className="text-muted-foreground mr-4">
                                Page {currentPage} of {totalPages} ({filteredProducts.length} total)
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </>
            )}

            <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the product "{deletingProduct?.name}". This action cannot be undone.
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

            {/* HSN Code Link Dialog */}
            <Dialog open={hsnDialogOpen} onOpenChange={setHsnDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Link HSN Code</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {/* Product Info */}
                        <div>
                            <Label>Product</Label>
                            <Input value={selectedProductForHSN?.name || ""} disabled className="bg-muted" />
                            <Badge variant="outline" className="mt-1">{selectedProductForHSN?.category}</Badge>
                        </div>

                        {/* Verified HSN Suggestions */}
                        {loadingHSN ? (
                            <div className="flex justify-center p-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : hsnSuggestions.length > 0 ? (
                            <div>
                                <Label>Verified HSN Codes (Select One)</Label>
                                <div className="space-y-2 mt-2">
                                    {hsnSuggestions.map((hsn) => (
                                        <Card
                                            key={hsn.hsn_code}
                                            className={`cursor-pointer hover:bg-accent transition-colors ${hsnCodeInput === hsn.hsn_code ? 'border-primary bg-accent' : ''}`}
                                            onClick={() => setHsnCodeInput(hsn.hsn_code)}
                                        >
                                            <CardContent className="p-4">
                                                <div className="space-y-2">
                                                    {/* HSN Code and Chapter */}
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-xl">{hsn.hsn_code}</p>
                                                            {hsn.chapter && (
                                                                <p className="text-xs text-muted-foreground">Chapter {hsn.chapter}</p>
                                                            )}
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {hsn.gst_rate !== null && (
                                                                <Badge variant="secondary">GST: {hsn.gst_rate}%</Badge>
                                                            )}
                                                            {hsn.duty_rate !== null && (
                                                                <Badge variant="outline">Duty: {hsn.duty_rate}%</Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {/* Description */}
                                                    <p className="text-sm text-muted-foreground leading-relaxed">{hsn.description}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground p-4 bg-muted rounded-md">
                                No HSN suggestions found for "{selectedProductForHSN?.name}". Please enter HSN code manually below.
                            </div>
                        )}

                        {/* Manual Entry */}
                        <div>
                            <Label>Or Enter HSN Code Manually</Label>
                            <div className="flex gap-2">
                                <Input 
                                    value={hsnCodeInput} 
                                    onChange={(e) => setHsnCodeInput(e.target.value)}
                                    placeholder="Enter HSN code (e.g., 1006)"
                                    className="flex-1"
                                />
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const url = `/hsn-codes?returnTo=products&productId=${selectedProductForHSN?.id}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    Browse HSN
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                💡 Tip: Click "Browse HSN" to explore all HSN codes by chapter
                            </p>
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setHsnDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={submitHSNLink} disabled={!hsnCodeInput}>
                                Link HSN Code
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
