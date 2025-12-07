import { createSessionClient } from "@/lib/supabase/server";
import { getUserAndCompany } from "@/lib/helpers/api";
import { NextRequest, NextResponse } from "next/server";

// POST /api/incentives/duty-drawback/calculate
// Calculate Duty Drawback incentive for a shipping bill
export async function POST(req: NextRequest) {
    try {
        const supabase = await createSessionClient();
        const { companyId } = await getUserAndCompany(supabase);

        const body = await req.json();
        const { shipping_bill_id } = body;

        if (!shipping_bill_id) {
            return NextResponse.json({ error: "shipping_bill_id is required" }, { status: 400 });
        }

        // Fetch shipping bill with items
        const { data: shippingBill, error: sbError } = await supabase
            .from("shipping_bills")
            .select(`
                *,
                export_orders (
                    order_number,
                    entities (name)
                ),
                shipping_bill_items (
                    id,
                    hsn_code,
                    description,
                    quantity,
                    unit,
                    unit_price,
                    total_value
                )
            `)
            .eq("id", shipping_bill_id)
            .eq("company_id", companyId)
            .single();

        if (sbError || !shippingBill) {
            return NextResponse.json({ error: "Shipping bill not found" }, { status: 404 });
        }

        // Calculate Duty Drawback for each item
        const itemsWithDrawback = [];
        let totalDrawbackAmount = 0;

        for (const item of shippingBill.shipping_bill_items || []) {
            // Get Duty Drawback rate for this HSN code
            const { data: rateData } = await supabase.rpc('get_duty_drawback_rate', {
                p_hsn_code: item.hsn_code,
                p_date: shippingBill.sb_date
            });

            const rate = rateData?.[0];

            if (rate) {
                const itemFOB = item.total_value || (item.quantity * item.unit_price);
                let drawbackAmount = 0;
                let calculationMethod = '';

                // Duty Drawback can be percentage-based OR fixed amount per unit
                if (rate.rate_percentage && rate.rate_amount) {
                    // Both available - use whichever gives higher benefit
                    const percentageAmount = itemFOB * (rate.rate_percentage / 100);
                    const fixedAmount = item.quantity * rate.rate_amount;

                    if (percentageAmount > fixedAmount) {
                        drawbackAmount = percentageAmount;
                        calculationMethod = `${rate.rate_percentage}% of FOB`;
                    } else {
                        drawbackAmount = fixedAmount;
                        calculationMethod = `₹${rate.rate_amount} per ${rate.unit}`;
                    }
                } else if (rate.rate_percentage) {
                    // Percentage-based only
                    drawbackAmount = itemFOB * (rate.rate_percentage / 100);
                    calculationMethod = `${rate.rate_percentage}% of FOB`;
                } else if (rate.rate_amount) {
                    // Fixed amount only
                    drawbackAmount = item.quantity * rate.rate_amount;
                    calculationMethod = `₹${rate.rate_amount} per ${rate.unit}`;
                }

                totalDrawbackAmount += drawbackAmount;

                itemsWithDrawback.push({
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    fob_value: itemFOB,
                    drawback_rate_percentage: rate.rate_percentage,
                    drawback_rate_amount: rate.rate_amount,
                    drawback_amount: Math.round(drawbackAmount * 100) / 100,
                    calculation_method: calculationMethod,
                    applicable: true
                });
            } else {
                // No rate found for this HSN
                itemsWithDrawback.push({
                    hsn_code: item.hsn_code,
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit,
                    fob_value: item.total_value || (item.quantity * item.unit_price),
                    drawback_rate_percentage: 0,
                    drawback_rate_amount: 0,
                    drawback_amount: 0,
                    applicable: false,
                    reason: "No Duty Drawback rate found for this HSN code"
                });
            }
        }

        // Calculate average rate
        const totalFOB = shippingBill.fob_value;
        const averageRate = totalFOB > 0 ? (totalDrawbackAmount / totalFOB) * 100 : 0;

        return NextResponse.json({
            shipping_bill_id: shippingBill.id,
            shipping_bill_number: shippingBill.sb_number,
            sb_date: shippingBill.sb_date,
            buyer: shippingBill.export_orders?.entities?.name,
            order_number: shippingBill.export_orders?.order_number,
            total_fob_value: totalFOB,
            currency: shippingBill.currency_code,
            items: itemsWithDrawback,
            total_drawback_amount: Math.round(totalDrawbackAmount * 100) / 100,
            average_drawback_rate: Math.round(averageRate * 100) / 100,
            calculated_at: new Date().toISOString()
        });

    } catch (error: any) {
        console.error("Duty Drawback calculation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
