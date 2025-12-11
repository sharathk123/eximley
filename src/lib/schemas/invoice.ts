
import * as z from "zod";

export const invoiceSchema = z.object({
    id: z.string().optional(),
    buyer_id: z.string().min(1, "Buyer required"),
    currency_code: z.string().min(1, "Currency required"),
    date: z.string().min(1, "Date required"),
    conversion_rate: z.coerce.number().min(0.0001),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
    })).min(1, "At least one item required"),
    lut_id: z.string().optional(),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;
