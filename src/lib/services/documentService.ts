import { createSessionClient, createAdminClient } from '@/lib/supabase/server';

export interface DocumentMetadata {
    documentType: string;
    documentCategory: string;
    referenceType?: string;
    referenceId?: string;
    documentNumber?: string;
    documentDate?: string;
    tags?: string[];
    notes?: string;
    metadata?: Record<string, any>;
}

export interface UploadOptions {
    version?: number;
    parentDocumentId?: string;
}

export class DocumentService {
    /**
     * Upload a document to Supabase Storage
     */
    static async uploadDocument(
        companyId: string,
        file: File | Buffer,
        metadata: DocumentMetadata,
        options: UploadOptions = {}
    ) {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) throw new Error('Unauthorized');

        // Generate storage path
        const year = new Date().getFullYear();
        const category = metadata.documentCategory.toLowerCase().replace(/\s+/g, '_');
        const timestamp = Date.now();

        // Get file extension from the original file or use a default based on mime type
        let fileExtension = '.pdf';
        if (file instanceof File) {
            const nameParts = file.name.split('.');
            if (nameParts.length > 1) {
                fileExtension = '.' + nameParts[nameParts.length - 1];
            }
        } else if (metadata.documentType) {
            // Map common mime types to extensions
            const mimeToExt: Record<string, string> = {
                'application/pdf': '.pdf',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
                'application/vnd.ms-excel': '.xls',
                'application/msword': '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
                'image/jpeg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'text/csv': '.csv',
            };
            fileExtension = mimeToExt[metadata.documentType] || '.pdf';
        }

        const fileName = metadata.documentNumber
            ? `${metadata.documentNumber}${options.version && options.version > 1 ? `_v${options.version}` : ''}${fileExtension}`
            : `${timestamp}${fileExtension}`;
        const storagePath = `${companyId}/${category}/${year}/${fileName}`;

        // Convert Buffer to File if needed
        const fileToUpload = file instanceof Buffer
            ? new File([new Uint8Array(file)], fileName, { type: metadata.documentType || 'application/octet-stream' })
            : file;

