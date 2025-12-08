import { NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
        }

        const supabase = await createSessionClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 401 });
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Check Company Status & User Flags
            const { data: userData, error: userError } = await supabase
                .from("company_users")
                .select(`
                    role,
                    is_super_admin,
                    force_password_change,
                    companies (
                        status,
                        legal_name
                    )
                `)
                .eq("user_id", user.id)
                .single();

            if (userError || !userData) {
                await supabase.auth.signOut();
                return NextResponse.json({ error: "User profile not found" }, { status: 403 });
            }

            // Type assertion for nested join
            const company = userData.companies as any;

            if (company?.status !== 'active') {
                await supabase.auth.signOut();
                const msg = company?.status === 'pending'
                    ? "Your account is pending approval by the administrator."
                    : "Your account has been deactivated.";
                return NextResponse.json({ error: msg }, { status: 403 });
            }

            // Check for forced password change
            if (userData.force_password_change) {
                return NextResponse.json({
                    success: true,
                    requirePasswordChange: true
                });
            }

            // Return Super Admin status for proper redirect
            return NextResponse.json({
                success: true,
                requirePasswordChange: false,
                isSuperAdmin: userData.is_super_admin || false
            });
        }

        return NextResponse.json({ success: true, requirePasswordChange: false, isSuperAdmin: false });
    } catch (error: any) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
