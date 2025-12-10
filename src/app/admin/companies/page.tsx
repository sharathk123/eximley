import CompaniesTable from "@/components/admin/CompaniesTable";

export default function AdminCompaniesPage() {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center pb-4 border-b border-border">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Company Management</h1>
                    <p className="text-muted-foreground mt-2">Manage registered importers and exporters.</p>
                </div>
                {/* Could add filters here later */}
            </div>

            <CompaniesTable />
        </div>
    );
}
