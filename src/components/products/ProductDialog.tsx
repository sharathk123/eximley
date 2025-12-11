"use client";

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";

import { productSchema, ProductFormValues } from "@/lib/schemas/product";

interface ProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: any | null;
    categories: any[];
    onSave: (values: ProductFormValues) => Promise<void>;
}

export function ProductDialog({ open, onOpenChange, product, categories, onSave }: ProductDialogProps) {
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            name: "",
            category: "",
            description: "",
            image_url: "",
            material_primary: "",
            specifications: "",
            manufacturing_method: "",
            intended_use: "",
            features: "",
            tags: "",
            attributes: [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "attributes",
    });

    useEffect(() => {
        if (open) {
            if (product) {
                const attrs = product.attributes || {};
                const specificKeys = ['material_primary', 'specifications', 'thread_count', 'manufacturing_method', 'intended_use', 'features', 'tags'];

                // Convert generic attributes object to array for form, excluding specific ones
                const attrsArray = Object.entries(attrs)
                    .filter(([key]) => !specificKeys.includes(key))
                    .map(([key, value]) => ({ key, value: String(value) }));

                form.reset({
                    name: product.name,
                    category: product.category,
                    description: product.description || "",
                    image_url: product.image_url || "",
                    material_primary: attrs.material_primary || "",
                    specifications: attrs.specifications || attrs.thread_count || "",
                    manufacturing_method: attrs.manufacturing_method || "",
                    intended_use: attrs.intended_use || "",
                    features: attrs.features || "",
                    tags: attrs.tags || "",
                    attributes: attrsArray,
                });
            } else {
                form.reset({
                    name: "",
                    category: "",
                    description: "",
                    image_url: "",
                    material_primary: "",
                    specifications: "",
                    manufacturing_method: "",
                    intended_use: "",
                    features: "",
                    tags: "",
                    attributes: [],
                });
            }
        }
    }, [open, product, form]);

    const handleSubmit = async (values: ProductFormValues) => {
        await onSave(values);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Product Name</FormLabel>
                                    <FormControl><Input placeholder="Cotton Bed Sheet" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="category" render={({ field }) => (
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
                                                <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Textarea placeholder="Detailed product description..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="material_primary" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Primary Material</FormLabel>
                                    <FormControl><Input placeholder="100% Cotton" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="specifications" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Specifications (GSM/Size/Count)</FormLabel>
                                    <FormControl><Input placeholder="200 TC, King Size" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="manufacturing_method" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Manufacturing Method</FormLabel>
                                    <FormControl><Input placeholder="Woven, Knitted" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="intended_use" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Intended Use</FormLabel>
                                    <FormControl><Input placeholder="Home, Hotel, Hospital" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="features" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Features (comma separated)</FormLabel>
                                <FormControl><Input placeholder="Eco-friendly, Durable" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium">Additional Attributes</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ key: "", value: "" })}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Attribute
                                </Button>
                            </div>
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex gap-2 items-start">
                                    <FormField control={form.control} name={`attributes.${index}.key`} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder="Key (e.g. Color)" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name={`attributes.${index}.value`} render={({ field }) => (
                                        <FormItem className="flex-1">
                                            <FormControl><Input placeholder="Value (e.g. Blue)" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <FormField control={form.control} name="image_url" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Image URL (Optional)</FormLabel>
                                <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="flex justify-end space-x-2 pt-4">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {product ? "Update Product" : "Create Product"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
