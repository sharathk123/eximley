import * as z from 'zod';

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
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        hsn_code: z.string().min(6, "HSN code required (minimum 6 digits)"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0.01),
        unit_of_measurement: z.string().min(1, "Unit of measurement required (e.g., PCS, KGS, MTR)"),
        net_weight: z.coerce.number().min(0, "Net weight must be non-negative"),
        gross_weight: z.coerce.number().min(0, "Gross weight must be non-negative"),
        description: z.string().optional(),
    })).min(1, "At least one item required"),
});

export type ProformaFormValues = z.infer<typeof proformaSchema>;
