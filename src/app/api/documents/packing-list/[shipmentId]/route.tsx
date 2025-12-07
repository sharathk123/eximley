import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { PackingList } from "@/components/documents/PackingList";

export async function GET(
    request: Request,
    { params }: { params: { shipmentId: string } }
) {
    const supabase = await createSessionClient();

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch shipment with all related data
        const { data: shipment, error: shipmentError } = await supabase
            .from("shipments")
            .select(`
        *,
        export_orders!order_id (
          *,
          entities!buyer_id (*)
        ),
        shipment_items (
          *,
          order_items (
            *,
            skus (*)
          )
        )
      `)
            .eq("id", params.shipmentId)
            .single();

        if (shipmentError || !shipment) {
            return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
        }

        // Fetch company profile
        const { data: company } = await supabase
            .from("companies")
            .select("*")
            .limit(1)
            .single();

        // Generate PDF
        const stream = await renderToStream(
            <PackingList
                shipment={shipment}
                order={shipment.export_orders}
                company={company}
                buyer={shipment.export_orders?.entities}
            />
        );

        return new Response(stream as any, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Packing-List-${shipment.shipment_number}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error("PDF Generation Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
