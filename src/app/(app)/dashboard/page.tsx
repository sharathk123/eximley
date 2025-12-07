"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Package, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface DashboardData {
    stats: {
        total: number;
        active: number;
        pending: number;
    };
    recent: any[];
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

    if (!data) return <div className="text-red-500">Failed to load dashboard data.</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                <Link href="/shipments/new">
                    <Button>New Shipment</Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="shadow-sm hover:shadow-stripe transition-all duration-200 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Shipments</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.total}</div>
                        <p className="text-xs text-muted-foreground">Lifetime</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-stripe transition-all duration-200 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.active}</div>
                        <p className="text-xs text-muted-foreground">In transit</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm hover:shadow-stripe transition-all duration-200 cursor-pointer">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.pending}</div>
                        <p className="text-xs text-muted-foreground">Requires attention</p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Shipments */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Recent Shipments</CardTitle>
                </CardHeader>
                <CardContent>
                    {data.recent.length === 0 ? (
                        <div className="text-center py-10 text-muted-foreground">
                            <p className="mb-4">No recent activity.</p>
                            <Link href="/shipments/new">
                                <Button variant="outline">Create your first shipment</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {data.recent.map((shipment: any) => (
                                <div key={shipment.id} className="flex justify-between items-center border-b last:border-0 pb-3 last:pb-0">
                                    <div>
                                        <div className="font-semibold text-foreground">{shipment.reference_no || "No Ref"}</div>
                                        <div className="text-sm text-muted-foreground">{shipment.buyer_name || "Unknown Buyer"} • {shipment.status || "Draft"}</div>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{new Date(shipment.created_at).toLocaleDateString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
