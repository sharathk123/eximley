import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password, fullName, companyName, phone } = body;

        // validation
        if (!email || !password || !fullName || !companyName) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const adminClient = createAdminClient();
        const sessionClient = await createSessionClient();

        // 1. Create User (Admin Client)
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm
            user_metadata: { full_name: fullName },
        });

        if (authError) {
            console.error("Auth error:", authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        const userId = authData.user.id;

        // 2. Sign In (Session Client) to set cookies
        const { error: signInError } = await sessionClient.auth.signInWithPassword({
            email,
            password
        });

        if (signInError) {
            console.error("Sign in error:", signInError);
            // Continue creating DB records anyway? Or fail?
            // If sign in fails, user is created but not logged in.
            // We'll proceed so the account exists, but let FE know?
            // For MVP, proceed. FE will redirect. If no cookie, they might see login page.
        }

        // 3. Create Company
        const { data: companyData, error: companyError } = await adminClient
            .from("companies")
            .insert({
                legal_name: companyName,
                email: email,
            })
            .select()
            .single();

        if (companyError) {
            console.error("Company create error:", companyError);
            return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
        }

        const companyId = companyData.id;

        // 4. Link User to Company (Admin Role)
        const { error: roleError } = await adminClient
            .from("company_users")
            .insert({
                company_id: companyId,
                user_id: userId,
                role: "admin",
            });

        if (roleError) {
            console.error("Role assign error:", roleError);
        }

        // 5. Create Profile
        const { error: profileError } = await adminClient
            .from("user_profiles")
            .insert({
                id: userId,
                full_name: fullName,
                phone: phone,
            });

        if (profileError) {
            console.error("Profile create error:", profileError)
        }

        return NextResponse.json({
            success: true,
            companyId,
            userId
        });

    } catch (error: any) {
        console.error("Signup error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
