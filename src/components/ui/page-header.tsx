import React from 'react';
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode; // For actions/buttons
    className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row justify-between items-start md:items-center gap-4", className)}>
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{title}</h2>
                {description && (
                    <p className="text-muted-foreground mt-1">{description}</p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    );
}
