import { SupabaseClient } from "@supabase/supabase-js";
import { ERRORS } from "@/lib/constants/messages";

/**
 * Get the company ID for the authenticated user
 * @param supabase - Supabase client instance
 * @param userId - User ID from auth
 * @returns Company ID
 * @throws Error if company not found
 */
export async function getUserCompanyId(
    supabase: SupabaseClient,
    userId: string
): Promise<string> {
    const { data, error } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .single();

    if (error || !data) {
        throw new Error(ERRORS.COMPANY_NOT_FOUND);
    }

    return data.company_id;
}

/**
 * Get the authenticated user and their company ID
 * @param supabase - Supabase client instance
 * @returns Object containing user and company_id
 * @throws Error if unauthorized or company not found
 */
export async function getUserAndCompany(supabase: SupabaseClient): Promise<{
    user: any;
    companyId: string;
}> {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        throw new Error(ERRORS.UNAUTHORIZED);
    }

    const companyId = await getUserCompanyId(supabase, user.id);

    return { user, companyId };
}

/**
 * Sanitize object to only include whitelisted fields
 * @param data - Input data object
 * @param allowedFields - Array of allowed field names
 * @returns Sanitized object with only allowed fields
 */
export function sanitizeInput<T extends Record<string, any>>(
    data: T,
    allowedFields: string[]
): Partial<T> {
    return Object.keys(data)
        .filter((key) => allowedFields.includes(key))
        .reduce((obj, key) => ({ ...obj, [key]: data[key] }), {} as Partial<T>);
}

/**
 * Convert amount to cents to avoid floating point issues
 * @param amount - Amount in dollars/currency
 * @returns Amount in cents (integer)
 */
export function toCents(amount: number): number {
    return Math.round(amount * 100);
}

/**
 * Convert cents back to currency amount
 * @param cents - Amount in cents
 * @returns Amount in currency (decimal)
 */
export function fromCents(cents: number): number {
    return cents / 100;
}

/**
 * Compare two monetary amounts safely
 * @param amount1 - First amount
 * @param amount2 - Second amount
 * @returns -1 if amount1 < amount2, 0 if equal, 1 if amount1 > amount2
 */
export function compareAmounts(amount1: number, amount2: number): number {
    const cents1 = toCents(amount1);
    const cents2 = toCents(amount2);

    if (cents1 < cents2) return -1;
    if (cents1 > cents2) return 1;
    return 0;
}