        // Upload to Supabase Storage using session client (respects RLS)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileToUpload, {
                cacheControl: '3600',
                upsert: true  // Allow overwriting existing files
            });

        if (uploadError) throw uploadError;

        // Check if a document already exists for this reference
        const { data: existingDoc } = await supabase
            .from('documents')
            .select('id')
            .eq('company_id', companyId)
            .eq('reference_type', metadata.referenceType || '')
            .eq('reference_id', metadata.referenceId || '')
            .eq('version', options.version || 1)
            .maybeSingle(); // Use maybeSingle instead of single to avoid error if not found

        let document;

        if (existingDoc) {
            // Update existing document
            const { data: updatedDoc, error: updateError } = await supabase
                .from('documents')
                .update({
                    file_path: uploadData.path,
                    file_name: fileToUpload instanceof File ? fileToUpload.name : fileName,
                    file_size: fileToUpload instanceof File ? fileToUpload.size : (file as Buffer).length,
                    storage_path: storagePath,
                    tags: metadata.tags,
                    notes: metadata.notes,
                    metadata: metadata.metadata
                })
                .eq('id', existingDoc.id)
                .select()
                .single();

            if (updateError) throw updateError;
            document = updatedDoc;
        } else {
            // If this is a new version, mark previous version as not latest
            if (options.parentDocumentId) {
                await supabase
                    .from('documents')
                    .update({ is_latest_version: false })
                    .eq('id', options.parentDocumentId);
            }

            // Create new database record
            const insertData: any = {
                company_id: companyId,
                document_type: metadata.documentType,
                document_category: metadata.documentCategory,
                reference_type: metadata.referenceType,
                reference_id: metadata.referenceId,
                file_path: uploadData.path,
                file_name: fileToUpload instanceof File ? fileToUpload.name : fileName,
                file_size: fileToUpload instanceof File ? fileToUpload.size : (file as Buffer).length,
                mime_type: metadata.documentType || 'application/octet-stream',
                document_number: metadata.documentNumber,
                document_date: metadata.documentDate,
                uploaded_by: user.id,
                tags: metadata.tags,
                notes: metadata.notes,
                storage_bucket: 'documents',
                storage_path: storagePath,
                metadata: metadata.metadata,
                version: options.version || 1,
                is_latest_version: true
            };

            // Only include parent_document_id if it's provided
            if (options.parentDocumentId) {
                insertData.parent_document_id = options.parentDocumentId;
            }

            const { data: newDoc, error: dbError } = await supabase
                .from('documents')
                .insert(insertData)
                .select()
                .single();

            if (dbError) throw dbError;
            document = newDoc;
        }

        // Log the upload
        await this.logDocumentAccess(document.id, 'upload', companyId);

        return document;
    }

    /**
     * Generate and store a PDF document from buffer
     */
    static async generateAndStoreDocument(
        companyId: string,
        pdfBuffer: Buffer,
        metadata: DocumentMetadata,
        options: UploadOptions = {}
    ) {
        return this.uploadDocument(companyId, pdfBuffer, metadata, options);
    }

    /**
     * Get a signed URL for document download
     */
    static async getDocumentUrl(documentId: string, expiresIn: number = 3600) {
        const supabase = await createSessionClient();

        // Get document record
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error) throw error;

        // Generate signed URL
        const { data: urlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.storage_path, expiresIn);

        if (urlError) throw urlError;

        // Update access stats
        await supabase
            .from('documents')
            .update({
                last_accessed_at: new Date().toISOString()
            })
            .eq('id', documentId);

        // Log access
        await this.logDocumentAccess(documentId, 'view', document.company_id);

        return urlData.signedUrl;
    }

    /**
     * Download a document
     */
    static async downloadDocument(documentId: string) {
        const supabase = await createSessionClient();

        // Get document record
        const { data: document, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', documentId)
            .single();

        if (error) throw error;

        // Generate signed URL
        const { data: urlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.storage_path, 60);

        if (urlError) throw urlError;

        // Update download count
        const { data: currentDoc } = await supabase
            .from('documents')
            .select('download_count')
            .eq('id', documentId)
            .single();

        await supabase
            .from('documents')
            .update({
                download_count: (currentDoc?.download_count || 0) + 1,
                last_accessed_at: new Date().toISOString()
            })
            .eq('id', documentId);

        // Log download
        await this.logDocumentAccess(documentId, 'download', document.company_id);

        return {
            url: urlData.signedUrl,
            fileName: document.file_name
        };
    }

    /**
     * Log document access
     */
    static async logDocumentAccess(
        documentId: string,
        action: 'view' | 'download' | 'share' | 'delete' | 'upload',
        companyId?: string
    ) {
        try {
            const supabase = await createSessionClient();
            const { data: { user } } = await supabase.auth.getUser();

            // Get company_id if not provided
            let company_id = companyId;
            if (!company_id) {
                const { data: document } = await supabase
                    .from('documents')
                    .select('company_id')
                    .eq('id', documentId)
                    .single();

                if (!document) return;
                company_id = document.company_id;
            }

            await supabase.from('document_access_log').insert({
                document_id: documentId,
                user_id: user?.id,
                company_id: company_id,
                action
            });
        } catch (error) {
            console.error('Error logging document access:', error);
            // Don't throw - logging should not break the main flow
        }
    }

    /**
     * Create a shareable link
     */
    static async createShareLink(
        documentId: string,
        options: {
            expiresIn?: number; // hours
            maxDownloads?: number;
            password?: string;
            recipientEmail?: string;
        } = {}
    ) {
        const supabase = await createSessionClient();
        const { data: { user } } = await supabase.auth.getUser();

        const { data: document } = await supabase
            .from('documents')
            .select('company_id')
            .eq('id', documentId)
            .single();

        if (!document) throw new Error('Document not found');

        const shareToken = crypto.randomUUID();
        const expiresAt = options.expiresIn
            ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000)
            : null;

        const { data: share, error } = await supabase
            .from('document_shares')
            .insert({
                document_id: documentId,
                company_id: document.company_id,
                shared_by: user?.id,
                share_token: shareToken,
                recipient_email: options.recipientEmail,
                expires_at: expiresAt,
                max_downloads: options.maxDownloads
            })
            .select()
            .single();

        if (error) throw error;

        // Log the share action
        await this.logDocumentAccess(documentId, 'share', document.company_id);

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return {
            shareUrl: `${baseUrl}/shared/${shareToken}`,
            expiresAt,
            shareToken
        };
    }

    /**
     * Get all documents for a reference
     */
    static async getDocumentsByReference(
        referenceType: string,
        referenceId: string
    ) {
        const supabase = await createSessionClient();

        const { data: documents, error } = await supabase
            .from('documents')
            .select('*')
            .eq('reference_type', referenceType)
            .eq('reference_id', referenceId)
            .eq('is_archived', false)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return documents;
    }

    /**
     * Archive a document
     */
    static async archiveDocument(documentId: string) {
        const supabase = await createSessionClient();

        const { data, error } = await supabase
            .from('documents')
            .update({
                is_archived: true,
                archived_at: new Date().toISOString()
            })
            .eq('id', documentId)
            .select()
            .single();

        if (error) throw error;

        return data;
    }
}
