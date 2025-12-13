
import { NextRequest, NextResponse } from 'next/server';
import { createSessionClient } from '@/lib/supabase/server';

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    try {
        const supabase = await createSessionClient();

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the proforma invoice
        const { data: invoice, error: fetchError } = await supabase
            .from('proforma_invoices')
            .select('*')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (fetchError || !invoice) {
            return NextResponse.json(
                { error: 'Proforma invoice not found' },
                { status: 404 }
            );
        }

        // Validation checks
        if (invoice.status !== 'approved') {
            return NextResponse.json(
                { error: 'Only approved proforma invoices can be converted to commercial invoices' },
                { status: 400 }
            );
        }

        if (invoice.invoice_type === 'commercial') {
            return NextResponse.json(
                { error: 'This proforma invoice has already been converted to a commercial invoice' },
                { status: 400 }
            );
        }

        // Convert to commercial invoice
        const { data: updated, error: updateError } = await supabase
            .from('proforma_invoices')
            .update({
                invoice_type: 'commercial',
                converted_to_commercial_at: new Date().toISOString()
            })
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (updateError) {
            console.error('Error converting to commercial invoice:', updateError);
            return NextResponse.json(
                { error: 'Failed to convert to commercial invoice' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            invoice: updated,
            message: 'Successfully converted to commercial invoice'
        });

    } catch (error) {
        console.error('Error in convert-commercial API:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
