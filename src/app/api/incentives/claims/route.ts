import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

// GET /api/incentives/claims - List all claims
export async function GET(req: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

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
            .eq("company_id", userCompany.company_id)
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
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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

        // Get user's company
        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Verify shipping bill belongs to user's company
        const { data: sb } = await supabase
            .from("shipping_bills")
            .select("id")
            .eq("id", shipping_bill_id)
            .eq("company_id", userCompany.company_id)
            .single();

        if (!sb) {
            return NextResponse.json({ error: "Shipping bill not found or access denied" }, { status: 404 });
        }

        // Create claim
        const { data: claim, error } = await supabase
            .from("incentive_claims")
            .insert({
                company_id: userCompany.company_id,
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
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
        }

        // Get user's company
        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Update claim
        const { data: claim, error } = await supabase
            .from("incentive_claims")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("company_id", userCompany.company_id)
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
        const supabase = createRouteHandlerClient({ cookies });
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Claim ID is required" }, { status: 400 });
        }

        // Get user's company
        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Delete claim
        const { error } = await supabase
            .from("incentive_claims")
            .delete()
            .eq("id", id)
            .eq("company_id", userCompany.company_id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Claim deleted successfully" });

    } catch (error: any) {
        console.error("Delete claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
