import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface ViewToggleProps {
    viewMode: "list" | "card";
    setViewMode: (mode: "list" | "card") => void;
}

export function ViewToggle({ viewMode, setViewMode }: ViewToggleProps) {
    return (
        <div className="flex items-center border rounded-md bg-background">
            <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-none ${viewMode === 'card' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('card')}
                title="Card View"
            >
                <LayoutGrid className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button
                variant="ghost"
                size="icon"
                className={`h-9 w-9 rounded-none ${viewMode === 'list' ? 'bg-muted' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
            >
                <List className="h-4 w-4" />
            </Button>
        </div>
    );
}
