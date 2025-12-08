import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is Super Admin
        const { data: userData, error: userError } = await supabase
            .from("company_users")
            .select("is_super_admin")
            .eq("user_id", user.id)
            .single();

        if (userError || !userData?.is_super_admin) {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        // Fetch all companies (Super Admin RLS policy allows this)
        const { data: companies, error: companiesError } = await supabase
            .from("companies")
            .select("id, legal_name, email, status, created_at, phone, city, country")
            .order("created_at", { ascending: false });

        if (companiesError) {
            console.error("Fetch companies error:", companiesError);
            return NextResponse.json({ error: "Failed to fetch companies" }, { status: 500 });
        }

        return NextResponse.json({ companies });

    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { companyId, status } = body;

        if (!companyId || !["active", "inactive", "pending"].includes(status)) {
            return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
        }

        // Check if user is Super Admin
        const { data: userData, error: userError } = await supabase
            .from("company_users")
            .select("is_super_admin")
            .eq("user_id", user.id)
            .single();

        if (userError || !userData?.is_super_admin) {
            return NextResponse.json({ error: "Forbidden: Super Admin access required" }, { status: 403 });
        }

        // Update Company Status
        const { data: updatedCompany, error: updateError } = await supabase
            .from("companies")
            .update({ status })
            .eq("id", companyId)
            .select()
            .single();

        if (updateError) {
            console.error("Update company error:", updateError);
            return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
        }

        return NextResponse.json({ success: true, company: updatedCompany });

    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
