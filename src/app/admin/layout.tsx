import { createSessionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton"; // Assuming this handles sign out
import {
    LayoutDashboard,
    Building2,
    FileText,
    LogOut,
    ShieldCheck
} from "lucide-react";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createSessionClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Strict Check for Super Admin
    const { data: superUser, error } = await supabase
        .from("company_users")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .eq("is_super_admin", true)
        .single();

    if (error || !superUser) {
        // Not a super admin -> Redirect to normal dashboard or 403 page
        // For now, redirect to dashboard (if they are a normal user) or login
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen bg-muted font-sans text-slate-900">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
                <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-green-400" />
                    <div>
                        <h1 className="text-xl font-bold tracking-wide">Super Admin</h1>
                        <p className="text-xs text-slate-400">Eximley Global</p>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
                    <NavItem href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} label="Overview" />
                    <NavItem href="/admin/companies" icon={<Building2 className="w-5 h-5" />} label="Companies" />
                    <NavItem href="/admin/hsn" icon={<FileText className="w-5 h-5" />} label="ITC-HSN Master List" />
                </nav>

                <div className="p-4 border-t border-slate-700 bg-slate-950/50">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="h-8 w-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate text-white">{user.email}</p>
                            <p className="text-xs text-green-400 truncate">Super Admin</p>
                        </div>
                    </div>
                    {/* Reuse Logout Button or custom one */}
                    <div className="w-full">
                        <LogoutButton />
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                <header className="bg-white border-b h-16 flex items-center px-8 shadow-sm justify-between">
                    <h2 className="text-lg font-semibold text-slate-700">Administration Console</h2>
                </header>
                <div className="flex-1 overflow-auto p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition-all duration-200 group"
        >
            <span className="text-slate-400 group-hover:text-green-400 transition-colors duration-200">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}
