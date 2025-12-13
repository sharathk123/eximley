
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
                        Found {candidates.length} potential matches for <span className="font-medium">{product?.name}</span>.
                        Please select the correct code for Export/GST compliance.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    {candidates.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground bg-muted rounded">
                            No strong matches found. Please try adding more description to your product.
                        </div>
                    )}

                    {candidates
                        .sort((a, b) => b.similarity - a.similarity)
                        .map((cand, idx) => {
                            const score = cand.similarity * 100;
                            const confidence = score.toFixed(0);

                            // Professional Color Tiers
                            let tierClass = "bg-slate-50 border-slate-200";
                            let textClass = "text-slate-600";
                            let badgeClass = "bg-slate-100 text-slate-700 hover:bg-slate-200";
                            let label = "Low Match";

                            if (score >= 80) {
                                tierClass = "bg-emerald-50/50 border-emerald-100";
                                textClass = "text-emerald-700";
                                badgeClass = "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200";
                                label = "Excellent Match";
                            } else if (score >= 60) {
                                tierClass = "bg-primary/5 border-primary/10";
                                textClass = "text-primary";
                                badgeClass = "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20";
                                label = "Good Match";
                            } else if (score >= 40) {
                                tierClass = "bg-amber-50/30 border-amber-100";
                                textClass = "text-amber-700";
                                badgeClass = "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200";
                                label = "Fair Match";
                            }

                            return (
                                <div
                                    key={idx}
                                    className={`p-4 border rounded-lg transition-all hover:shadow-sm flex gap-4 items-start ${tierClass}`}
                                >
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge variant="outline" className="font-mono text-xs font-normal">
                                                ITC: {cand.itc_hs_code}
                                            </Badge>
                                            <Badge variant="outline" className="font-mono text-xs font-normal">
                                                GST: {cand.gst_hsn_code}
                                            </Badge>

                                            {cand.govt_published_date && (
                                                <Badge variant="secondary" className="text-[10px] font-normal">
                                                    {new Date(cand.govt_published_date).toLocaleDateString()}
                                                </Badge>
                                            )}

                                            <Badge variant="outline" className={`text-[10px] font-medium border ${badgeClass}`}>
                                                {label} ({confidence}%)
                                            </Badge>
                                        </div>

                                        <div>
                                            <p className="text-sm font-medium text-foreground">{cand.commodity}</p>
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-3 leading-relaxed">{cand.description}</p>
                                        </div>
                                    </div>

                                    <Button
                                        size="sm"
                                        className="shrink-0"
                                        variant="outline"
                                        onClick={() => handleSelect(cand)}
                                        disabled={loading}
                                    >
                                        Select
                                    </Button>
                                </div>
                            )
                        })}
                </div>
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t">
                    <p className="text-[10px] text-muted-foreground text-center italic">
                        Note: This is a pilot feature. Results may not be fully accurate. Please verify before selection.
                    </p>
                    <div className="flex justify-end">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
