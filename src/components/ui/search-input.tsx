import { Search } from "lucide-react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    placeholder?: string;
    className?: string;
}

/**
 * Standard search input with icon
 * Provides consistent search experience across all modules
 */
export function SearchInput({
    value,
    onChange,
    placeholder = "Search...",
    className,
    'aria-label': ariaLabel,
    ...props
}: SearchInputProps) {
    return (
        <div className={cn("relative w-full max-w-md", className)}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder={placeholder}
                className="pl-9"
                value={value}
                onChange={onChange}
                aria-label={ariaLabel || placeholder}
                {...props}
            />
        </div>
    );
}
