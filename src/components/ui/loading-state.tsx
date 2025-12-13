import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingStateProps {
    message?: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

/**
 * Standard loading state component
 * Provides consistent loading indicators across the application
 */
export function LoadingState({ message, className, size = "md" }: LoadingStateProps) {
    const sizeClasses = {
        sm: "h-6 w-6",
        md: "h-8 w-8",
        lg: "h-12 w-12"
    };

    const paddingClasses = {
        sm: "p-6 min-h-[200px]",
        md: "p-12 min-h-[400px]",
        lg: "p-16 min-h-[600px]"
    };

    return (
        <div className={cn(
            "flex flex-col items-center justify-center",
            paddingClasses[size],
            className
        )}>
            <Loader2 className={cn(
                "animate-spin text-primary",
                sizeClasses[size],
                message && "mb-4"
            )} />
            {message && (
                <p className="text-sm text-muted-foreground text-center max-w-md">
                    {message}
                </p>
            )}
        </div>
    );
}
