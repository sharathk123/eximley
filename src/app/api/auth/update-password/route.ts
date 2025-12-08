import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!password || password.length < 6) {
            return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        const supabase = await createSessionClient();
        const { data: { user }, error: authUserError } = await supabase.auth.getUser();

        if (authUserError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Update Auth Password
        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 400 });
        }

        // 2. Clear force_password_change flag
        // We need to find the user's company entry to update this flag.
        // Simplified: Update all entries for this user in company_users (usually just one)
        const { error: flagError } = await supabase
            .from("company_users")
            .update({ force_password_change: false })
            .eq("user_id", user.id);

        if (flagError) {
            console.error("Failed to clear force password flag:", flagError);
            // Don't fail the request, as password WAS changed. 
        }

        // 3. Check if user is Super Admin
        const { data: userRole } = await supabase
            .from("company_users")
            .select("is_super_admin")
            .eq("user_id", user.id)
            .single();

        return NextResponse.json({
            success: true,
            isSuperAdmin: userRole?.is_super_admin || false
        });

    } catch (error) {
        console.error("Internal Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
