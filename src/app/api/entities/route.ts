import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type"); // Optional filter

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 404 });

        let query = supabase
            .from("entities")
            .select("*")
            .eq("company_id", userData.company_id)
            .order("created_at", { ascending: false });

        if (type) {
            query = query.eq("type", type);
        }

        const { data: entities, error } = await query;

        if (error) throw error;

        return NextResponse.json({ entities });
    } catch (error) {
        console.error("Entities Fetch Error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { type, name, email, phone, country, address, tax_id, verification_status } = body;

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        const { data: entity, error } = await supabase
            .from("entities")
            .insert({
                company_id: userData.company_id,
                type,
                name,
                email,
                phone,
                country,
                address,
                tax_id,
                verification_status: verification_status || 'unverified'
            })
            .select()
            .single();

        if (error) {
            console.error("Create Entity Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, entity });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, type, name, email, phone, country, address, tax_id, verification_status } = body;

        if (!id) {
            return NextResponse.json({ error: "Entity ID is required" }, { status: 400 });
        }

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: entity, error } = await supabase
            .from("entities")
            .update({
                type,
                name,
                email,
                phone,
                country,
                address,
                tax_id,
                verification_status
            })
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Update Entity Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, entity });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Entity ID is required" }, { status: 400 });
        }

        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { error } = await supabase
            .from("entities")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Delete Entity Error:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
