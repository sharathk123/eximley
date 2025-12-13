"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Package, TrendingUp, AlertCircle, FileText, ClipboardCheck, ArrowRight, DollarSign, Ship, Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";

interface DashboardData {
    stats: {
        total_shipments: number;
        active_shipments: number;
        active_quotes: number;
        pending_orders: number;
        total_enquiries: number;
        new_enquiries: number;
        won_enquiries: number;
        monthly_revenue: number;
        pending_brcs: number;
        commercial_invoices: number;
        pending_approvals: number;
        sea_shipments: number;
        air_shipments: number;
        insured_shipments: number;
    };
    recent_shipments: any[];
    recent_orders: any[];
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasProducts, setHasProducts] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);

    useEffect(() => {
        // Fetch dashboard data
        fetch("/api/dashboard", { cache: "no-store" })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch");
                return res.json();
            })
            .then((data) => setData(data))
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));

        // Check if user has products
        fetch("/api/products?limit=1")
            .then((res) => res.json())
            .then((data) => {
                const productCount = data.products?.length || 0;
                setHasProducts(productCount > 0);
                setShowOnboarding(productCount === 0);
            })
            .catch((err) => console.error(err));
    }, []);

    if (loading) {
        return <LoadingState message="Loading dashboard..." />;
    }

    if (!data) return <div className="text-destructive">Failed to load dashboard data.</div>;

    return (
        <PageContainer>
            <PageHeader
                title="Dashboard"
                description="Overview of your trade operations."
            >
                <Link href="/quotes">
                    <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> New Quote</Button>
                </Link>
                <Link href="/shipments/new">
                    <Button><Package className="mr-2 h-4 w-4" /> New Shipment</Button>
                </Link>
            </PageHeader>

            {/* Onboarding Banner for New Users */}
            {showOnboarding && (
                <Card className="border-primary/20 bg-primary/5 shadow-md">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 rounded-full">
                                <Package className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-foreground mb-2">
                                    Welcome to Eximley! Let's get you started 🎉
                                </h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    To begin managing your export operations, you'll need to set up your product catalog first.
                                    Follow these steps to get started:
                                </p>
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">1</div>
                                        <span className="font-medium">Create Products</span>
                                        <span className="text-muted-foreground">- Add your main product catalog items</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">2</div>
                                        <span className="font-medium">Add SKUs</span>
                                        <span className="text-muted-foreground">- Create variants with HSN codes, pricing, and specifications</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">3</div>
                                        <span className="font-medium">Start Trading</span>
                                        <span className="text-muted-foreground">- Create quotes, orders, and shipping bills</span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Link href="/products">
                                        <Button>
                                            <Package className="mr-2 h-4 w-4" />
                                            Set Up Products Now
                                        </Button>
                                    </Link>
                                    <Button variant="outline" onClick={() => setShowOnboarding(false)}>
                                        Dismiss
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Dashboard Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/enquiries">
                    <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200 cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.stats.total_enquiries}</div>
                            <p className="text-xs text-muted-foreground">
                                {data.stats.new_enquiries} new, {data.stats.won_enquiries} won
                            </p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/quotes?status=sent">
                    <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200 cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Quotes</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.stats.active_quotes}</div>
                            <p className="text-xs text-muted-foreground">Drafts & Sent quotes</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/orders?status=confirmed">
                    <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200 cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.stats.pending_orders}</div>
                            <p className="text-xs text-muted-foreground">Confirmed & In Production</p>
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/shipments?status=shipped">
                    <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200 cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Shipments</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{data.stats.active_shipments}</div>
                            <p className="text-xs text-muted-foreground">
                                of {data.stats.total_shipments} total shipments
                            </p>
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Financial & Compliance Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                        <DollarSign className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary">${(data.stats.monthly_revenue / 1000).toFixed(1)}K</div>
                        <p className="text-xs text-muted-foreground">Export value this month</p>
                    </CardContent>
                </Card>

                <Link href="/quotes?status=converted">
                    <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200 cursor-pointer">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                            <AlertCircle className="h-4 w-4 text-destructive" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{data.stats.pending_approvals}</div>
                            <p className="text-xs text-muted-foreground">Proformas awaiting review</p>
                        </CardContent>
                    </Card>
                </Link>

                <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Commercial Invoices</CardTitle>
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{data.stats.commercial_invoices}</div>
                        <p className="text-xs text-muted-foreground">Converted from Proforma</p>
                    </CardContent>
                </Card>

                <Card className="shadow-stripe hover:shadow-stripe-lg transition-all duration-200">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending BRCs</CardTitle>
                        <FileText className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{data.stats.pending_brcs}</div>
                        <p className="text-xs text-muted-foreground">Bank realization pending</p>
                    </CardContent>
                </Card>
            </div>

            {/* Shipping Insights */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Shipping Insights</CardTitle>
                    <CardDescription>Transport modes and insurance coverage</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="p-2 bg-blue-100 rounded">
                                <Ship className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data.stats.sea_shipments}</div>
                                <div className="text-xs text-muted-foreground">Sea Shipments</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="p-2 bg-sky-100 rounded">
                                <Package className="h-5 w-5 text-sky-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data.stats.air_shipments}</div>
                                <div className="text-xs text-muted-foreground">Air Shipments</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                            <div className="p-2 bg-green-100 rounded">
                                <Shield className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{data.stats.insured_shipments}</div>
                                <div className="text-xs text-muted-foreground">Insured (CIF/CIP)</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

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
                    <CardContent className="pt-6">
                        {data.recent_orders.length === 0 ? (
                            <EmptyState
                                icon={ClipboardCheck}
                                title="No orders yet"
                                description="Your recent orders will appear here."
                                className="py-6"
                            />
                        ) : (
                            <div className="space-y-3">
                                {data.recent_orders.map((order: any) => (
                                    <div
                                        key={order.id}
                                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-sm">{order.order_number}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <span className="text-sm text-muted-foreground capitalize">
                                            {order.status}
                                        </span>
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
                            <EmptyState
                                icon={Package}
                                title="No shipments yet"
                                description="Your recent shipments will appear here."
                                className="py-6"
                            />
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
        </PageContainer>
    );
}
