import * as z from 'zod';

export const itemSchema = z.object({
    sku_id: z.string().min(1, "Product selection is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unit_price: z.coerce.number().min(0, "Price must be positive"),
    description: z.string().optional(),
    hsn_code: z.string().optional().default(""),
    unit_of_measurement: z.string().optional().default(""),
    net_weight: z.coerce.number().optional().default(0),
    gross_weight: z.coerce.number().optional().default(0)
});

export const proformaSchema = z.object({
    buyer_id: z.string().min(1, "Buyer required"),
    date: z.string().min(1, "Date required"),
    currency_code: z.string().min(1, "Currency required"),
    conversion_rate: z.coerce.number().min(0.0001, "Exchange rate required"),
    lut_id: z.string().optional(),
    // New fields
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
    payment_terms: z.string().optional(),
    port_of_loading: z.string().optional(),
    port_of_discharge: z.string().optional(),
    bank_id: z.string().optional(),
    items: z.array(itemSchema).min(1, "At least one item required"),
});

export type ProformaFormValues = z.infer<typeof proformaSchema>;
