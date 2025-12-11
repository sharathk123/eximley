import { NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await context.params;
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from('company_users')
            .select('company_id')
            .eq('user_id', user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: 'No company found' }, { status: 404 });
        }

        // Fetch quote items with SKU details
        const { data: items, error } = await supabase
            .from('quote_items')
            .select(`
                *,
                skus (
                    id,
                    name,
                    sku_code,
                    unit
                )
            `)
            .eq('quote_id', id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return NextResponse.json({ items });
    } catch (error: any) {
        console.error('GET /api/quotes/[id]/items error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
