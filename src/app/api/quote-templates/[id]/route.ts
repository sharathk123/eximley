
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSessionClient();
        const { id } = params;

        const { data: template, error } = await supabase
            .from("quote_templates")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        return NextResponse.json({ template });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
    try {
        const supabase = await createSessionClient();
        const { id } = params;

        const { error } = await supabase
            .from("quote_templates")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
