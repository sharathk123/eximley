"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Clock, ShieldAlert } from "lucide-react";

type Company = {
    id: string;
    legal_name: string;
    email: string | null;
    status: "active" | "inactive" | "pending";
    created_at: string;
    phone: string | null;
    city: string | null;
    country: string | null;
};

export default function CompaniesTable() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const res = await fetch("/api/admin/companies");
            if (!res.ok) throw new Error("Failed to fetch companies");
            const data = await res.json();
            setCompanies(data.companies);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (companyId: string, newStatus: string) => {
        setUpdating(companyId);
        try {
            const res = await fetch("/api/admin/companies", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ companyId, status: newStatus }),
            });

            if (!res.ok) throw new Error("Failed to update status");

            await fetchCompanies(); // Refresh list
        } catch (err: any) {
            alert(err.message);
        } finally {
            setUpdating(null);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading companies...</div>;
    if (error) return <div className="p-8 text-center text-red-500">Error: {error}</div>;

    return (
        <div className="bg-white shadow rounded-lg overflow-hidden border border-slate-200">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                        <tr>
                            <th className="px-6 py-3">Company</th>
                            <th className="px-6 py-3">Contact</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Joined</th>
                            <th className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {companies.map((company) => (
                            <tr key={company.id} className="bg-white border-b hover:bg-slate-50">
                                <td className="px-6 py-4 font-medium text-slate-900">
                                    <div className="flex flex-col">
                                        <span className="text-base">{company.legal_name}</span>
                                        <span className="text-xs text-slate-400 font-normal">{company.city}, {company.country}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col text-slate-500">
                                        <span>{company.email}</span>
                                        <span className="text-xs">{company.phone}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusBadge status={company.status} />
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                    {new Date(company.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 space-x-2">
                                    {company.status === "pending" && (
                                        <>
                                            <ActionBtn
                                                onClick={() => updateStatus(company.id, "active")}
                                                disabled={updating === company.id}
                                                className="text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                            >
                                                Approve
                                            </ActionBtn>
                                            <ActionBtn
                                                onClick={() => updateStatus(company.id, "inactive")}
                                                disabled={updating === company.id}
                                                className="text-red-600 hover:bg-red-50 border-red-200"
                                            >
                                                Reject
                                            </ActionBtn>
                                        </>
                                    )}
                                    {company.status === "active" && (
                                        <ActionBtn
                                            onClick={() => updateStatus(company.id, "inactive")}
                                            disabled={updating === company.id}
                                            className="text-amber-600 hover:bg-amber-50 border-amber-200"
                                        >
                                            Deactivate
                                        </ActionBtn>
                                    )}
                                    {company.status === "inactive" && (
                                        <ActionBtn
                                            onClick={() => updateStatus(company.id, "active")}
                                            disabled={updating === company.id}
                                            className="text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                        >
                                            Activate
                                        </ActionBtn>
                                    )}
                                </td>
                            </tr>
                        ))}

                        {companies.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                    No companies found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800"><CheckCircle className="w-3 h-3" /> Active</span>
    }
    if (status === 'pending') {
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><Clock className="w-3 h-3" /> Pending</span>
    }
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><XCircle className="w-3 h-3" /> Inactive</span>
}

function ActionBtn({ children, onClick, disabled, className }: any) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`px-3 py-1 rounded border text-xs font-medium transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            {children}
        </button>
    )
}
