import { NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { hsnCodes } = body; // Expecting { hsnCodes: [{ hsn_code, description, gst_rate, duty_rate }, ...] }

        if (!Array.isArray(hsnCodes) || hsnCodes.length === 0) {
            return NextResponse.json({ error: "No HSN data provided" }, { status: 400 });
        }

        const sessionClient = await createSessionClient();
        const { data: { user } } = await sessionClient.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: userData } = await sessionClient
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!userData) return NextResponse.json({ error: "Company missing" }, { status: 403 });

        const companyId = userData.company_id;
        const adminClient = createAdminClient();

        // 1. Fetch existing HSN codes for this company to handle "upsert" manually
        // (Since we are unsure if there is a unique constraint on company_id + hsn_code)
        const { data: existingData, error: fetchError } = await adminClient
            .from("company_hsn")
            .select("hsn_code, id")
            .eq("company_id", companyId);

        if (fetchError) throw fetchError;

        const existingMap = new Map();
        existingData?.forEach(item => existingMap.set(item.hsn_code, item.id));

        const toInsert: any[] = [];
        const toUpdate: any[] = []; // We will have to update one by one or ignore

        // 2. Prepare data
        for (const item of hsnCodes) {
            if (!item.hsn_code) continue;

            const cleanCode = String(item.hsn_code).trim();
            const payload = {
                company_id: companyId,
                hsn_code: cleanCode,
                description: item.description || "",
                gst_rate: item.gst_rate ? Number(item.gst_rate) : 0,
                duty_rate: item.duty_rate ? Number(item.duty_rate) : 0,
                is_active: true
            };

            if (existingMap.has(cleanCode)) {
                // Update existing
                toUpdate.push({ id: existingMap.get(cleanCode), ...payload });
            } else {
                // Insert new
                toInsert.push(payload);
            }
        }

        // 3. Perform Insert
        if (toInsert.length > 0) {
            const { error: insertError } = await adminClient
                .from("company_hsn")
                .insert(toInsert);
            if (insertError) {
                // Check if it's a duplicate key error
                if (insertError.code === '23505') {
                    return NextResponse.json({
                        error: "Some HSN codes already exist in your database. Please remove duplicates from your file or refresh the page to see existing codes."
                    }, { status: 400 });
                }
                throw insertError;
            }
        }

        // 4. Perform Update (Sequential for now as Supabase doesn't support bulk update easily without exact matching)
        // Optimization: We could just ignore updates if we assume "Import" is mostly for new stuff, 
        // but let's try to update top 50 to avoid timeout if list is huge. 
        // For now, let's just do it.
        if (toUpdate.length > 0) {
            // Processing updates in parallel chunks could be faster
            await Promise.all(toUpdate.map(item =>
                adminClient
                    .from("company_hsn")
                    .update({
                        description: item.description,
                        gst_rate: item.gst_rate,
                        duty_rate: item.duty_rate
                    })
                    .eq("id", item.id)
            ));
        }

        return NextResponse.json({
            success: true,
            count: toInsert.length + toUpdate.length,
            inserted: toInsert.length,
            updated: toUpdate.length
        });

    } catch (error: any) {
        console.error("Bulk HSN Error:", error);

        // Provide user-friendly error messages
        if (error.code === '23505') {
            return NextResponse.json({
                error: "Duplicate HSN codes detected. Please check your file for duplicates."
            }, { status: 400 });
        }

        return NextResponse.json({
            error: error.message || "Failed to upload HSN codes. Please try again."
        }, { status: 500 });
    }
}
