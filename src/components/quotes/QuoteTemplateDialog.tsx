"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle as CardTitleUI } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, LayoutTemplate, Trash2, ArrowRight } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface QuoteTemplateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectTemplate: (data: any) => void;
}

export function QuoteTemplateDialog({ open, onOpenChange, onSelectTemplate }: QuoteTemplateDialogProps) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (open) {
            fetchTemplates();
        }
    }, [open]);

    const fetchTemplates = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/quote-templates');
            if (res.ok) {
                const data = await res.json();
                setTemplates(data.templates || []);
            }
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to load templates', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            const res = await fetch(`/api/quote-templates/${deletingId}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error("Failed to delete template");

            setTemplates(templates.filter(t => t.id !== deletingId));
            toast({ title: 'Success', description: 'Template deleted' });
            setDeletingId(null);
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to delete template', variant: 'destructive' });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[600px] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5" />
                        Select a Template
                    </DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex-1 flex justify-center items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : templates.length === 0 ? (
                    <div className="flex-1 flex flex-col justify-center items-center text-muted-foreground p-8 text-center">
                        <LayoutTemplate className="h-12 w-12 mb-4 opacity-50" />
                        <p>No templates found.</p>
                        <p className="text-sm mt-2">Save a quote as a template to see it here.</p>
                    </div>
                ) : (
                    <ScrollArea className="flex-1 pr-4">
                        <div className="grid gap-4 p-1">
                            {templates.map((template) => (
                                <Card key={template.id} className="cursor-pointer hover:border-primary/50 transition-colors group">
                                    <CardHeader className="pb-2">
                                        <div className="flex justify-between items-start">
                                            <CardTitleUI className="text-base">{template.name}</CardTitleUI>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setDeletingId(template.id);
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <CardDescription>{template.description || "No description"}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-2 text-xs text-muted-foreground">
                                        {template.template_data.items?.length || 0} items included
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        <Button
                                            size="sm"
                                            className="w-full mt-2"
                                            variant="secondary"
                                            onClick={() => {
                                                onSelectTemplate(template.template_data);
                                                onOpenChange(false);
                                            }}
                                        >
                                            Use Template <ArrowRight className="ml-2 h-3 w-3" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                {/* Delete Confirmation */}
                <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Template?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete this template.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}
