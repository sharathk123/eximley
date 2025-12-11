"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { FileText, Download, Share2, Trash2, Search, Filter, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

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
}

export function DocumentBrowser({ referenceType, referenceId, category }: DocumentBrowserProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        fetchDocuments();
    }, [referenceType, referenceId, category]);

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

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    const fileInputRef = useState<HTMLInputElement | null>(null);

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!referenceId || !referenceType) {
            toast({ title: "Error", description: "Context missing for upload", variant: "destructive" });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const metadata = {
            referenceType: referenceType,
            referenceId: referenceId,
            documentCategory: category || 'general',
            documentType: 'General',
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type
        };

        formData.append('metadata', JSON.stringify(metadata));

        try {
            setLoading(true);
            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Upload failed");
            }

            toast({ title: "Success", description: "Document uploaded successfully" });
            fetchDocuments();
        } catch (error: any) {
            console.error(error);
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
            if (e.target) e.target.value = ''; // Reset input
        }
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div>
                    <input
                        type="file"
                        className="hidden"
                        ref={(r) => { if (r) fileInputRef[1](r as any) }}
                        onChange={handleUpload}
                    />
                    <Button onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}>
                        <Upload className="h-4 w-4 mr-2" /> Upload
                    </Button>
                </div>
            </div>

            {filteredDocuments.length === 0 ? (
                <Card className="p-8 flex-1 flex flex-col items-center justify-center border-dashed">
                    <div className="text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p className="mb-4">No documents found</p>
                        <Button variant="outline" onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement)?.click()}>
                            Upload Document
                        </Button>
                    </div>
                </Card>
            ) : (
                <div className="grid gap-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100% - 60px)' }}>
                    {filteredDocuments.map((doc) => (
                        <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <FileText className="h-8 w-8 text-blue-600 flex-shrink-0" />
                                    <div className="min-w-0 flex-1">
                                        <div className="font-medium truncate">{doc.file_name}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                                            {doc.document_number && (
                                                <span>{doc.document_number}</span>
                                            )}
                                            <span>•</span>
                                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{formatFileSize(doc.file_size)}</span>
                                            {doc.download_count > 0 && (
                                                <>
                                                    <span>•</span>
                                                    <span>{doc.download_count} downloads</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownload(doc.id, doc.file_name)}
                                        title="Download"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleShare(doc.id)}
                                        title="Share"
                                    >
                                        <Share2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(doc.id)}
                                        title="Archive"
                                    >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
