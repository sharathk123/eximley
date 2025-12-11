"use client";

import { Edit, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ProductTableProps {
    products: any[]; // Replace 'any' with Product type if available
    viewMode: 'card' | 'list';
    onEdit: (product: any) => void;
    onDelete: (product: any) => void;
    onDeleteSKU: (sku: any) => void;
    onGenerateSKU: (product: any) => void;
    onAiSuggest: (product: any) => void; // For HSN suggestion
    generatingSKUId: string | null;
}

export function ProductTable({
    products,
    viewMode,
    onEdit,
    onDelete,
    onDeleteSKU,
    onGenerateSKU,
    onAiSuggest,
    generatingSKUId
}: ProductTableProps) {
    if (viewMode === 'card') {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
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
                                    onClick={() => onEdit(product)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => onDelete(product)}
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
                            {product.itc_hs_code && (
                                <div className="mt-1">
                                    <span className="text-xs text-muted-foreground">ITC HS: </span>
                                    <span className="text-xs font-mono text-blue-600">{product.itc_hs_code}</span>
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
        );
    }

    return (
        <div className="border rounded-md bg-card">
            <Table className="table-fixed">
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[220px]">Product</TableHead>
                        <TableHead className="w-[140px]">HSN / Tax</TableHead>
                        <TableHead className="w-[200px]">Attributes</TableHead>
                        <TableHead className="w-[250px]">SKUs</TableHead>
                        <TableHead className="w-[80px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{product.name}</span>
                                    <Badge variant="outline" className="w-fit mt-1 text-[10px] font-normal text-muted-foreground">{product.category}</Badge>
                                    {product.description && (
                                        <span className="text-[10px] text-muted-foreground mt-1 line-clamp-2" title={product.description}>{product.description}</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    {product.hsn_code ? (
                                        <div className="flex items-center gap-1 text-xs font-mono">
                                            <span className="text-muted-foreground">GST:</span>
                                            <span>{product.hsn_code}</span>
                                        </div>
                                    ) : <span className="text-xs text-muted-foreground italic">No GST Code</span>}

                                    {product.itc_hs_code ? (
                                        <div className="flex items-center gap-1 text-xs font-mono text-blue-600">
                                            <span>ITC:</span>
                                            <span>{product.itc_hs_code}</span>
                                        </div>
                                    ) : null}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-wrap gap-1">
                                    {product.attributes && Object.keys(product.attributes).length > 0 ? (
                                        Object.entries(product.attributes).slice(0, 4).map(([k, v]: any, i) => (
                                            <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0 h-5 font-normal bg-slate-100 dark:bg-slate-800 border-slate-200">
                                                {k}: {v}
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-xs text-muted-foreground italic">-</span>
                                    )}
                                    {product.attributes && Object.keys(product.attributes).length > 4 && (
                                        <span className="text-[10px] text-muted-foreground">+{Object.keys(product.attributes).length - 4} more</span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                {product.skus && product.skus.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                        {product.skus.slice(0, 3).map((sku: any, idx: number) => (
                                            <div key={idx} className="group relative">
                                                <Badge variant="outline" className="px-1 py-0 text-[10px] h-5 pr-3 cursor-default bg-background">
                                                    {sku.sku_code}
                                                </Badge>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteSKU(sku);
                                                    }}
                                                    className="absolute right-0 top-0 bottom-0 px-1 opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive flex items-center justify-center bg-background/80"
                                                    title="Delete SKU"
                                                >
                                                    <span className="text-[10px] font-bold leading-none mb-[1px]">×</span>
                                                </button>
                                            </div>
                                        ))}
                                        {product.skus.length > 3 && (
                                            <span className="text-[10px] text-muted-foreground">+{product.skus.length - 3}</span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-6 text-[10px] text-blue-600 px-2"
                                            onClick={() => onGenerateSKU(product)}
                                            disabled={generatingSKUId === product.id}
                                        >
                                            {generatingSKUId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Auto-Gen SKU"}
                                        </Button>
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600" onClick={() => onAiSuggest(product)} title="AI HSN Suggest">
                                        <Sparkles className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(product)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(product)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
