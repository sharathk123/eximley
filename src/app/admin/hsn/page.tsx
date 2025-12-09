import HSNTable from "@/components/admin/HSNTable";
import HSNIngest from "@/components/admin/HSNIngest";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, FileUp } from "lucide-react";

export default function AdminHSNPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ITC-HSN Master List</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage global HSN codes and generate semantic embeddings.</p>
                </div>
            </div>

            <Tabs defaultValue="list" className="w-full">
                <TabsList className="bg-slate-100 p-1 rounded-lg mb-6 border border-slate-200">
                    <TabsTrigger value="list" className="flex items-center gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <Database className="w-4 h-4" />
                        Master List
                    </TabsTrigger>
                    <TabsTrigger value="ingest" className="flex items-center gap-2 px-4 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <FileUp className="w-4 h-4" />
                        Generate Embeddings
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
