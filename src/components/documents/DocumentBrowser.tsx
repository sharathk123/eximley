"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FileText, Download, Share2, Trash2, Search, Filter, Loader2, Upload, Info, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';

interface Document {
    id: string;
    file_name: string;
    document_number: string;
    document_type: string;
    document_category: string;
    file_size: number;
    created_at: string;
    download_count: number;
    tags: string[];
}

interface DocumentBrowserProps {
    referenceType?: string;
    referenceId?: string;
    category?: string;
    title?: string;
    description?: string;
}

export function DocumentBrowser({ referenceType, referenceId, category, title, description }: DocumentBrowserProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDocuments();
    }, [referenceType, referenceId, category]);

    // ... (rest of the functions remain the same) ...

    async function fetchDocuments() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (referenceType) params.append('reference_type', referenceType);
            if (referenceId) params.append('reference_id', referenceId);
            if (category) params.append('category', category);

            const res = await fetch(`/api/documents?${params}`);
            const data = await res.json();
            setDocuments(data.documents || []);
        } catch (error) {
            console.error('Failed to fetch documents:', error);
            toast({
                title: 'Error',
                description: 'Failed to fetch documents',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    }

    async function handleDownload(documentId: string, fileName: string) {
        try {
            window.open(`/api/documents/${documentId}/download`, '_blank');
            toast({
                title: 'Success',
                description: 'Document download started'
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to download document',
                variant: 'destructive'
            });
        }
    }

    async function handleShare(documentId: string) {
        try {
            const res = await fetch(`/api/documents/${documentId}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expiresIn: 24 }) // 24 hours
            });

            const data = await res.json();

            if (res.ok) {
                navigator.clipboard.writeText(data.shareUrl);
                toast({
                    title: 'Success',
                    description: 'Share link copied to clipboard'
                });
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create share link',
                variant: 'destructive'
            });
        }
    }

    async function handleDelete(documentId: string) {
        if (!confirm('Are you sure you want to archive this document?')) return;

        try {
            const res = await fetch(`/api/documents?id=${documentId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchDocuments();
                toast({
                    title: 'Success',
                    description: 'Document archived successfully'
                });
            } else {
                throw new Error('Failed to archive document');
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to archive document',
                variant: 'destructive'
            });
        }
    }

    const filteredDocuments = documents.filter(doc =>
        doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.document_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };
    // ...
    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // REMOVED: const fileInputRef = useState... (It was here causing the error)

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast({
                title: 'Error',
                description: 'File size must be less than 10MB',
                variant: 'destructive'
            });
            return;
        }

        // Show preview dialog
        setSelectedFile(file);
        setShowPreview(true);
    }

    async function confirmUpload() {
        if (!selectedFile) return;

        setUploading(true);
        setShowPreview(false);

        try {
            const formData = new FormData();
            formData.append('file', selectedFile);

            // Prepare metadata as required by the API (using camelCase for DocumentService)
            const metadata = {
                documentType: selectedFile.type || 'application/octet-stream',
                documentCategory: category || 'general',
                referenceType: referenceType || 'enquiry',
                referenceId: referenceId || '',
            };

            console.log('Uploading document with metadata:', metadata);
            formData.append('metadata', JSON.stringify(metadata));

            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });

            console.log('Upload response status:', res.status);

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to upload document');
            }

            const result = await res.json();
            console.log('Upload successful, result:', result);

            await fetchDocuments();
            console.log('Documents refetched');

            toast({
                title: 'Success',
                description: 'Document uploaded successfully'
            });

            // Reset file input and selected file
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to upload document',
                variant: 'destructive'
            });
        } finally {
            setUploading(false);
        }
    }

    function cancelUpload() {
        setSelectedFile(null);
        setShowPreview(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Explanatory Note */}
            <Alert className="bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary" />
                <AlertTitle className="font-semibold mb-1">{title || "Digital Filing Cabinet"}</AlertTitle>
                <AlertDescription className="text-muted-foreground leading-relaxed">
                    {description || "Upload relevant files to keep them organized. Examples: Customer RFQs (PDF/Excel), Technical Drawings, or Vendor Quotes."}
                </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-9 bg-background h-10 transition-colors focus-visible:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-auto">
                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleUpload}
                        disabled={uploading}
                    />
                    <Button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="w-full sm:w-auto h-10 shadow-sm"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4 mr-2" /> Upload Document
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {filteredDocuments.length === 0 ? (
                <div className="flex-1 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-12 bg-muted/5">
                    <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">No documents yet</h3>
                    <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                        Upload files related to this record to keep everything in one place.
                    </p>
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Select File
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
                    {filteredDocuments.map((doc) => (
                        <Card
                            key={doc.id}
                            className="group relative overflow-hidden transition-all hover:shadow-md border-muted hover:border-primary/20"
                        >
                            <div className="p-4 flex gap-4">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                    <div className="font-semibold truncate text-sm text-foreground/90 mb-1" title={doc.file_name}>
                                        {doc.file_name}
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                                        <span>{formatFileSize(doc.file_size)}</span>
                                        <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar - Overlay on hover for desktop, visible for mobile if needed, but keeping simple footer for now */}
                            <div className="px-4 py-3 bg-muted/30 border-t flex items-center justify-between gap-2">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {doc.document_category || "General"}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="View document"
                                        className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                                        onClick={() => handleDownload(doc.id, doc.file_name)}
                                        title="Download"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Download document"
                                        className="h-7 w-7 hover:text-primary hover:bg-primary/10"
                                        onClick={() => handleShare(doc.id)}
                                        title="Share"
                                    >
                                        <Share2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label="Delete document"
                                        className="h-7 w-7 hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                                        onClick={() => handleDelete(doc.id)}
                                        title="Archive"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}

            {/* Upload Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Upload</DialogTitle>
                        <DialogDescription>
                            Review the file details before uploading
                        </DialogDescription>
                    </DialogHeader>
                    {selectedFile && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
                                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <FileText className="h-6 w-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={cancelUpload}>
                            Cancel
                        </Button>
                        <Button onClick={confirmUpload} disabled={uploading}>
                            {uploading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="h-4 w-4 mr-2" />
                                    Confirm Upload
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
