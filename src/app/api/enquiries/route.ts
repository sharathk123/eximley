import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

// GET - Fetch all enquiries with optional filtering
export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);

        const status = searchParams.get("status");
        const priority = searchParams.get("priority");
        const assigned_to = searchParams.get("assigned_to");

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        let query = supabase
            .from("enquiries")
            .select(`
                *,
                enquiry_items (
                    *,
                    skus (
                        id,
                        name,
                        sku_code,
                        products (
                            name
                        )
                    )
                ),
                entities (
                    id,
                    name,
                    email,
                    phone,
                    country
                ),
                proforma_invoices (
                    id,
                    invoice_number
                ),
                export_orders (
                    id,
                    order_number
                ),
                quotes (
                    id,
                    quote_number
                )
            `)
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false });

        // Apply filters
        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (assigned_to) query = query.eq("assigned_to", assigned_to);

        // Apply Search
        const search = searchParams.get("search");
        if (search) {
            query = query.or(`enquiry_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_company.ilike.%${search}%`);
        }

        const { data: enquiries, error } = await query;

        if (error) throw error;

        return NextResponse.json({ enquiries });
    } catch (error: any) {
        console.error("GET /api/enquiries error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create new enquiry
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Generate enquiry number using centralized service
        const enquiryNumber = await NumberingService.generateNextNumber(companyUser.company_id, 'ENQUIRY');

        const { items, currency_code, ...enquiryData } = body;

        // Sanitize date fields - convert empty strings to null
        if (enquiryData.next_follow_up_date === '' || enquiryData.next_follow_up_date === undefined) {
            enquiryData.next_follow_up_date = null;
        }

        const { data: enquiry, error } = await supabase
            .from("enquiries")
            .insert({
                ...enquiryData,
                company_id: companyUser.company_id,
                enquiry_number: enquiryNumber,
                assigned_to: user.id,
            })
            .select()
            .single();

        if (error) throw error;

        // Insert Items if present
        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => ({
                enquiry_id: enquiry.id,
                sku_id: item.sku_id || null, // Ensure sku_id is used
                quantity: item.quantity || 1,
                target_price: item.target_price,
                notes: item.notes
            }));

            const { error: itemsError } = await supabase
                .from("enquiry_items")
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ enquiry }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/enquiries error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update enquiry
export async function PUT(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { id, items, currency_code, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: enquiry, error } = await supabase
            .from("enquiries")
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        // Update Items: Delete all and re-insert (Simple strategy)
        if (items) {
            // Delete existing
            await supabase.from("enquiry_items").delete().eq("enquiry_id", id);

            if (items.length > 0) {
                const itemsToInsert = items.map((item: any) => ({
                    enquiry_id: id,
                    sku_id: item.sku_id || null,
                    quantity: item.quantity || 1,
                    target_price: item.target_price,
                    notes: item.notes
                }));

                const { error: itemsError } = await supabase
                    .from("enquiry_items")
                    .insert(itemsToInsert);

                if (itemsError) throw itemsError;
            }
        }

        return NextResponse.json({ enquiry });
    } catch (error: any) {
        console.error("PUT /api/enquiries error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete enquiry
export async function DELETE(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Enquiry ID required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { error } = await supabase
            .from("enquiries")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/enquiries error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
