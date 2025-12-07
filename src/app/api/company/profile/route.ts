import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAndCompany, sanitizeInput } from "@/lib/helpers/api";
import { ERRORS } from "@/lib/constants/messages";

const ALLOWED_COMPANY_FIELDS = [
    'legal_name', 'trade_name', 'iec_number', 'gstin', 'pan',
    'address', 'city', 'state', 'country', 'pincode',
    'phone', 'email', 'website',
    'bank_name', 'bank_account_number', 'bank_ifsc', 'bank_swift', 'bank_branch',
    'signatory_name', 'signatory_designation'
];

export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);

        // Fetch company profile
        const { data: company, error } = await supabase
            .from("companies")
            .select("*")
            .eq("id", companyId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ company: company || null });
    } catch (error: any) {
        const status = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

export async function PUT(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const body = await request.json();

        // Sanitize input
        const sanitizedBody = sanitizeInput(body, ALLOWED_COMPANY_FIELDS);

        if (Object.keys(sanitizedBody).length === 0) {
            return NextResponse.json({ error: ERRORS.NO_VALID_FIELDS }, { status: 400 });
        }

        // Update company profile
        const { data: company, error } = await supabase
            .from("companies")
            .update(sanitizedBody)
            .eq("id", companyId)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, company });
    } catch (error: any) {
        const status = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const body = await request.json();

        // Sanitize input
        const sanitizedBody = sanitizeInput(body, ALLOWED_COMPANY_FIELDS);

        // Insert company profile with ID
        const { data: company, error } = await supabase
            .from("companies")
            .insert({ ...sanitizedBody, id: companyId })
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, company });
    } catch (error: any) {
        const status = error.message === ERRORS.UNAUTHORIZED ? 401 : 500;
        return NextResponse.json({ error: error.message }, { status });
    }
}
