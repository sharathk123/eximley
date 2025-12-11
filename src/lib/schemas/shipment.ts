
import * as z from "zod";

export const shipmentSchema = z.object({
    order_id: z.string().min(1, "Order is required"),
    items: z.array(z.object({
        order_item_id: z.string(),
        quantity: z.coerce.number().min(0.01, "Quantity must be > 0"),
        package_number: z.string().optional()
    })).min(1, "Select at least one item to ship"),
    shipment_date: z.string().optional(),
    incoterm: z.string().optional(),
    incoterm_place: z.string().optional(),
    carrier: z.string().optional(),
    tracking_number: z.string().optional(),
    port_of_loading: z.string().optional(),
    port_of_discharge: z.string().optional(),
    vessel_name: z.string().optional(),
    container_numbers: z.string().optional(), // Transformed in onSubmit
});

export type ShipmentFormValues = z.infer<typeof shipmentSchema>;
