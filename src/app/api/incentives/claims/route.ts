import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/incentives/claims - List all claims
export async function GET(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        // Fetch claims with shipping bill details
        const { data: claims, error } = await supabase
            .from("incentive_claims")
            .select(`
                *,
                shipping_bills (
                    sb_number,
                    sb_date,
                    fob_value,
                    currency_code,
                    export_orders (
                        order_number,
                        entities (name)
                    )
                )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ claims });

    } catch (error: any) {
        console.error("Get claims error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// POST /api/incentives/claims - Create new claim
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const {
            shipping_bill_id,
            claim_type,
            rodtep_amount,
            rodtep_rate,
            drawback_amount,
            drawback_rate,
            notes
        } = body;

        if (!shipping_bill_id || !claim_type) {
            return NextResponse.json({ error: "shipping_bill_id and claim_type are required" }, { status: 400 });
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

        // Create claim
        const { data: claim, error } = await supabase
            .from("incentive_claims")
            .insert({
                company_id: companyId,
                shipping_bill_id,
                claim_type,
                rodtep_amount,
                rodtep_rate,
                drawback_amount,
                drawback_rate,
                notes
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ claim }, { status: 201 });

    } catch (error: any) {
        console.error("Create claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// PUT /api/incentives/claims - Update claim
export async function PUT(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
        }

        // Update claim
        const { data: claim, error } = await supabase
            .from("incentive_claims")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("company_id", companyId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!claim) {
            return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 });
        }

        return NextResponse.json({ claim });

    } catch (error: any) {
        console.error("Update claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/incentives/claims - Delete claim
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
        }

        // Delete claim
        const { error } = await supabase
            .from("incentive_claims")
            .delete()
            .eq("id", id)
            .eq("company_id", companyId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Claim deleted successfully" });

    } catch (error: any) {
        console.error("Delete claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
