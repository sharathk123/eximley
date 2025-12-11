
import * as z from "zod";

export const poSchema = z.object({
    id: z.string().optional(),
    vendor_id: z.string().min(1, "Vendor required"),
    export_order_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    order_date: z.string().min(1, "Date required"),
    status: z.enum(['draft', 'issued', 'confirmed', 'received', 'completed', 'cancelled']).default('draft'),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
        tax_rate: z.coerce.number().min(0).optional(),
    })).min(1, "At least one item required"),
});

export type PurchaseOrderFormValues = z.infer<typeof poSchema>;
