"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
    Folder, FolderOpen, FileText, Download, Share2, Trash2,
    Search, RefreshCw, Loader2, ChevronRight, ChevronDown
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmptyState } from '@/components/ui/empty-state';

interface Document {
    id: string;
    file_name: string;
    document_number: string;
    document_type: string;
    document_category: string;
    file_size: number;
    created_at: string;
    storage_path: string;
    download_count: number;
}

interface FolderNode {
    name: string;
    path: string;
    type: 'folder' | 'file';
    children?: FolderNode[];
    document?: Document;
    isExpanded?: boolean;
}

export function DocumentLibrary() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folderTree, setFolderTree] = useState<FolderNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();

    useEffect(() => {
        fetchDocuments();
    }, []);

    useEffect(() => {
        if (documents.length > 0) {
            buildFolderTree();
        }
    }, [documents, searchQuery]);

    async function fetchDocuments() {
        setLoading(true);
        try {
            const res = await fetch('/api/documents');
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

    async function handleRefresh() {
        setRefreshing(true);
        await fetchDocuments();
        setRefreshing(false);
        toast({
            title: 'Refreshed',
            description: 'Document library updated'
        });
    }

    function buildFolderTree() {
        const tree: { [key: string]: FolderNode } = {};

        // Filter documents by search query
        const filteredDocs = searchQuery
            ? documents.filter(doc =>
                doc.file_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                doc.document_category?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            : documents;

        filteredDocs.forEach(doc => {
            // storage_path format: {company_id}/{category}/{year}/{filename}
            const parts = doc.storage_path?.split('/') || [];

            if (parts.length < 3) return;

            const category = parts[1] || doc.document_category || 'uncategorized';
            const year = parts[2] || new Date(doc.created_at).getFullYear().toString();

            // Build category folder
            if (!tree[category]) {
                tree[category] = {
                    name: formatCategoryName(category),
                    path: category,
                    type: 'folder',
                    children: [],
                    isExpanded: true
                };
            }

            // Build year folder within category
            const yearPath = `${category}/${year}`;
            let yearFolder = tree[category].children?.find(c => c.path === yearPath);

            if (!yearFolder) {
                yearFolder = {
                    name: year,
                    path: yearPath,
                    type: 'folder',
                    children: [],
                    isExpanded: true
                };
                tree[category].children?.push(yearFolder);
            }

            // Add file
            yearFolder.children?.push({
                name: doc.file_name,
                path: `${yearPath}/${doc.file_name}`,
                type: 'file',
                document: doc
            });
        });

        // Sort folders and files
        Object.values(tree).forEach(categoryFolder => {
            categoryFolder.children?.sort((a, b) => {
                // Sort year folders descending (newest first)
                return b.name.localeCompare(a.name);
            });

            categoryFolder.children?.forEach(yearFolder => {
                // Sort files by date descending
                yearFolder.children?.sort((a, b) => {
                    const dateA = a.document?.created_at || '';
                    const dateB = b.document?.created_at || '';
                    return dateB.localeCompare(dateA);
                });
            });
        });

        setFolderTree(Object.values(tree).sort((a, b) => a.name.localeCompare(b.name)));
    }

    function formatCategoryName(category: string): string {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function toggleFolder(path: string) {
        const updateTree = (nodes: FolderNode[]): FolderNode[] => {
            return nodes.map(node => {
                if (node.path === path) {
                    return { ...node, isExpanded: !node.isExpanded };
                }
                if (node.children) {
                    return { ...node, children: updateTree(node.children) };
                }
                return node;
            });
        };

        setFolderTree(updateTree(folderTree));
    }

    async function handleDownload(doc: Document) {
        try {
            window.open(`/api/documents/${doc.id}/download`, '_blank');
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

    async function handleShare(doc: Document) {
        try {
            const res = await fetch(`/api/documents/${doc.id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ expiresIn: 24 })
            });

            const data = await res.json();

            if (res.ok) {
                navigator.clipboard.writeText(data.shareUrl);
                toast({
                    title: 'Success',
                    description: 'Share link copied to clipboard'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to create share link',
                variant: 'destructive'
            });
        }
    }

    async function handleDelete(doc: Document) {
        if (!confirm('Are you sure you want to archive this document?')) return;

        try {
            const res = await fetch(`/api/documents?id=${doc.id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await fetchDocuments();
                toast({
                    title: 'Success',
                    description: 'Document archived successfully'
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to archive document',
                variant: 'destructive'
            });
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    function renderNode(node: FolderNode, level: number = 0) {
        if (node.type === 'folder') {
            return (
                <div key={node.path}>
                    <div
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer rounded-md transition-colors"
                        style={{ paddingLeft: `${level * 1.5 + 0.75}rem` }}
                        onClick={() => toggleFolder(node.path)}
                    >
                        {node.isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        {node.isExpanded ? (
                            <FolderOpen className="h-4 w-4 text-blue-600" />
                        ) : (
                            <Folder className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium text-sm">{node.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                            {node.children?.length || 0} items
                        </span>
                    </div>
                    {node.isExpanded && node.children && (
                        <div>
                            {node.children.map(child => renderNode(child, level + 1))}
                        </div>
                    )}
                </div>
            );
        }

        // File node
        const doc = node.document!;
        return (
            <div
                key={node.path}
                className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 rounded-md transition-colors group"
                style={{ paddingLeft: `${level * 1.5 + 2.25}rem` }}
            >
                <FileText className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" title={doc.file_name}>
                        {doc.file_name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>•</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="View document"
                        className="h-7 w-7"
                        onClick={() => handleDownload(doc)}
                        title="Download"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Download document"
                        className="h-7 w-7"
                        onClick={() => handleShare(doc)}
                        title="Share"
                    >
                        <Share2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete document"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => handleDelete(doc)}
                        title="Archive"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search documents..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card className="flex-1 overflow-hidden">
                <ScrollArea className="h-[calc(100vh-250px)]">
                    {folderTree.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12">
                            <EmptyState
                                icon={Folder}
                                title="No documents found"
                                description={searchQuery ? 'Try a different search term' : 'Upload documents to get started'}
                                className="border-none p-0 min-h-[auto]"
                            />
                        </div>
                    ) : (
                        <div className="p-2">
                            {folderTree.map(node => renderNode(node, 0))}
                        </div>
                    )}
                </ScrollArea>
            </Card>
        </div>
    );
}
