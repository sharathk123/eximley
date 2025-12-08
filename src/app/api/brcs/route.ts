import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/brcs - List all BRCs with filters
export async function GET(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");
        const overdue = searchParams.get("overdue");
        const shipping_bill_id = searchParams.get("shipping_bill_id");

        let query = supabase
            .from("brcs")
            .select(`
                *,
                shipping_bills (
                    sb_number,
                    sb_date,
                    export_orders (
                        order_number,
                        entities (name)
                    )
                ),
                brc_payments (
                    id,
                    amount,
                    payment_date,
                    payment_reference
                )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        // Apply filters
        if (status && status !== "all") {
            query = query.eq("realization_status", status);
        }

        if (overdue === "true") {
            query = query.eq("is_overdue", true);
        }

        if (shipping_bill_id) {
            query = query.eq("shipping_bill_id", shipping_bill_id);
        }

        const { data: brcs, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Update days_remaining for each BRC
        const brcsWithDays = brcs?.map(brc => ({
            ...brc,
            days_remaining: Math.ceil((new Date(brc.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        }));

        return NextResponse.json({ brcs: brcsWithDays });

    } catch (error: any) {
        console.error("Get BRCs error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// POST /api/brcs - Create new BRC
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const {
            shipping_bill_id,
            invoice_value,
            currency_code,
            export_date,
            bank_name,
            bank_branch,
            ad_code,
            notes
        } = body;

        if (!shipping_bill_id || !invoice_value || !currency_code || !export_date) {
            return NextResponse.json(
                { error: "shipping_bill_id, invoice_value, currency_code, and export_date are required" },
                { status: 400 }
            );
        }

        // Verify shipping bill belongs to user's company
        const { data: sb } = await supabase
            .from("shipping_bills")
            .select("id")
            .eq("id", shipping_bill_id)
            .eq("company_id", companyId)
            .single();

        if (!sb) {
            return NextResponse.json({ error: "Shipping bill not found or access denied" }, { status: 404 });
        }

        // Calculate due date (export date + 9 months)
        const exportDateObj = new Date(export_date);
        const dueDate = new Date(exportDateObj);
        dueDate.setMonth(dueDate.getMonth() + 9);

        // Calculate days remaining
        const daysRemaining = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        // Create BRC
        const { data: brc, error } = await supabase
            .from("brcs")
            .insert({
                company_id: companyId,
                shipping_bill_id,
                invoice_value,
                currency_code,
                export_date,
                due_date: dueDate.toISOString().split('T')[0],
                days_remaining: daysRemaining,
                pending_amount: invoice_value,
                is_overdue: daysRemaining < 0,
                bank_name,
                bank_branch,
                ad_code,
                notes
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ brc }, { status: 201 });

    } catch (error: any) {
        console.error("Create BRC error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// PUT /api/brcs - Update BRC
export async function PUT(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "BRC ID is required" }, { status: 400 });
        }

        // Update BRC
        const { data: brc, error } = await supabase
            .from("brcs")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("company_id", companyId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!brc) {
            return NextResponse.json({ error: "BRC not found or access denied" }, { status: 404 });
        }

        return NextResponse.json({ brc });

    } catch (error: any) {
        console.error("Update BRC error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/brcs - Delete BRC
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "BRC ID is required" }, { status: 400 });
        }

        // Check if BRC has payments
        const { data: payments } = await supabase
            .from("brc_payments")
            .select("id")
            .eq("brc_id", id)
            .limit(1);

        if (payments && payments.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete BRC with linked payments. Remove payments first." },
                { status: 400 }
            );
        }

        // Delete BRC
        const { error } = await supabase
            .from("brcs")
            .delete()
            .eq("id", id)
            .eq("company_id", companyId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "BRC deleted successfully" });

    } catch (error: any) {
        console.error("Delete BRC error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
