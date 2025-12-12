import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query')?.toLowerCase();
        const type = searchParams.get('type')?.toLowerCase(); // 'sea' or 'air'

        const supabase = await createSessionClient();
        let dbQuery = supabase
            .from('ports')
            .select('id, name, code, country, type')
            .limit(20);

        if (type) {
            dbQuery = dbQuery.eq('type', type);
        }

        if (query) {
            // Search by name or code
            dbQuery = dbQuery.or(`name.ilike.%${query}%,code.ilike.%${query}%`);
        }

        const { data, error } = await dbQuery;

        if (error) {
            console.error('Error fetching ports:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ ports: data || [] });

    } catch (error: any) {
        console.error('API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
