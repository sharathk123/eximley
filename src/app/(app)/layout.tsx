import { createSessionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";
import {
    LayoutDashboard,
    Package,
    FileText,
    Settings,
    Tags,
    Calculator,
    Users,
    Box,
    Mail,
    FileCheck
} from "lucide-react";

export default async function AppLayout({
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

    return (
        <div className="flex h-screen bg-muted font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-r hidden md:flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-primary">Eximley</h1>
                </div>
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                    <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
                    <NavItem href="/products" icon={<Box className="w-5 h-5" />} label="Products" />
                    <NavItem href="/entities" icon={<Users className="w-5 h-5" />} label="Entities" />
                    <NavItem href="/enquiries" icon={<Mail className="w-5 h-5" />} label="Enquiries" />
                    <NavItem href="/quotes" icon={<FileCheck className="w-5 h-5" />} label="Quotes" />
                    <NavItem href="/shipments" icon={<Package className="w-5 h-5" />} label="Shipments" />
                    <NavItem href="/skus" icon={<Tags className="w-5 h-5" />} label="SKU Management" />
                    <NavItem href="/hsn" icon={<FileText className="w-5 h-5" />} label="HSN Codes" />
                    {/* <NavItem href="/calculator" icon={<Calculator className="w-5 h-5"/>} label="Landed Cost" /> */}
                    <NavItem href="/settings/company" icon={<Settings className="w-5 h-5" />} label="Settings" />
                </nav>
                <div className="p-4 border-t space-y-4">
                    <LogoutButton />
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-medium">
                            {user.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-sm font-medium truncate">{user.user_metadata?.full_name || "User"}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {/* Mobile Header (TODO) */}
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
            className="flex items-center gap-3 px-3 py-2 text-foreground rounded-md hover:bg-accent transition-all duration-200 group"
        >
            <span className="text-muted-foreground group-hover:text-primary transition-colors duration-200">{icon}</span>
            <span className="font-medium">{label}</span>
        </Link>
    )
}
