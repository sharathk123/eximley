
"use client";

import { useEffect, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

type Incoterm = {
    code: string;
    name: string;
    description: string;
};

interface IncotermSelectProps {
    form: UseFormReturn<any>;
    name: string; // "incoterm" or similar
    label?: string;
    placeholder?: string;
    disabled?: boolean;
}

export function IncotermSelect({ form, name, label = "Incoterm", placeholder = "Select Incoterm", disabled }: IncotermSelectProps) {
    const [incoterms, setIncoterms] = useState<Incoterm[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchIncoterms = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/incoterms");
                const data = await res.json();
                if (data.incoterms) {
                    setIncoterms(data.incoterms);
                }
            } catch (error) {
                console.error("Failed to fetch incoterms:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchIncoterms();
    }, []);

    return (
        <FormField
            control={form.control}
            name={name}
            render={({ field }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={disabled || loading}
                    >
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder={placeholder} />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {incoterms.map((term) => (
                                <SelectItem key={term.code} value={term.code} title={term.description}>
                                    <span className="font-medium">{term.code}</span> - {term.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}
