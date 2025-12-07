"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Search, Package, Box, Filter, Upload, Loader2 } from "lucide-react";
import * as XLSX from 'xlsx';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
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

const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    description: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
});

export default function ProductsPage() {
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [openBulk, setOpenBulk] = useState(false);
    const [bulkData, setBulkData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const form = useForm<z.infer<typeof productSchema>>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            category: "general",
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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const onSubmit = async (values: z.infer<typeof productSchema>) => {
        try {
            const res = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
            });

            if (res.ok) {
                setIsOpen(false);
                form.reset();
                fetchProducts();
            } else {
                console.error("Failed to create product");
            }
        } catch (err) {
            console.error(err);
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
                    alert("File appears empty");
                    return;
                }

                const headers = rows[0].map((h: any) => String(h).toLowerCase().replace(/[^a-z0-9]/g, ''));

                // Check if this looks like an Entities file
                const hasEntityColumns = headers.some((h: string) =>
                    h.includes('buyer') || h.includes('supplier') || h.includes('entity') || h.includes('taxid')
                );

                if (hasEntityColumns) {
                    alert(
                        `❌ Wrong file type!\n\n` +
                        `This appears to be an Entities file, not a Products file.\n\n` +
                        `For Products bulk upload, please use a file with:\n` +
                        `• Name (required)\n` +
                        `• Category (required)\n` +
                        `• Description (optional)\n` +
                        `• HSN Code (optional)\n\n` +
                        `To upload Entities, please use the Entities page.`
                    );
                    return;
                }

                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("No data found in file");
                    return;
                }

                setBulkData(data);
            } catch (e: any) {
                console.error(e);
                alert("Error parsing file: " + e.message);
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

            alert(`Successfully uploaded ${data.count} products!`);
            setOpenBulk(false);
            setBulkData([]);
            fetchProducts();
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUploading(false);
        }
    };

    const filteredProducts = products.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
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
                                    <p className="text-xs text-muted-foreground mt-4">Expected columns: Name, Category, Description, HSN Code</p>
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

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
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
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select Category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="general">General</SelectItem>
                                                        <SelectItem value="apparel">Apparel</SelectItem>
                                                        <SelectItem value="electronics">Electronics</SelectItem>
                                                        <SelectItem value="food">Food & Agro</SelectItem>
                                                        <SelectItem value="raw_material">Raw Materials</SelectItem>
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
                                        <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
                                            Cancel
                                        </Button>
                                        <Button type="submit">Create Product</Button>
                                    </div>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {
                loading ? (
                    <div>Loading products...</div>
                ) : filteredProducts.length === 0 ? (
                    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50">
                        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
                            <Package className="h-6 w-6 text-orange-600 dark:text-orange-200" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold">No products found</h3>
                        <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                            Create your first product (e.g., "Men's T-Shirt") then you can add specific SKUs (e.g., "Size L, Red") to it.
                        </p>
                        <Button onClick={() => setIsOpen(true)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {filteredProducts.map((product) => (
                            <Card key={product.id} className="hover:shadow-md transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium">
                                        {product.category.toUpperCase()}
                                    </CardTitle>
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{product.name}</div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {product.description || "No description"}
                                    </p>
                                    <div className="mt-4 flex items-center justify-between">
                                        <Badge variant="secondary" className="text-xs">
                                            <Box className="mr-1 h-3 w-3" />
                                            {/* _count is returned by supabase select count */}
                                            {product._count?.skus || 0} SKUs
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )
            }
        </div >
    );
}
