"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Loader2, FileText } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Card } from '@/components/ui/card';

interface QuoteDocumentUploadProps {
    quoteId: string;
    quoteNumber: string;
    onUploadComplete?: () => void;
}

export function QuoteDocumentUpload({ quoteId, quoteNumber, onUploadComplete }: QuoteDocumentUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [documentType, setDocumentType] = useState('supporting_document');
    const [documentCategory, setDocumentCategory] = useState('quote_documents');
    const [notes, setNotes] = useState('');
    const [tags, setTags] = useState('');
    const { toast } = useToast();

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({
                title: 'Error',
                description: 'Please select a file to upload',
                variant: 'destructive'
            });
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const metadata = {
                documentType,
                documentCategory,
                referenceType: 'quote',
                referenceId: quoteId,
                documentNumber: quoteNumber,
                documentDate: new Date().toISOString().split('T')[0],
                notes,
                tags: tags.split(',').map(t => t.trim()).filter(Boolean)
            };

            formData.append('metadata', JSON.stringify(metadata));

            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Upload failed');
            }

            toast({
                title: 'Success',
                description: 'Document uploaded successfully'
            });

            // Reset form
            setFile(null);
            setNotes('');
            setTags('');
            setDocumentType('supporting_document');

            // Notify parent to refresh document list
            if (onUploadComplete) {
                onUploadComplete();
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
    };

    return (
        <div className="space-y-4">
            <Card
                className={`border-2 border-dashed p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-muted-foreground" />
                    {file ? (
                        <div className="space-y-1">
                            <p className="text-sm font-medium">{file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Drag and drop your file here, or click to browse
                            </p>
                            <Input
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                                onChange={handleFileChange}
                                className="max-w-xs"
                            />
                        </>
                    )}
                </div>
            </Card>

            {file && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Document Type</Label>
                            <Select value={documentType} onValueChange={setDocumentType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="supporting_document">Supporting Document</SelectItem>
                                    <SelectItem value="terms_conditions">Terms & Conditions</SelectItem>
                                    <SelectItem value="buyer_requirement">Buyer Requirement</SelectItem>
                                    <SelectItem value="technical_spec">Technical Specification</SelectItem>
                                    <SelectItem value="certificate">Certificate</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={documentCategory} onValueChange={setDocumentCategory}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="quote_documents">Quote Documents</SelectItem>
                                    <SelectItem value="compliance">Compliance</SelectItem>
                                    <SelectItem value="quality">Quality</SelectItem>
                                    <SelectItem value="correspondence">Correspondence</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes (Optional)</Label>
                        <Textarea
                            placeholder="Add any notes about this document..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Tags (Optional)</Label>
                        <Input
                            placeholder="Enter tags separated by commas (e.g., urgent, reviewed, approved)"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="flex-1"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Document
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setFile(null)}
                            disabled={uploading}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
