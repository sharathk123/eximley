
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    try {
        if (id) {
            // Fetch Single PO with full details including Vendor and Items and Export Order
            const { data, error } = await supabase
                .from("purchase_orders")
                .select(`
                    *,
                    entities:vendor_id (name),
                    export_orders (order_number),
                    purchase_order_items (
                        *,
                        skus (name, sku_code)
                    )
                `)
                .eq("id", id)
                .single();

            if (error) throw error;
            return NextResponse.json({ purchase_order: data });
        } else {
            // List all POs
            const { data, error } = await supabase
                .from("purchase_orders")
                .select(`
                    *,
                    entities:vendor_id (name),
                    export_orders (order_number)
                `)
                .order("created_at", { ascending: false });

            if (error) throw error;
            return NextResponse.json({ purchase_orders: data });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const supabase = await createSessionClient();
    try {
        const body = await request.json();
        const { vendor_id, order_date, currency_code, items, export_order_id, status } = body;

        // 1. Generate PO Number (Simple Sequential or Random for MVP)
        // Ideally use a database function or sequence, here using Date based distinct ID
        const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const po_number = `PO-${dateStr}-${randomSuffix}`;

        // 2. Calculate Totals
        // Reuse the helper logic if we refactor, but for now duplicate to keep it localized or use the new helper if available.
        // Let's refactor to use the helper below if possible, but functions are hoisted?
        // Actually I'll just use the helper defined above PUT (but define it before POST in final file structure or allow hoisting).
        // Since I'm editing via chunks, I can't easily move code around. 
        // I will just duplicate the logic inside POST or better, replace POST logic with the helper call.
        // Wait, I am appending PUT before DELETE, so helper is below POST? No, typescript hoisting works for functions.

        // Let's keep POST as is to minimize diff complexity unless I refactor POST too. 
        // I'll just leave POST as is for now and focus on PUT.
        let subtotal = 0;
        let tax_total = 0;

        const processedItems = items.map((item: any) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const taxRate = Number(item.tax_rate) || 0; // %

            const lineTotal = qty * price;
            const lineTax = lineTotal * (taxRate / 100);

            subtotal += lineTotal;
            tax_total += lineTax;

            return {
                sku_id: item.sku_id,
                quantity: qty,
                unit_price: price,
                tax_rate: taxRate,
                // total_price is generated column in DB, but we pass normalized data
            };
        });

        const total_amount = subtotal + tax_total;

        // 3. Insert Header
        const { data: po, error: poError } = await supabase
            .from("purchase_orders")
            .insert({
                po_number,
                vendor_id,
                export_order_id: export_order_id || null,
                order_date,
                currency_code,
                status: status || 'draft',
                subtotal,
                tax_total,
                total_amount
            })
            .select()
            .single();

        if (poError) throw poError;

        // 4. Insert Items
        if (processedItems.length > 0) {
            const itemsWithPoId = processedItems.map((item: any) => ({
                ...item,
                po_id: po.id
            }));

            const { error: itemsError } = await supabase
                .from("purchase_order_items")
                .insert(itemsWithPoId);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ success: true, purchase_order: po });

    } catch (error: any) {
        console.error("PO Creation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper to calculate totals
function calculateTotals(items: any[]) {
    let subtotal = 0;
    let tax_total = 0;

    const processedItems = items.map((item: any) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        const taxRate = Number(item.tax_rate) || 0; // %

        const lineTotal = qty * price;
        const lineTax = lineTotal * (taxRate / 100);

        subtotal += lineTotal;
        tax_total += lineTax;

        return {
            sku_id: item.sku_id,
            quantity: qty,
            unit_price: price,
            tax_rate: taxRate,
        };
    });

    return { processedItems, subtotal, tax_total, total_amount: subtotal + tax_total };
}

export async function PUT(request: Request) {
    const supabase = await createSessionClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    try {
        const body = await request.json();
        const { vendor_id, order_date, currency_code, items, export_order_id, status } = body;

        // 1. Calculate new totals
        const { processedItems, subtotal, tax_total, total_amount } = calculateTotals(items);

        // 2. Update Header
        const { error: headerError } = await supabase
            .from("purchase_orders")
            .update({
                vendor_id,
                export_order_id: export_order_id || null,
                order_date,
                currency_code,
                status: status || 'draft',
                subtotal,
                tax_total,
                total_amount
            })
            .eq("id", id);

        if (headerError) throw headerError;

        // 3. Update Items (Delete all and Re-insert)
        // Delete existing
        const { error: deleteError } = await supabase
            .from("purchase_order_items")
            .delete()
            .eq("po_id", id);

        if (deleteError) throw deleteError;

        // Insert new
        if (processedItems.length > 0) {
            const itemsWithPoId = processedItems.map((item: any) => ({
                ...item,
                po_id: id
            }));

            const { error: itemsError } = await supabase
                .from("purchase_order_items")
                .insert(itemsWithPoId);

            if (itemsError) throw itemsError;
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("PO Update Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
