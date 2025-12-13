import React from "react";
import { cn } from "@/lib/utils";

interface FormContainerProps {
    children: React.ReactNode;
    onSubmit: (e: React.FormEvent) => void;
    spacing?: "sm" | "md" | "lg";
    className?: string;
}

/**
 * FormContainer - Standardized form wrapper
 * 
 * Provides consistent spacing and structure for forms across the application.
 * 
 * @param spacing - Controls vertical spacing between form elements
 *   - sm: space-y-4 (for compact forms)
 *   - md: space-y-6 (default, for standard forms)
 *   - lg: space-y-8 (for large, complex forms)
 * 
 * @example
 * <FormContainer onSubmit={form.handleSubmit(onSubmit)} spacing="md">
 *   <FormSection columns={2}>
 *     <FormField ... />
 *     <FormField ... />
 *   </FormSection>
 * </FormContainer>
 */
export function FormContainer({
    children,
    onSubmit,
    spacing = "md",
    className
}: FormContainerProps) {
    const spacingClasses = {
        sm: "space-y-4",
        md: "space-y-6",
        lg: "space-y-8"
    };

    return (
        <form
            onSubmit={onSubmit}
            className={cn(spacingClasses[spacing], className)}
        >
            {children}
        </form>
    );
}
