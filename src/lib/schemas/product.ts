import * as z from "zod";

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    category: z.string().min(1, "Category is required"),
    description: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal("")),
    // Explicit Attributes
    material_primary: z.string().optional(),
    specifications: z.string().optional(), // For GSM, Thread Count, Size
    manufacturing_method: z.string().optional(),
    intended_use: z.string().optional(),
    features: z.string().optional(),
    tags: z.string().optional(),
    // Additional Attributes
    attributes: z.array(z.object({
        key: z.string().min(1, "Key is required"),
        value: z.string().min(1, "Value is required")
    })).optional().default([]),
});

export type ProductFormValues = z.infer<typeof productSchema>;
