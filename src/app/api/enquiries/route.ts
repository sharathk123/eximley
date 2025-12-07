import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

        // Generate enquiry number
        const { data: existingEnquiries } = await supabase
            .from("enquiries")
            .select("enquiry_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let enquiryNumber = "ENQ-2024-001";
        if (existingEnquiries && existingEnquiries.length > 0) {
            const lastNumber = existingEnquiries[0].enquiry_number;
            const match = lastNumber.match(/ENQ-(\d{4})-(\d{3})/);
            if (match) {
                const year = new Date().getFullYear();
                const lastYear = parseInt(match[1]);
                const lastSeq = parseInt(match[2]);

                if (year === lastYear) {
                    enquiryNumber = `ENQ-${year}-${String(lastSeq + 1).padStart(3, '0')}`;
                } else {
                    enquiryNumber = `ENQ-${year}-001`;
                }
            }
        } else {
            const year = new Date().getFullYear();
            enquiryNumber = `ENQ-${year}-001`;
        }

        const { data: enquiry, error } = await supabase
            .from("enquiries")
            .insert({
                ...body,
                company_id: companyUser.company_id,
                enquiry_number: enquiryNumber,
                assigned_to: user.id,
            })
            .select()
            .single();

        if (error) throw error;

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
        const { id, ...updates } = body;

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
