import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// POST - Bulk upload enquiries
export async function POST(request: Request) {
    try {
        const supabase = await createSessionClient();
        const body = await request.json();
        const { enquiries: bulkEnquiries } = body;

        if (!bulkEnquiries || !Array.isArray(bulkEnquiries) || bulkEnquiries.length === 0) {
            return NextResponse.json({ error: "Invalid enquiries data" }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get user's company
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 404 });
        }

        // Get last enquiry number for auto-generation
        const { data: existingEnquiries } = await supabase
            .from("enquiries")
            .select("enquiry_number")
            .eq("company_id", companyUser.company_id)
            .order("created_at", { ascending: false })
            .limit(1);

        let lastSeq = 0;
        const year = new Date().getFullYear();

        if (existingEnquiries && existingEnquiries.length > 0) {
            const lastNumber = existingEnquiries[0].enquiry_number;
            const match = lastNumber.match(/ENQ-(\d{4})-(\d{3})/);
            if (match && parseInt(match[1]) === year) {
                lastSeq = parseInt(match[2]);
            }
        }

        // Prepare enquiries with auto-generated numbers
        const enquiriesToInsert = bulkEnquiries.map((enq, index) => {
            const seqNumber = lastSeq + index + 1;
            const enquiryNumber = `ENQ-${year}-${String(seqNumber).padStart(3, '0')}`;

            return {
                company_id: companyUser.company_id,
                enquiry_number: enquiryNumber,
                customer_name: enq.customer_name || enq['Customer Name'] || '',
                customer_email: enq.customer_email || enq['Email'] || enq['Customer Email'] || '',
                customer_phone: enq.customer_phone || enq['Phone'] || enq['Customer Phone'] || '',
                customer_company: enq.customer_company || enq['Company'] || enq['Customer Company'] || '',
                customer_country: enq.customer_country || enq['Country'] || enq['Customer Country'] || '',
                source: enq.source || enq['Source'] || 'other',
                subject: enq.subject || enq['Subject'] || '',
                description: enq.description || enq['Description'] || '',
                priority: enq.priority || enq['Priority'] || 'medium',
                status: 'new',
                assigned_to: user.id,
            };
        });

        const { data: insertedEnquiries, error } = await supabase
            .from("enquiries")
            .insert(enquiriesToInsert)
            .select();

        if (error) throw error;

        return NextResponse.json({
            count: insertedEnquiries?.length || 0,
            enquiries: insertedEnquiries
        }, { status: 201 });
    } catch (error: any) {
        console.error("POST /api/enquiries/bulk error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
