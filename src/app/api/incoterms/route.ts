
import { createSessionClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createSessionClient();

        // Fetch incoterms
        // If the table doesn't exist yet (before migration), we might want to return a static list or handle error gracefully.
        // For now, we assume the table will be there.
        const { data: incoterms, error } = await supabase
            .from("incoterms")
            .select("*")
            .order("code", { ascending: true });

        if (error) {
            // Fallback for development if migration hasn't run yet
            if (error.code === '42P01') { // undefined_table
                return NextResponse.json({
                    incoterms: [
                        { code: 'EXW', name: 'Ex Works', description: 'Seller makes goods available at their premises.' },
                        { code: 'FCA', name: 'Free Carrier', description: 'Seller delivers goods to a carrier or another person nominated by the buyer.' },
                        { code: 'CPT', name: 'Carriage Paid To', description: 'Seller delivers goods to the carrier and pays for carriage to the named place of destination.' },
                        { code: 'CIP', name: 'Carriage and Insurance Paid To', description: 'Seller delivers goods to the carrier and pays for carriage and insurance to the named place of destination.' },
                        { code: 'DAP', name: 'Delivered at Place', description: 'Seller delivers when the goods are placed at the disposal of the buyer at the named place of destination.' },
                        { code: 'DPU', name: 'Delivered at Place Unloaded', description: 'Seller delivers when the goods, once unloaded, are placed at the disposal of the buyer at a named place of destination.' },
                        { code: 'DDP', name: 'Delivered Duty Paid', description: 'Seller takes all responsibility for transporting the goods to the destination country, clearing customs, and paying duties.' },
                        { code: 'FAS', name: 'Free Alongside Ship', description: 'Seller delivers when the goods are placed alongside the vessel at the named port of shipment.' },
                        { code: 'FOB', name: 'Free on Board', description: 'Seller delivers when the goods are placed on board the vessel nominated by the buyer at the named port of shipment.' },
                        { code: 'CFR', name: 'Cost and Freight', description: 'Seller delivers the goods on board the vessel and pays the costs and freight to bring the goods to the named port of destination.' },
                        { code: 'CIF', name: 'Cost, Insurance and Freight', description: 'Seller delivers the goods on board the vessel and pays the costs, insurance, and freight to bring the goods to the named port of destination.' }
                    ]
                });
            }
            throw error;
        }

        return NextResponse.json({ incoterms });

    } catch (error: any) {
        console.error("GET /api/incoterms error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
