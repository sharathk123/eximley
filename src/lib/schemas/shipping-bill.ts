import { z } from "zod";

export const sbSchema = z.object({
    id: z.string().optional(),
    sb_number: z.string().min(1, "SB Number is required"),
    sb_date: z.string().min(1, "SB Date is required"),
    export_order_id: z.string().min(1, "Export Order is required"),
    port_code: z.string().optional(),
    customs_house: z.string().optional(),
    fob_value: z.coerce.number().min(0, "FOB Value must be positive"),
    freight_value: z.coerce.number().min(0).optional().default(0),
    insurance_value: z.coerce.number().min(0).optional().default(0),
    currency_code: z.string().default("USD"),
    let_export_order_number: z.string().optional(),
    let_export_date: z.string().optional(),
    notes: z.string().optional(),
});

export type ShippingBillFormValues = z.infer<typeof sbSchema>;
