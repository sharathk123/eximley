import HSNTable from "@/components/admin/HSNTable";

export default function AdminHSNPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">ITC-HSN Master List</h1>
            </div>

            <HSNTable />
        </div>
    );
}
