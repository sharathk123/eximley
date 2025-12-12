import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { searchParams } = new URL(request.url);

        // Get user company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) throw new Error("Company not found");

        const { data: banks, error } = await supabase
            .from("company_banks")
            .select("*")
            .eq("company_id", userCompany.company_id)
            .order("is_default", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ banks });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();

        // Get user company
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Unauthorized");

        const { data: userCompany } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userCompany) throw new Error("Company not found");

        // Simple validation
        if (!body.bank_name || !body.account_number) {
            return NextResponse.json({ error: "Bank Name and Account Number are required" }, { status: 400 });
        }

        const { data: bank, error } = await supabase
            .from("company_banks")
            .insert({
                ...body,
                company_id: userCompany.company_id
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ bank });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
