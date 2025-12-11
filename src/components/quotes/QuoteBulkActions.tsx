"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Trash2, X } from "lucide-react";

interface QuoteBulkActionsProps {
    selectedCount: number;
    loading: boolean;
    onApprove: () => void;
    onSend: () => void;
    onDelete: () => void;
    onClearSelection: () => void;
}

export function QuoteBulkActions({
    selectedCount,
    loading,
    onApprove,
    onSend,
    onDelete,
    onClearSelection
}: QuoteBulkActionsProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-foreground text-background px-6 py-3 rounded-full shadow-lg z-50 animate-in slide-in-from-bottom-5">
            <div className="font-medium text-sm whitespace-nowrap">
                {selectedCount} selected
            </div>
            <div className="h-4 w-px bg-background/20" />
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-background/20 hover:text-background text-background h-8"
                    onClick={onApprove}
                    disabled={loading}
                >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Approve
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-background/20 hover:text-background text-background h-8"
                    onClick={onSend}
                    disabled={loading}
                >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Send
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="hover:bg-destructive/90 hover:text-white text-destructive-foreground h-8"
                    onClick={onDelete}
                    disabled={loading}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                </Button>
            </div>
            <div className="h-4 w-px bg-background/20" />
            <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-background/20 hover:text-background text-background rounded-full"
                onClick={onClearSelection}
            >
                <X className="h-4 w-4" />
            </Button>
        </div>
    );
}
