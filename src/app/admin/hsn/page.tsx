"use client";

import HSNTable from "@/components/admin/HSNTable";
import HSNIngest from "@/components/admin/HSNIngest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, FileUp } from "lucide-react";

export default function AdminHSNPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center pb-4 border-b border-border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">ITC-HS & GST Registry</h1>
                    <p className="text-muted-foreground text-sm mt-1">Manage Indian Trade Classification (ITC-HS) for imports/exports and GST HSN codes for domestic taxation.</p>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="bg-muted p-1 rounded-lg mb-6 border border-border">
                    <TabsTrigger value="list" className="flex items-center gap-2 px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                        <Database className="w-4 h-4" />
                        Master List
                    </TabsTrigger>
                    <TabsTrigger value="ingest" className="flex items-center gap-2 px-4 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
                        <FileUp className="w-4 h-4" />
                        Manage Data
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="animate-in fade-in-50 duration-300">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <HSNTable />
                    </div>
                </TabsContent>

                <TabsContent value="ingest" className="animate-in fade-in-50 duration-300">
                    <div className="py-8">
                        <HSNIngest />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
