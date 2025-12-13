import { createSessionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NotificationBell } from "@/components/shared/NotificationBell";
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
    FileCheck,
    ScrollText,
    ClipboardList,
    ShoppingCart,
    TrendingUp,
    Banknote,
    Scale,
    Menu,
    FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

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
        redirect("/login?code=session_expired");
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

                    {/* Export Lifecycle */}
                    <NavItem href="/enquiries" icon={<Mail className="w-5 h-5" />} label="Enquiries" />
                    <NavItem href="/quotes" icon={<FileCheck className="w-5 h-5" />} label="Quotes" />
                    <NavItem href="/invoices/proforma" icon={<ScrollText className="w-5 h-5" />} label="Proforma Invoices" />
                    <NavItem href="/orders" icon={<ClipboardList className="w-5 h-5" />} label="Export Orders" />
                    <NavItem href="/purchase-orders" icon={<ShoppingCart className="w-5 h-5" />} label="Purchase Orders" />
                    <NavItem href="/shipments" icon={<Package className="w-5 h-5" />} label="Shipments" />
                    <NavItem href="/shipping-bills" icon={<FileCheck className="w-5 h-5" />} label="Shipping Bills" />
                    <NavItem href="/brcs" icon={<Banknote className="w-5 h-5" />} label="e-BRC" />
                    <NavItem href="/incentives" icon={<TrendingUp className="w-5 h-5" />} label="Incentives" />
                    <NavItem href="/compliance/lut" icon={<Scale className="w-5 h-5" />} label="LUT Management" />

                    {/* Master Data */}
                    <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Documents</div>
                    <NavItem href="/documents" icon={<FolderOpen className="w-5 h-5" />} label="Document Library" />

                    {/* Master Data */}
                    <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Masters</div>
                    <NavItem href="/products" icon={<Box className="w-5 h-5" />} label="Products" />
                    <NavItem href="/entities" icon={<Users className="w-5 h-5" />} label="Entities" />
                    <NavItem href="/skus" icon={<Tags className="w-5 h-5" />} label="SKU Management" />

                    {/* Reference & Settings */}
                    <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">System</div>
                    <NavItem href="/hsn" icon={<FileText className="w-5 h-5" />} label="ITC-HSN Lookup" />
                    {/* <NavItem href="/calculator" icon={<Calculator className="w-5 h-5"/>} label="Landed Cost" /> */}
                    <NavItem href="/settings/company" icon={<Settings className="w-5 h-5" />} label="Settings" />
                </nav>
                <div className="p-4 border-t space-y-4">
                    <div className="flex items-center justify-between">
                        {/* <NotificationBell /> */}
                        <LogoutButton />
                    </div>
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
                {/* Mobile Header */}
                <MobileHeader user={user} />
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

function MobileHeader({ user }: { user: any }) {
    return (
        <div className="md:hidden bg-card border-b p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">Eximley</h1>
            <div className="flex items-center gap-2">
                {/* <NotificationBell /> */}
                <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <Menu className="h-6 w-6" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                        <SheetHeader className="p-6 border-b">
                            <SheetTitle className="text-2xl font-bold text-primary">Eximley</SheetTitle>
                        </SheetHeader>
                        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                            <NavItem href="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Dashboard" />
                            <NavItem href="/enquiries" icon={<Mail className="w-5 h-5" />} label="Enquiries" />
                            <NavItem href="/quotes" icon={<FileCheck className="w-5 h-5" />} label="Quotes" />
                            <NavItem href="/invoices/proforma" icon={<ScrollText className="w-5 h-5" />} label="Proforma Invoices" />
                            <NavItem href="/orders" icon={<ClipboardList className="w-5 h-5" />} label="Export Orders" />
                            <NavItem href="/purchase-orders" icon={<ShoppingCart className="w-5 h-5" />} label="Purchase Orders" />
                            <NavItem href="/shipments" icon={<Package className="w-5 h-5" />} label="Shipments" />
                            <NavItem href="/shipping-bills" icon={<FileCheck className="w-5 h-5" />} label="Shipping Bills" />
                            <NavItem href="/brcs" icon={<Banknote className="w-5 h-5" />} label="e-BRC" />
                            <NavItem href="/incentives" icon={<TrendingUp className="w-5 h-5" />} label="Incentives" />
                            <NavItem href="/compliance/lut" icon={<Scale className="w-5 h-5" />} label="LUT Management" />

                            <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Documents</div>
                            <NavItem href="/documents" icon={<FolderOpen className="w-5 h-5" />} label="Document Library" />

                            <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">Masters</div>
                            <NavItem href="/products" icon={<Box className="w-5 h-5" />} label="Products" />
                            <NavItem href="/entities" icon={<Users className="w-5 h-5" />} label="Entities" />
                            <NavItem href="/skus" icon={<Tags className="w-5 h-5" />} label="SKU Management" />

                            <div className="pt-2 pb-1 px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-wider">System</div>
                            <NavItem href="/hsn" icon={<FileText className="w-5 h-5" />} label="ITC-HSN Lookup" />
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
                    </SheetContent>
                </Sheet>
            </div>
            );
}
