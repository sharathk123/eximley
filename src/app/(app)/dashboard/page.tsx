"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Package, TrendingUp, AlertCircle, FileText, ClipboardCheck, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface DashboardData {
    stats: {
        total_shipments: number;
        active_shipments: number;
        active_quotes: number;
        pending_orders: number;
    };
    recent_shipments: any[];
    recent_orders: any[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/dashboard")
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
            })
            .then((data) => setData(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>;
    }

    if (!data) return <div className="text-destructive">Failed to load dashboard data.</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                    <p className="text-muted-foreground">Overview of your trade operations.</p>
                </div>
                <div className="flex gap-2">
                    <Link href="/quotes">
                        <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> New Quote</Button>
                    </Link>
                    <Link href="/shipments/new">
                        <Button><Package className="mr-2 h-4 w-4" /> New Shipment</Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">

                {/* Active Quotes */}
                <Card className="shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                        <FileText className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_quotes}</div>
                        <p className="text-xs text-muted-foreground">Draft or Negotiation</p>
                    </CardContent>
                </Card>

                {/* Pending Orders */}
                <Card className="shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                        <ClipboardCheck className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.pending_orders}</div>
                        <p className="text-xs text-muted-foreground">Confirmed & In Production</p>
                    </CardContent>
                </Card>

                {/* Active Shipments */}
                <Card className="shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active_shipments}</div>
                        <p className="text-xs text-muted-foreground">In Transit</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
                {/* Recent Orders */}
                <Card className="shadow-sm col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Orders</CardTitle>
                            <CardDescription>Latest confirmed export orders</CardDescription>
                        </div>
                        <Link href="/orders">
                            <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3 w-3" /></Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data.recent_orders.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm">No recent orders found.</div>
                        ) : (
                            <div className="space-y-4">
                                {data.recent_orders.map((order: any) => (
                                    <div key={order.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0">
                                        <div>
                                            <div className="font-medium text-sm">{order.order_number}</div>
                                            <div className="text-xs text-muted-foreground">{order.entities?.name || "Unknown Buyer"}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium">{order.currency_code} {order.total_amount?.toLocaleString() || '0'}</div>
                                            <div className="text-xs capitalize text-muted-foreground bg-secondary px-1.5 py-0.5 rounded inline-block mt-1">
                                                {order.status}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Recent Shipments */}
                <Card className="shadow-sm col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Recent Shipments</CardTitle>
                            <CardDescription>Latest export shipments</CardDescription>
                        </div>
                        <Link href="/shipments">
                            <Button variant="ghost" size="sm" className="gap-1">View All <ArrowRight className="h-3 w-3" /></Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {data.recent_shipments.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm">No recent shipments found.</div>
                        ) : (
                            <div className="space-y-4">
                                {data.recent_shipments.map((shipment: any) => (
                                    <div key={shipment.id} className="flex justify-between items-start border-b last:border-0 pb-3 last:pb-0">
                                        <div>
                                            <div className="font-medium text-sm">{shipment.shipment_number || shipment.booking_number}</div>
                                            <div className="text-xs text-muted-foreground">{shipment.carrier || "No Carrier"} • {shipment.vessel_name || "No Vessel"}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm">{new Date(shipment.shipment_date).toLocaleDateString()}</div>
                                            <div className="text-xs capitalize text-muted-foreground bg-secondary px-1.5 py-0.5 rounded inline-block mt-1">
                                                {shipment.status || 'Draft'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
