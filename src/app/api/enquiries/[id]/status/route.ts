import { createSessionClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSessionClient();
        const { id } = await params;
        const { status } = await request.json();

        // Validate status
        const validStatuses = ['new', 'contacted', 'quoted', 'won', 'lost', 'converted'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json(
                { error: 'Invalid status value' },
                { status: 400 }
            );
        }

        // Update enquiry status
        const { data, error } = await supabase
            .from('enquiries')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating enquiry status:', error);
            return NextResponse.json(
                { error: error.message },
                { status: 500 }
            );
        }

        return NextResponse.json({ enquiry: data });
    } catch (error) {
        console.error('Error in status update:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
