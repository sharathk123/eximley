import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// GET /api/compliance/lut - List all LUTs
export async function GET(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(req.url);
        const status = searchParams.get("status");

        let query = supabase
            .from("luts")
            .select("*")
            .eq("company_id", companyId)
            .order("valid_from", { ascending: false });

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        const { data: luts, error } = await query;

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ luts });

    } catch (error: any) {
        console.error("Get LUTs error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// POST /api/compliance/lut - Create new LUT
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const {
            lut_number,
            financial_year,
            valid_from,
            valid_to,
            filed_date,
            acknowledgment_number,
            document_url
        } = body;

        if (!lut_number || !financial_year || !valid_from || !valid_to) {
            return NextResponse.json(
                { error: "LUT number, financial year, and validity dates are required" },
                { status: 400 }
            );
        }

        // Check for existing active LUT for same FY
        const { data: existing } = await supabase
            .from("luts")
            .select("id")
            .eq("company_id", companyId)
            .eq("financial_year", financial_year)
            .single();

        if (existing) {
            return NextResponse.json(
                { error: `LUT for Financial Year ${financial_year} already exists` },
                { status: 400 }
            );
        }

        const { data: lut, error } = await supabase
            .from("luts")
            .insert({
                company_id: companyId,
                lut_number,
                financial_year,
                valid_from,
                valid_to,
                filed_date,
                acknowledgment_number,
                document_url,
                status: 'active'
            })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ lut }, { status: 201 });

    } catch (error: any) {
        console.error("Create LUT error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// PUT /api/compliance/lut - Update LUT
export async function PUT(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "LUT ID is required" }, { status: 400 });
        }

        const { data: lut, error } = await supabase
            .from("luts")
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq("id", id)
            .eq("company_id", companyId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ lut });

    } catch (error: any) {
        console.error("Update LUT error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

// DELETE /api/compliance/lut - Delete LUT
export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "LUT ID is required" }, { status: 400 });
        }

        // Check if used in invoices
        const { data: invoices } = await supabase
            .from("proforma_invoices")
            .select("id")
            .eq("lut_id", id)
            .limit(1);

        if (invoices && invoices.length > 0) {
            return NextResponse.json(
                { error: "Cannot delete LUT linked to invoices. Archive it instead." },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("luts")
            .delete()
            .eq("id", id)
            .eq("company_id", companyId);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "LUT deleted successfully" });

    } catch (error: any) {
        console.error("Delete LUT error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
