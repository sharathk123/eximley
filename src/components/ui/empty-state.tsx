
import React from 'react';
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    iconColor?: string; // Tailwind text color class, e.g., "text-blue-600"
    iconBgColor?: string; // Tailwind bg color class, e.g., "bg-blue-100"
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    iconColor = "text-primary",
    iconBgColor = "bg-primary/10"
}: EmptyStateProps) {
    return (
        <div
            className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center animate-in fade-in-50"
            role="status"
            aria-label={`${title}: ${description}`}
        >
            <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${iconBgColor}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
            </div>
            <h3 className="mt-4 text-lg font-semibold">{title}</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground max-w-sm">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction}>
                    {/* Assuming the icon used in button is usually Plus, but we can make it generic if needed. 
                        For now, keeping it simple text or passed children could be better, but staying consistent with props.
                    */}
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
