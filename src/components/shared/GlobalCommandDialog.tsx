"use client";

import * as React from "react";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Package,
    FileText,
    Truck,
    ClipboardCheck,
    Search,
    PlusCircle,
    Ship
} from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function GlobalCommandDialog() {
    const [open, setOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };

        document.addEventListener("keydown", down);
        return () => document.removeEventListener("keydown", down);
    }, []);

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false);
        command();
    }, []);

    return (
        <CommandDialog open={open} onOpenChange={setOpen}>
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Quick Navigation">
                    <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                        <Calendar className="mr-2 h-4 w-4" />
                        <span>Dashboard</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/quotes"))}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Quotes</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/orders"))}>
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        <span>Orders</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/shipments"))}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>Shipments</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/products"))}>
                        <Package className="mr-2 h-4 w-4" />
                        <span>Products</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/enquiries"))}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Enquiries</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Create New">
                    <CommandItem onSelect={() => runCommand(() => router.push("/quotes"))}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        <span>New Quote</span>
                        <CommandShortcut>⇧Q</CommandShortcut>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/shipments/new"))}>
                        <Ship className="mr-2 h-4 w-4" />
                        <span>New Shipment</span>
                    </CommandItem>
                    <CommandItem onSelect={() => runCommand(() => router.push("/enquiries"))}>
                        <User className="mr-2 h-4 w-4" />
                        <span>New Enquiry</span>
                    </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Settings">
                    <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        <CommandShortcut>⌘S</CommandShortcut>
                    </CommandItem>
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
