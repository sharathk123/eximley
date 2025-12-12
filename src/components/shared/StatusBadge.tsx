/**
 * StatusBadge Component
 * 
 * Reusable status badge component with consistent styling across all modules
 */

import { Badge } from '@/components/ui/badge';
import { getStatusClassName, getStatusLabel } from '@/lib/utils/statusUtils';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
    status: string;
    className?: string;
    variant?: 'default' | 'outline' | 'custom';
}

export function StatusBadge({ status, className, variant = 'custom' }: StatusBadgeProps) {
    if (variant === 'custom') {
        return (
            <Badge className={cn(getStatusClassName(status), className)}>
                {getStatusLabel(status)}
            </Badge>
        );
    }

    return (
        <Badge variant={variant} className={className}>
            {getStatusLabel(status)}
        </Badge>
    );
}
