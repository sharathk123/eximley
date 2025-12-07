import { SupabaseClient } from "@supabase/supabase-js";
import { ERRORS } from "@/lib/constants/messages";

/**
 * Execute a function within a database transaction
 * Supabase doesn't support traditional transactions, so we implement a rollback pattern
 * @param supabase - Supabase client
 * @param operations - Array of operations to execute
 * @returns Result of the transaction
 */
export async function withTransaction<T>(
    supabase: SupabaseClient,
    operations: Array<() => Promise<{ data: any; error: any; rollback?: () => Promise<void> }>>
): Promise<{ data: T | null; error: any }> {
    const rollbackStack: Array<() => Promise<void>> = [];

    try {
        let lastResult: any = null;

        for (const operation of operations) {
            const result = await operation();

            if (result.error) {
                // Rollback all previous operations
                for (const rollback of rollbackStack.reverse()) {
                    try {
                        await rollback();
                    } catch (rollbackError) {
                        console.error("Rollback failed:", rollbackError);
                    }
                }
                return { data: null, error: result.error };
            }

            if (result.rollback) {
                rollbackStack.push(result.rollback);
            }

            lastResult = result.data;
        }

        return { data: lastResult, error: null };
    } catch (error) {
        // Rollback on unexpected error
        for (const rollback of rollbackStack.reverse()) {
            try {
                await rollback();
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }
        }
        return { data: null, error };
    }
}

/**
 * Generate and store a document with transaction support
 * @param supabase - Supabase client
 * @param documentData - Document metadata
 * @param pdfBuffer - PDF file buffer
 * @param filePath - Storage path
 * @returns Document record
 */
export async function generateAndStoreDocument(
    supabase: SupabaseClient,
    documentData: {
        company_id: string;
        document_type: string;
        reference_type: string;
        reference_id: string;
        file_name: string;
        uploaded_by: string;
    },
    pdfBuffer: Buffer | ArrayBuffer,
    filePath: string
) {
    return withTransaction(supabase, [
        // Step 1: Upload to storage
        async () => {
            const { error: uploadError } = await supabase.storage
                .from("export-documents")
                .upload(filePath, pdfBuffer, {
                    contentType: "application/pdf",
                    upsert: false,
                });

            return {
                data: { filePath },
                error: uploadError,
                rollback: async () => {
                    await supabase.storage.from("export-documents").remove([filePath]);
                },
            };
        },
        // Step 2: Save metadata
        async () => {
            const { data: document, error: dbError } = await supabase
                .from("documents")
                .insert({
                    ...documentData,
                    file_path: filePath,
                    file_size: pdfBuffer.byteLength,
                    mime_type: "application/pdf",
                    document_category: "generated",
                })
                .select()
                .single();

            return {
                data: document,
                error: dbError,
                rollback: async () => {
                    if (document) {
                        await supabase.from("documents").delete().eq("id", document.id);
                    }
                },
            };
        },
    ]);
}
