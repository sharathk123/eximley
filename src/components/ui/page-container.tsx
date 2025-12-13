import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface PageContainerProps {
    children: ReactNode;
    className?: string;
}

/**
 * Standard page container component
 * Provides consistent max-width and spacing for all pages
 */
export function PageContainer({ children, className }: PageContainerProps) {
    return (
        <div className={cn("space-y-6 max-w-7xl mx-auto", className)}>
            {children}
        </div>
    );
}
