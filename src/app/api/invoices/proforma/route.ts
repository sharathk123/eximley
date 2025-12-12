
import { createSessionClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";
import { NumberingService } from "@/lib/services/numberingService";

export async function GET(request: Request) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let query: any = supabase
            .from("proforma_invoices")
            .select(`
                *,
                proforma_items(
                    *,
                    skus(
                        *,
                        products(*)
                    )
                )
            `)
            .eq("company_id", (await getUserCompany(supabase, user.id)).company_id)
            .order("created_at", { ascending: false });

        if (id) {
            query = query.eq("id", id).single();
        }

        const { data: rawData, error: invError } = await query;
        if (invError) throw invError;

        // Normalize to array for processing
        let invoices = id ? [rawData] : (rawData || []);

        // 2. Fetch Related Data (Manually to avoid Join/FK issues)
        // Extract IDs
        const buyerIds = [...new Set(invoices.map((i: any) => i.buyer_id).filter(Boolean))];
        const bankIds = [...new Set(invoices.map((i: any) => i.bank_id).filter(Boolean))];
        const currencyCodes = [...new Set(invoices.map((i: any) => i.currency_code).filter(Boolean))];

        // Parallel Fetch
        const [buyersRes, banksRes, currenciesRes] = await Promise.all([
            buyerIds.length ? supabase.from("entities").select("id, name").in("id", buyerIds) : { data: [] },
            bankIds.length ? supabase.from("company_banks").select("*").in("id", bankIds) : { data: [] },
            currencyCodes.length ? supabase.from("currencies").select("code, symbol").in("code", currencyCodes) : { data: [] }
        ]);

        // Create Maps
        const buyerMap = new Map(buyersRes.data?.map((b: any) => [b.id, b]) || []);
        const bankMap = new Map(banksRes.data?.map((b: any) => [b.id, b]) || []);
        const currencyMap = new Map(currenciesRes.data?.map((c: any) => [c.code, c]) || []);

        // 3. Enrich Invoices
        const enrichedInvoices = invoices.map((inv: any) => ({
            ...inv,
            entities: buyerMap.get(inv.buyer_id) || null,
            company_banks: bankMap.get(inv.bank_id) || null,
            currencies: currencyMap.get(inv.currency_code) || null
        }));

        return NextResponse.json({ invoices: id ? enrichedInvoices[0] : enrichedInvoices });
    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper to get company (reused)
async function getUserCompany(supabase: any, userId: string) {
    const { data } = await supabase
        .from("company_users")
        .select("company_id")
        .eq("user_id", userId)
        .single();
    return data || { company_id: null };
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: companyUser } = await supabase
            .from("company_users")
            .select("company_id")
            .eq("user_id", user.id)
            .single();

        if (!companyUser) {
            return NextResponse.json({ error: "No company found" }, { status: 400 });
        }

        const body = await request.json();
        const {
            buyer_id,
            date,
            currency_code,
            conversion_rate,
            lut_id,
            items, // Array of { sku_id, quantity, unit_price }
            // New fields
            incoterm,
            incoterm_place,
            payment_terms,
            port_of_loading,
            port_of_discharge,
            bank_id
        } = body;

        // Auto-generate invoice number using centralized service
        const invoice_number = await NumberingService.generateNextNumber(companyUser.company_id, 'PROFORMA');

        // Calculate total
        const total_amount = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);

        // 1. Insert Invoice
        const { data: invoice, error: invoiceError } = await supabase
            .from("proforma_invoices")
            .insert({
                company_id: companyUser.company_id,
                invoice_number,
                buyer_id,
                date,
                currency_code,
                conversion_rate,
                lut_id: lut_id || null,
                total_amount,
                status: 'draft',
                incoterm: incoterm || null,
                incoterm_place: incoterm_place || null,
                payment_terms: payment_terms || null,
                port_of_loading: port_of_loading || null,
                port_of_discharge: port_of_discharge || null,
                bank_id: bank_id || null
            })
            .select()
            .single();

        if (invoiceError) throw invoiceError;

        // 2. Insert Items
        if (items && items.length > 0) {
            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(
                    items.map((item: any) => ({
                        invoice_id: invoice.id,
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        description: item.description // Optional
                    }))
                );

            if (itemsError) {
                // Cleanup invoice if items fail
                await supabase.from("proforma_invoices").delete().eq("id", invoice.id);
                throw itemsError;
            }
        }

        return NextResponse.json({ invoice });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createSessionClient();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        const { error } = await supabase
            .from("proforma_invoices")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update Invoice
export async function PUT(request: Request) {
    const supabase = await createSessionClient();
    try {
        const body = await request.json();
        const { id, items, ...updateData } = body;

        if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

        // Update invoice details
        const { error: invoiceError } = await supabase
            .from("proforma_invoices")
            .update(updateData)
            .eq("id", id);

        if (invoiceError) throw invoiceError;

        // Update items if provided (delete all and recreate is simplest strategy here)
        if (items) {
            // Delete existing items
            await supabase.from("proforma_items").delete().eq("invoice_id", id);

            // Insert new items
            const { error: itemsError } = await supabase
                .from("proforma_items")
                .insert(
                    items.map((item: any) => ({
                        invoice_id: id,
                        sku_id: item.sku_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        description: item.description
                    }))
                );

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
