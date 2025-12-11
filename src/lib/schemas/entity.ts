
import * as z from "zod";

export const entitySchema = z.object({
    type: z.enum(["buyer", "supplier", "partner", "other"]),
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    phone: z.string().optional(),
    country: z.string().min(1, "Country is required"),
    address: z.string().optional(),
    tax_id: z.string().optional(),
    verification_status: z.enum(["verified", "unverified"]).optional(),
});

export type EntityFormValues = z.infer<typeof entitySchema>;
