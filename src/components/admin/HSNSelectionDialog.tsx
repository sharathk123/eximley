
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface HSNSelectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    candidates: any[]; // Array of HSN candidates
    product: any;
    onSelect: (candidate: any) => void;
}

export function HSNSelectionDialog({ open, onOpenChange, candidates, product, onSelect }: HSNSelectionDialogProps) {
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSelect = async (candidate: any) => {
        setLoading(true);
        try {
            // We manually update the product with the selected HSN
            const res = await fetch("/api/products", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: product.id,
                    hsn_code: candidate.gst_hsn_code,
                    itc_hs_code: candidate.itc_hs_code,
                    hsn_status: 'verified', // User verified it
                    hsn_confidence: candidate.similarity
                })
            });

            if (!res.ok) throw new Error("Failed to update product");

            onSelect(candidate);
            onOpenChange(false);

            toast({
                title: "Product Updated",
                description: `Assigned ITC Code: ${candidate.itc_hs_code}`,
                className: "bg-green-50 border-green-200"
            });

        } catch (e: any) {
            toast({ title: "Error", description: e.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Select HSN Code</DialogTitle>
                    <DialogDescription>
                        AI found {candidates.length} potential matches for <strong>{product?.name}</strong>.
                        Please select the correct code for Export/GST compliance.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {candidates.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground bg-muted rounded">
                            No strong AI matches found. Please try adding more description to your product.
                        </div>
                    )}

                    {candidates
                        .sort((a, b) => b.similarity - a.similarity)
                        .map((cand, idx) => {
                            const confidence = (cand.similarity * 100).toFixed(0);
                            const isHighConfidence = cand.similarity > 0.7;

                            return (
                                <div
                                    key={idx}
                                    className={`p-4 border rounded-lg transition-colors hover:bg-muted/50 flex gap-4 items-start ${isHighConfidence ? 'bg-indigo-50/30 border-indigo-100' : ''}`}
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-blue-700 bg-blue-50">
                                                ITC: {cand.itc_hs_code}
                                            </Badge>
                                            <Badge variant="outline" className="font-mono text-slate-700 bg-slate-50">
                                                GST: {cand.gst_hsn_code}
                                            </Badge>
                                            {isHighConfidence && (
                                                <Badge className="bg-green-600 hover:bg-green-700 text-[10px]">High Match</Badge>
                                            )}
                                            <span className={`text-xs ml-auto font-medium ${isHighConfidence ? 'text-green-600' : 'text-muted-foreground'}`}>
                                                {confidence}% Match
                                            </span>
                                        </div>

                                        <div>
                                            <p className="text-sm font-semibold text-foreground">{cand.commodity}</p>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{cand.description}</p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="shrink-0"
                                        variant={isHighConfidence ? "default" : "secondary"}
                                        onClick={() => handleSelect(cand)}
                                        disabled={loading}
                                    >
                                        Select
                                    </Button>
                                </div>
                            )
                        })}
                </div>
            </DialogContent>
        </Dialog>
    );
}
