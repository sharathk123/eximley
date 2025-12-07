import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// For managing the user's session (cookies)
// Uses ANON key (safe server-side secret)
export async function createSessionClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_ANON_SECRET!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

// For Admin / Background tasks (bypasses RLS)
// Uses SERVICE_ROLE key
export const createAdminClient = () => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
        throw new Error(
            "Missing Supabase environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
        );
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
