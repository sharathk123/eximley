import React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface FormSectionProps {
    title?: string;
    description?: string;
    children: React.ReactNode;
    columns?: 1 | 2 | 3;
    className?: string;
}

/**
 * FormSection - Standardized form section with Card layout
 * 
 * Groups related form fields with optional title and description.
 * Provides responsive grid layouts for field arrangement.
 * 
 * @param title - Optional section title
 * @param description - Optional section description
 * @param columns - Number of columns for responsive grid layout
 *   - 1: Single column (default)
 *   - 2: Two columns on desktop, single on mobile
 *   - 3: Three columns on desktop, single on mobile
 * 
 * @example
 * // Simple section without header
 * <FormSection columns={2}>
 *   <FormField ... />
 *   <FormField ... />
 * </FormSection>
 * 
 * @example
 * // Section with title and description
 * <FormSection 
 *   title="Contact Information" 
 *   description="Enter customer contact details"
 *   columns={2}
 * >
 *   <FormField ... />
 *   <FormField ... />
 * </FormSection>
 */
export function FormSection({
    title,
    description,
    children,
    columns = 1,
    className
}: FormSectionProps) {
    const gridClasses = {
        1: "grid grid-cols-1 gap-4",
        2: "grid grid-cols-1 md:grid-cols-2 gap-4",
        3: "grid grid-cols-1 md:grid-cols-3 gap-4"
    };

    return (
        <Card>
            {(title || description) && (
                <CardHeader>
                    {title && <CardTitle>{title}</CardTitle>}
                    {description && <CardDescription>{description}</CardDescription>}
                </CardHeader>
            )}
            <CardContent className={cn(gridClasses[columns], className)}>
                {children}
            </CardContent>
        </Card>
    );
}
