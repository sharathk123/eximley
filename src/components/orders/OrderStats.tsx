"use client";

import { FileText, TrendingUp } from "lucide-react";

interface OrderStatsProps {
    orders: any[];
}

export function OrderStats({ orders }: OrderStatsProps) {
    const confirmedRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.total_amount) : 0), 0);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="bg-card p-4 rounded-md border shadow-sm flex items-center gap-4">
                <div className="p-3 bg-accent rounded-full"><FileText className="h-6 w-6 text-primary" /></div>
                <div>
                    <div className="text-sm text-muted-foreground">Total Orders</div>
                    <div className="text-2xl font-bold">{orders.length}</div>
                </div>
            </div>
            <div className="bg-card p-4 rounded-md border shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full"><TrendingUp className="h-6 w-6 text-green-600" /></div>
                <div>
                    <div className="text-sm text-muted-foreground">Confirmed Revenue</div>
                    <div className="text-2xl font-bold">
                        {confirmedRevenue.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}
                    </div>
                </div>
            </div>
        </div>
    );
}
