"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LayoutTemplate } from 'lucide-react';

interface SaveTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    templateData: any;
    onSuccess?: () => void;
}

export function SaveTemplateDialog({ open, onOpenChange, templateData, onSuccess }: SaveTemplateDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ title: 'Validation Error', description: 'Template name is required', variant: 'destructive' });
            return;
        }

        setLoading(true);
        try {
            // Clean up data to be saved (remove IDs, dates, etc. that shouldn't be in template)
            const cleanData = {
                ...templateData,
                id: undefined,
                quote_number: undefined,
                quote_date: undefined,
                valid_until: undefined,
                created_at: undefined,
                updated_at: undefined,
                status: undefined,
                items: templateData.items?.map((item: any) => ({
                    sku_id: item.sku_id,
                    product_name: item.product_name,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percent: item.discount_percent,
                    tax_percent: item.tax_percent
                })) || []
            };

            const res = await fetch('/api/quote-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    template_data: cleanData
                })
            });

            if (!res.ok) throw new Error("Failed to save template");

            toast({ title: 'Success', description: 'Template saved successfully' });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5" />
                        Save as Template
                    </DialogTitle>
                    <DialogDescription>
                        Save the current quote details as a template for future use.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Template Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., Standard Service Quote"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of when to use this template"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Template
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
