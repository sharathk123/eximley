import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST() {
    try {
        const supabase = await createSessionClient();

        // Sign out the user
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Logout error:", error);
            // Even if supabase fails, we should probably clear cookies or redirect
            // But usually this means session was already invalid
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
