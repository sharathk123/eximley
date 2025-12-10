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
        redirect("/login?code=session_expired");
    }

    // Strict Check for Super Admin
    // Use limit(1) to avoid error if user has multiple super-admin entries (e.g. multi-company)
    const { data: superUsers, error } = await supabase
        .from("company_users")
        .select("is_super_admin")
        .eq("user_id", user.id)
        .eq("is_super_admin", true)
        .limit(1);

    if (error || !superUsers || superUsers.length === 0) {
        // Not a super admin -> Redirect to normal dashboard or 403 page
        // For now, redirect to dashboard (if they are a normal user) or login
        redirect("/dashboard");
    }

    return (
        <div className="flex h-screen bg-muted font-sans">
            {/* Admin Sidebar */}
            <aside className="w-64 bg-card border-r hidden md:flex flex-col shadow-none">
                <div className="p-6 border-b">
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-6 h-6" />
                        <h1 className="text-xl font-bold tracking-tight">Super Admin</h1>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <NavItem href="/admin" icon={<LayoutDashboard className="w-5 h-5" />} label="Overview" />
                    <NavItem href="/admin/companies" icon={<Building2 className="w-5 h-5" />} label="Companies" />
                    <NavItem href="/admin/hsn" icon={<FileText className="w-5 h-5" />} label="ITC-HS & GST Registry" />
                </nav>

                <div className="p-4 border-t mt-auto space-y-4">
                    <LogoutButton />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate text-foreground">{user.email}</p>
                            <p className="text-xs text-muted-foreground truncate">Super Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
                <header className="bg-background border-b h-16 flex items-center px-8 shadow-sm justify-between sticky top-0 z-10">
                    <h2 className="text-lg font-semibold text-foreground">Administration Console</h2>
                </header>
                <div className="flex-1 overflow-auto p-6 md:p-8">
                    {/* Global Container for all admin pages */}
                    <div className="max-w-7xl mx-auto w-full">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-3 py-2 text-muted-foreground rounded-md hover:bg-accent hover:text-accent-foreground transition-all duration-200 group"
        >
            <span className="group-hover:text-primary transition-colors duration-200">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}
