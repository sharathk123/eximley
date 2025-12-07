import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get company_id
        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 400 });
        }

        const body = await request.json();
        const { entities } = body; // Expecting { entities: [{ name, type, email, phone, address, country, tax_id }, ...] }

        if (!entities || !Array.isArray(entities) || entities.length === 0) {
            return NextResponse.json({ error: "No entities provided" }, { status: 400 });
        }

        // Validate entity types
        const validTypes = ['buyer', 'supplier', 'partner', 'other'];

        // Format entities for insert
        const formattedEntities = entities.map((item: any) => {
            const type = (item.type || item.Type || 'other').toLowerCase();
            return {
                company_id: companyUser.company_id,
                name: item.name || item.Name || "",
                type: validTypes.includes(type) ? type : 'other',
                email: item.email || item.Email || null,
                phone: item.phone || item.Phone || null,
                address: item.address || item.Address || null,
                country: item.country || item.Country || null,
                tax_id: item.tax_id || item['Tax ID'] || item.taxid || null,
                verification_status: 'unverified'
            };
        }).filter((e: any) => e.name); // Filter out empty names

        if (formattedEntities.length === 0) {
            return NextResponse.json({ error: "No valid entities to import" }, { status: 400 });
        }

        // Insert entities
        const { data, error: insertError } = await supabase
            .from("entities")
            .insert(formattedEntities)
            .select();

        if (insertError) {
            console.error("Bulk insert error:", insertError);
            return NextResponse.json({ error: insertError.message }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            count: data?.length || 0,
            entities: data
        });

    } catch (error: any) {
        console.error("Bulk Entities Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
