import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getUserAndCompany } from "@/lib/helpers/api";

export async function GET(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const { searchParams } = new URL(request.url);

        const status = searchParams.get("status");
        const order_id = searchParams.get("order_id");

        let query = supabase
            .from("shipping_bills")
            .select(`
                *,
                export_orders (
                    order_number,
                    entities (name)
                ),
                proforma_invoices (
                    invoice_number
                ),
                shipping_bill_items (
                    *
                )
            `)
            .eq("company_id", companyId)
            .order("created_at", { ascending: false });

        if (status && status !== "all") {
            query = query.eq("status", status);
        }

        if (order_id) {
            query = query.eq("export_order_id", order_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        return NextResponse.json({ shippingBills: data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const body = await request.json();

        const {
            sb_number,
            sb_date,
            export_order_id,
            invoice_id,
            port_code,
            customs_house,
            customs_officer_name,
            fob_value,
            freight_value,
            insurance_value,
            currency_code,
            let_export_order_number,
            let_export_date,
            notes,
            items
        } = body;

        // Validation
        if (!sb_number || !sb_date || !fob_value) {
            return NextResponse.json(
                { error: "SB number, date, and FOB value are required" },
                { status: 400 }
            );
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json(
                { error: "At least one item is required" },
                { status: 400 }
            );
        }

        // Calculate total value
        const total_value = parseFloat(fob_value) +
            parseFloat(freight_value || 0) +
            parseFloat(insurance_value || 0);

        // Create shipping bill
        const { data: shippingBill, error: sbError } = await supabase
            .from("shipping_bills")
            .insert({
                company_id: companyId,
                sb_number,
                sb_date,
                export_order_id,
                invoice_id,
                port_code,
                customs_house,
                customs_officer_name,
                fob_value: parseFloat(fob_value),
                freight_value: parseFloat(freight_value || 0),
                insurance_value: parseFloat(insurance_value || 0),
                total_value,
                currency_code: currency_code || 'USD',
                let_export_order_number,
                let_export_date,
                notes,
                status: 'drafted'
            })
            .select()
            .single();

        if (sbError) {
            if (sbError.code === '23505') { // Unique constraint violation
                return NextResponse.json(
                    { error: "Shipping Bill number already exists" },
                    { status: 400 }
                );
            }
            throw sbError;
        }

        // Create shipping bill items
        const sbItems = items.map((item: any) => {
            const itemFobValue = parseFloat(item.quantity) * parseFloat(item.unit_price);
            const assessableValue = itemFobValue -
                (parseFloat(item.freight_allocation || 0)) -
                (parseFloat(item.insurance_allocation || 0));

            return {
                shipping_bill_id: shippingBill.id,
                hsn_code: item.hsn_code,
                description: item.description,
                quantity: parseFloat(item.quantity),
                unit: item.unit,
                unit_price: parseFloat(item.unit_price),
                fob_value: itemFobValue,
                assessable_value: assessableValue,
                export_duty_rate: parseFloat(item.export_duty_rate || 0),
                export_duty_amount: parseFloat(item.export_duty_amount || 0),
                cess_rate: parseFloat(item.cess_rate || 0),
                cess_amount: parseFloat(item.cess_amount || 0),
                order_item_id: item.order_item_id || null
            };
        });

        const { error: itemsError } = await supabase
            .from("shipping_bill_items")
            .insert(sbItems);

        if (itemsError) {
            // Rollback: delete the shipping bill
            await supabase.from("shipping_bills").delete().eq("id", shippingBill.id);
            throw itemsError;
        }

        return NextResponse.json({ success: true, shippingBill });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        // Security: ensure the shipping bill belongs to the user's company
        const { data: existing } = await supabase
            .from("shipping_bills")
            .select("company_id")
            .eq("id", id)
            .single();

        if (!existing || existing.company_id !== companyId) {
            return NextResponse.json(
                { error: "Shipping bill not found or access denied" },
                { status: 404 }
            );
        }

        // Don't allow changing company_id
        delete updates.company_id;
        updates.updated_at = new Date().toISOString();

        // Recalculate total if financial values changed
        if (updates.fob_value || updates.freight_value || updates.insurance_value) {
            const { data: current } = await supabase
                .from("shipping_bills")
                .select("fob_value, freight_value, insurance_value")
                .eq("id", id)
                .single();

            updates.total_value =
                parseFloat(updates.fob_value || current?.fob_value || 0) +
                parseFloat(updates.freight_value || current?.freight_value || 0) +
                parseFloat(updates.insurance_value || current?.insurance_value || 0);
        }

        const { error } = await supabase
            .from("shipping_bills")
            .update(updates)
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const supabase = await createSessionClient();

    try {
        const { companyId } = await getUserAndCompany(supabase);
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID required" }, { status: 400 });
        }

        // Security check
        const { data: existing } = await supabase
            .from("shipping_bills")
            .select("company_id, status")
            .eq("id", id)
            .single();

        if (!existing || existing.company_id !== companyId) {
            return NextResponse.json(
                { error: "Shipping bill not found or access denied" },
                { status: 404 }
            );
        }

        // Don't allow deleting filed/cleared shipping bills
        if (existing.status === 'filed' || existing.status === 'cleared') {
            return NextResponse.json(
                { error: "Cannot delete filed or cleared shipping bills" },
                { status: 400 }
            );
        }

        const { error } = await supabase
            .from("shipping_bills")
            .delete()
            .eq("id", id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
