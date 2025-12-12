import { z } from "zod";

export const sbSchema = z.object({
    id: z.string().optional(),
    sb_number: z.string().min(1, "SB Number is required"),
    sb_date: z.string().min(1, "SB Date is required"),
    export_order_id: z.string().min(1, "Export Order is required"),
    port_code: z.string().min(1, "Port code is required"),
    customs_house: z.string().min(1, "Customs house is required"),
    vessel_name: z.string().min(1, "Vessel/Flight name is required"),
    voyage_number: z.string().optional(),
    number_of_packages: z.coerce.number().min(1, "Number of packages is required"),
    gross_weight: z.coerce.number().min(0.01, "Gross weight is required"),
    net_weight: z.coerce.number().min(0.01, "Net weight is required"),
    ad_code: z.string().min(1, "AD code is required"),
    consignee_name: z.string().min(1, "Consignee name is required"),
    consignee_address: z.string().min(1, "Consignee address is required"),
    consignee_country: z.string().min(1, "Destination country is required"),
    container_numbers: z.string().optional(),
    seal_numbers: z.string().optional(),
    marks_and_numbers: z.string().optional(),
    fob_value: z.coerce.number().min(0, "FOB Value must be positive"),
    freight_value: z.coerce.number().min(0).optional().default(0),
    insurance_value: z.coerce.number().min(0).optional().default(0),
    currency_code: z.string().default("USD"),
    let_export_order_number: z.string().min(1, "LEO number is required"),
    let_export_date: z.string().min(1, "LEO date is required"),
    notes: z.string().optional(),
});

export type ShippingBillFormValues = z.infer<typeof sbSchema>;
