import CompaniesTable from "@/components/admin/CompaniesTable";

export default function AdminCompaniesPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Company Management</h1>
                {/* Could add filters here later */}
            </div>

            <CompaniesTable />
        </div>
    );
}
