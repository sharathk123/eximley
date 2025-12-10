
import { createAdminClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, Database, Layers } from "lucide-react";

export default async function AdminPage() {
    const supabase = createAdminClient();

    // Parallel fetching for performance
    const [
        { count: companyCount },
        { count: userCount },
        { count: hsnCount },
        { count: embeddingCount }
    ] = await Promise.all([
        supabase.from("companies").select("*", { count: 'exact', head: true }),
        supabase.from("user_profiles").select("*", { count: 'exact', head: true }),
        supabase.from("itc_gst_hsn_mapping").select("*", { count: 'exact', head: true }),
        supabase.from("itc_gst_hsn_embeddings").select("*", { count: 'exact', head: true })
    ]);

    const stats = [
        {
            title: "Total Companies",
            value: companyCount || 0,
            icon: Building2,
            desc: "Registered entities",
            color: "text-blue-600 dark:text-blue-400",
            bg: "bg-blue-100 dark:bg-blue-900/20"
        },
        {
            title: "Total Users",
            value: userCount || 0,
            icon: Users,
            desc: "Active user profiles",
            color: "text-indigo-600 dark:text-indigo-400",
            bg: "bg-indigo-100 dark:bg-indigo-900/20"
        },
        {
            title: "HSN Codes",
            value: hsnCount || 0,
            icon: Database,
            desc: "Master classification records",
            color: "text-green-600 dark:text-green-400",
            bg: "bg-green-100 dark:bg-green-900/20"
        },
        {
            title: "Embeddings",
            value: embeddingCount || 0,
            icon: Layers,
            desc: "Vector search indices",
            color: "text-purple-600 dark:text-purple-400",
            bg: "bg-purple-100 dark:bg-purple-900/20"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-foreground tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back, Super Admin. Here's what's happening today.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="border-border shadow-sm hover:shadow-md transition-shadow bg-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-full ${stat.bg}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-foreground">{stat.value.toLocaleString()}</div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.desc}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Actions or Recent Activity could go here */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border shadow-sm bg-card">
                    <CardHeader>
                        <CardTitle className="text-lg text-foreground">System Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                                <span className="text-muted-foreground">Database Connection</span>
                                <span className="text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span> Operational
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
                                <span className="text-muted-foreground">Vector Search</span>
                                <span className={embeddingCount && embeddingCount > 0 ? "text-green-600 dark:text-green-400 font-medium flex items-center gap-1" : "text-yellow-600 dark:text-yellow-400 font-medium flex items-center gap-1"}>
                                    <span className={`w-2 h-2 ${embeddingCount && embeddingCount > 0 ? "bg-green-500" : "bg-yellow-500"} rounded-full`}></span>
                                    {embeddingCount && embeddingCount > 0 ? "Active" : "No Vectors Index"}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm pb-2">
                                <span className="text-muted-foreground">Environment</span>
                                <span className="text-foreground font-medium">Production (V 1.1)</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
