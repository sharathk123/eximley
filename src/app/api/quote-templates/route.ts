
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET - List all templates
export async function GET(request: Request) {
    try {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        const { data: templates, error } = await supabase
            .from("quote_templates")
            .select("*")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false });

        if (error) throw error;

        return NextResponse.json({ templates });
    } catch (error: any) {
        console.error("GET /api/quote-templates error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Create a new template from quote data
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { name, description, template_data } = body;

        if (!name || !template_data) {
            return NextResponse.json({ error: "Name and template data are required" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        const { data: template, error } = await supabase
            .from("quote_templates")
            .insert({
                company_id: companyUser.company_id,
                name,
                description,
                template_data
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ template });
    } catch (error: any) {
        console.error("POST /api/quote-templates error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
