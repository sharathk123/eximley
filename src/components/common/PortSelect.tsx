"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2, Plane, Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Port {
    id: string;
    name: string;
    code: string;
    country: string;
    type: 'sea' | 'air';
}

interface PortSelectProps {
    value?: string;
    onChange: (value: string) => void;
    mode?: string; // Relaxed type to accept string form form
    placeholder?: string;
    disabled?: boolean;
}

export function PortSelect({ value, onChange, mode, placeholder = "Select Port...", disabled }: PortSelectProps) {
    const [open, setOpen] = React.useState(false);
    const [ports, setPorts] = React.useState<Port[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [search, setSearch] = React.useState("");

    // Fetch ports on open or search
    React.useEffect(() => {
        if (!open) return;

        const fetchPorts = async () => {
            setLoading(true);
            try {
                // Map mode to type: SEA -> sea, AIR -> air
                let typeParam = "";
                const modeStr = (mode || "").toUpperCase();
                if (modeStr === 'SEA') typeParam = "&type=sea";
                if (modeStr === 'AIR') typeParam = "&type=air";

                const res = await fetch(`/api/ports?query=${search}${typeParam}`);
                if (res.ok) {
                    const data = await res.json();
                    setPorts(data.ports || []);
                }
            } catch (error) {
                console.error("Failed to search ports", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchPorts, 300); // Debounce
        return () => clearTimeout(timeoutId);
    }, [search, open, mode]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between font-normal"
                    disabled={disabled}
                >
                    {value ? (
                        <span className="truncate">{value}</span>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
                <div className="p-2 border-b">
                    <Input
                        placeholder="Search port..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8"
                        autoFocus
                    />
                </div>
                <ScrollArea className="h-[200px]">
                    {loading ? (
                        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                        </div>
                    ) : ports.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">
                            No ports found.
                        </div>
                    ) : (
                        <div className="p-1">
                            {ports.map((port) => (
                                <div
                                    key={port.id}
                                    className={cn(
                                        "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                        value === port.name && "bg-accent text-accent-foreground"
                                    )}
                                    onClick={() => {
                                        onChange(port.name); // We store the Name, not ID, as requested to replace Input
                                        setOpen(false);
                                    }}
                                >
                                    <div className="mr-2 flex items-center justify-center w-4">
                                        {value === port.name && <Check className="h-4 w-4" />}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium flex items-center gap-2">
                                            {port.type === 'sea' ? <Ship className="h-3 w-3 text-blue-500" /> : <Plane className="h-3 w-3 text-sky-500" />}
                                            {port.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {port.code} • {port.country}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
