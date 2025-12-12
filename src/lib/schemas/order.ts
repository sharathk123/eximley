
import * as z from "zod";

export const orderSchema = z.object({
    id: z.string().optional(),
    buyer_id: z.string().min(1, "Buyer required"),
    pi_id: z.string().optional(),
    currency_code: z.string().min(1, "Currency required"),
    order_date: z.string().min(1, "Date required"),
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
    payment_method: z.enum(['LC', 'TT', 'DA', 'DP', 'CAD', 'Advance']).optional(),
    shipment_period: z.string().optional(),
    latest_shipment_date: z.string().optional(),
    advance_percentage: z.coerce.number().min(0).max(100).optional(),
    lc_number: z.string().optional(),
    lc_issuing_bank: z.string().optional(),
    partial_shipment_allowed: z.boolean().default(true),
    transhipment_allowed: z.boolean().default(true),
    status: z.enum(['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'completed', 'cancelled']).default('pending'),
    items: z.array(z.object({
        sku_id: z.string().min(1, "SKU required"),
        quantity: z.coerce.number().min(1),
        unit_price: z.coerce.number().min(0),
    })).min(1, "At least one item required"),
});

export type OrderFormValues = z.infer<typeof orderSchema>;
