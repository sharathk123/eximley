"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { UploadCloud, FileType, AlertCircle, Trash2, BrainCircuit, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function HSNIngest() {
    const { toast } = useToast();

    // --- UPLOAD STATE ---
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploadController, setUploadController] = useState<AbortController | null>(null);

    // --- EMBEDDING STATE ---
    const [pendingCount, setPendingCount] = useState<number | null>(null);
    const [processing, setProcessing] = useState(false);
    const [embedProgress, setEmbedProgress] = useState(0);
    const [embedStatus, setEmbedStatus] = useState("");
    const [embedController, setEmbedController] = useState<AbortController | null>(null);

    // --- DELETE STATE ---
    const [deleting, setDeleting] = useState(false);

    // --- FETCH STATS ---
    const fetchStats = async () => {
        try {
            const res = await fetch("/api/admin/hsn/process-embeddings"); // GET
            if (res.ok) {
                const data = await res.json();
                setPendingCount(data.pending);
                return data; // RETURN DATA
            }
            return null;
        } catch (e) {
            console.error("Failed to fetch HSN stats", e);
            return null;
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    // --- HANDLERS: UPLOAD ---
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFiles(Array.from(e.target.files));
            setUploadProgress(0);
            setUploadStatus("");
        }
    };

    const removeFile = (indexToRemove: number) => {
        setFiles(files.filter((_, index) => index !== indexToRemove));
    };

    const handleCancelUpload = () => {
        if (uploadController) {
            uploadController.abort();
            setUploadController(null);
            setUploading(false);
            setUploadStatus("Upload cancelled.");
            setUploadProgress(0);
        }
    };

    const handleUploadMaster = async (retryCount = 0) => {
        if (files.length === 0) return;

        const MAX_RETRIES = 3;
        const controller = new AbortController();
        setUploadController(controller);
        setUploading(true);
        setUploadProgress(0);
        setUploadStatus(retryCount > 0 ? `Retrying upload (${retryCount}/${MAX_RETRIES})...` : "Initializing upload...");

        const formData = new FormData();
        files.forEach(file => formData.append("file", file));

        try {
            const res = await fetch("/api/admin/hsn/ingest", {
                method: "POST",
                body: formData,
                signal: controller.signal,
                // Add keepalive to prevent connection drops
                keepalive: true
            });

            if (!res.ok) {
                let errData;
                try { errData = await res.json(); } catch (e) { }
                throw new Error(errData?.error || "Upload failed");
            }

            if (!res.body) throw new Error("No response body");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            await readStream(reader, decoder, (msg) => {
                // Log suppressed for cleaner UI
                if (msg.type === 'log') {
                    // setUploadStatus(msg.message);
                }
                else if (msg.type === 'progress') {
                    const overall = ((msg.fileIndex * 100) + msg.fileProgress) / files.length;
                    setUploadProgress(Math.min(overall, 99));
                }
                else if (msg.type === 'done') {
                    setUploadProgress(100);
                    setUploadStatus(msg.message);
                    toast({ title: "Upload Complete", description: "Starting AI indexing..." });

                    // Wait for DB commits to be visible, then fetch stats and trigger embeddings
                    setTimeout(async () => {
                        const stats = await fetchStats(); // Get fresh stats
                        const pending = stats ? stats.pending : 0;
                        handleGenerateEmbeddings(0, pending); // AUTO TRIGGER EMBEDDINGS with explicit total
                    }, 500); // 500ms delay for DB consistency
                }
                else if (msg.type === 'error') throw new Error(msg.message);
            });

        } catch (err: any) {
            if (err.name === 'AbortError') {
                // User cancelled, don't retry
                return;
            }

            // Check if it's a network error
            const isNetworkError = err.message.includes('network') ||
                err.message.includes('fetch') ||
                err.name === 'TypeError' ||
                err.message.includes('Failed to fetch');

            if (isNetworkError && retryCount < MAX_RETRIES) {
                // Exponential backoff: 2s, 4s, 8s
                const delay = Math.pow(2, retryCount + 1) * 1000;
                setUploadStatus(`Network error. Retrying in ${delay / 1000}s...`);

                await new Promise(resolve => setTimeout(resolve, delay));

                // Retry
                return handleUploadMaster(retryCount + 1);
            }

            // Final failure
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: isNetworkError
                    ? "Network connection lost. Please check your connection and try again."
                    : err.message
            });
            setUploadStatus("Error: " + err.message);
        } finally {
            setUploading(false);
            setUploadController(null);
        }
    };

    // --- HANDLERS: EMBEDDING ---
    const handleCancelEmbed = () => {
        if (embedController) {
            embedController.abort();
            setEmbedController(null);
            setProcessing(false);
            setEmbedStatus("Processing cancelled.");
            setEmbedProgress(0);
        }
    };

    const handleGenerateEmbeddings = async (retryCount = 0, totalOverride?: number) => {
        const MAX_RETRIES = 3;
        const controller = new AbortController();
        setEmbedController(controller);
        setProcessing(true);
        setEmbedProgress(0);
        setEmbedStatus(retryCount > 0 ? `Retrying AI indexing (${retryCount}/${MAX_RETRIES})...` : "Initializing model...");

        try {
            const res = await fetch("/api/admin/hsn/process-embeddings", {
                method: "POST",
                signal: controller.signal,
                keepalive: true
            });

            if (!res.ok) throw new Error("Failed to start processing");
            if (!res.body) throw new Error("No response body");

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            // For embedding progress, use override if provided (fresh from DB), else state (resume click)
            const initialTotal = totalOverride || pendingCount || 100;
            console.log("Starting Embed Production. Total to process:", initialTotal);

            await readStream(reader, decoder, (msg) => {
                // Log suppressed for cleaner UI
                if (msg.type === 'log') {
                    // setEmbedStatus(msg.message);
                }
                else if (msg.type === 'progress') {
                    // msg.processed is total processed so far
                    const percent = Math.min(Math.round((msg.processed / initialTotal) * 100), 99);
                    setEmbedProgress(percent);
                    setEmbedStatus(`Processed ${msg.processed} / ${initialTotal} records...`);
                }
                else if (msg.type === 'done') {
                    setEmbedProgress(100);
                    setEmbedStatus(msg.message);
                    toast({ title: "Processing Complete", description: msg.message });
                    fetchStats();
                    setProcessing(false); // Ensure processing stops
                }
                else if (msg.type === 'error') throw new Error(msg.message);
            });

        } catch (err: any) {
            if (err.name === 'AbortError') {
                return;
            }

            // Check if it's a network error
            const isNetworkError = err.message.includes('network') ||
                err.message.includes('fetch') ||
                err.name === 'TypeError' ||
                err.message.includes('Failed to fetch');

            if (isNetworkError && retryCount < MAX_RETRIES) {
                // Exponential backoff
                const delay = Math.pow(2, retryCount + 1) * 1000;
                setEmbedStatus(`Network error. Retrying in ${delay / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return handleGenerateEmbeddings(retryCount + 1, totalOverride);
            }

            toast({
                variant: "destructive",
                title: "Processing Failed",
                description: err.message
            });
            setEmbedStatus("Error: " + err.message);
        } finally {
            if (!processing) { // Only clear if not already handled by done
                // Keep processing true if loop is retrying? 
                // No, retry calls recursively.
            }
            // Logic is a bit loose here, simplify:
            // Finalizer runs on return.
            setProcessing(false);
            setEmbedController(null);
        }
    };

    // Helper for stream reading
    async function readStream(reader: ReadableStreamDefaultReader, decoder: TextDecoder, onMessage: (msg: any) => void) {
        let accumulatedData = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulatedData += decoder.decode(value, { stream: true });
            const lines = accumulatedData.split("\n");
            accumulatedData = lines.pop() || "";
            for (const line of lines) {
                if (!line.trim() || line.startsWith(":")) continue;
                try {
                    const msg = JSON.parse(line);
                    onMessage(msg);
                } catch (e) { }
            }
        }
    }

    // --- HANLDERS: DELETE ---
    const handleDelete = async () => {
        setDeleting(true);
        try {
            // Re-using ingest route DELETE as it handles truncate
            const res = await fetch("/api/admin/hsn/ingest", { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Delete failed");
            toast({ title: "Data Cleared", description: data.message });
            fetchStats();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">

            {/* UNIFIED COMPONENT: UPLOAD + AUTO EMBED */}
            <Card className="border-border shadow-sm bg-card overflow-hidden">
                <CardHeader className="bg-muted/30 border-b border-border/50 pb-6">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <UploadCloud className="w-5 h-5 text-primary" />
                        </div>
                        Master Data Ingestion
                    </CardTitle>
                    <CardDescription className="text-muted-foreground ml-11">
                        Upload and process ITC-HS or GST HSN lists. Search records are generated automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-8">
                    <div className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200 ease-in-out ${files.length > 0 ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30 hover:bg-muted/50'}`}>
                        <Input
                            type="file"
                            accept=".pdf,.xlsx,.xls,.csv"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload"
                            multiple
                            disabled={uploading || processing}
                        />
                        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-3">
                            <div className={`p-4 rounded-full mb-2 transition-colors ${files.length > 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <FileType className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <div className="font-semibold text-foreground text-lg">
                                    {files.length > 0 ? `${files.length} file(s) selected` : "Click to select files"}
                                </div>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    Supporting PDF, Excel, and CSV formats.
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* File List with Remove Buttons */}
                    {files.length > 0 && (
                        <div className="space-y-3">
                            <div className="text-sm font-medium text-muted-foreground px-1">Selected Files</div>
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border hover:border-primary/20 transition-colors group">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="p-2 bg-background rounded border border-border/50">
                                            <FileType className="w-4 h-4 text-primary flex-shrink-0" />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-medium text-foreground truncate">{f.name}</span>
                                            <span className="text-xs text-muted-foreground flex-shrink-0">
                                                {(f.size / 1024 / 1024).toFixed(2)} MB
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        aria-label="Remove file"
                                        size="sm"
                                        onClick={() => removeFile(i)}
                                        disabled={uploading || processing}
                                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive opacity-70 group-hover:opacity-100 transition-opacity"
                                        title="Remove file"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Stage 1: Upload Progress with Milestones */}
                    {(uploading || uploadStatus) && (
                        <div className="space-y-4 p-5 bg-primary/5 rounded-xl border border-primary/10">
                            {/* Milestone Indicators */}
                            <div className="flex justify-between items-center text-xs">
                                <div className={`flex items-center gap-1.5 ${uploadProgress >= 0 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${uploadProgress >= 0 ? 'bg-primary ring-primary/30' : 'bg-muted ring-transparent'}`}></div>
                                    Parsing
                                </div>
                                <div className={`flex items-center gap-1.5 ${uploadProgress >= 33 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${uploadProgress >= 33 ? 'bg-primary ring-primary/30' : 'bg-muted ring-transparent'}`}></div>
                                    Uploading
                                </div>
                                <div className={`flex items-center gap-1.5 ${uploadProgress >= 90 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                                    <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${uploadProgress >= 90 ? 'bg-primary ring-primary/30' : 'bg-muted ring-transparent'}`}></div>
                                    Finalizing
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-primary/80">
                                    <span className="font-medium">{uploadStatus}</span>
                                    <span className="font-bold">{Math.round(uploadProgress)}%</span>
                                </div>
                                {uploading && uploadProgress === 0 ? (
                                    <div className="h-2 w-full bg-primary/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-primary animate-indeterminate-bar w-1/3 rounded-full"></div>
                                    </div>
                                ) : (
                                    <Progress value={uploadProgress} className="h-2 bg-primary/20" />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Stage 2: Embedding Progress with Milestones */}
                    {(processing || (pendingCount !== null && pendingCount > 0)) && (
                        <div className="space-y-4 p-5 bg-purple-500/5 rounded-xl border border-purple-500/10">
                            {processing && (
                                <>
                                    {/* Milestone Indicators */}
                                    <div className="flex justify-between items-center text-xs">
                                        <div className={`flex items-center gap-1.5 ${embedProgress >= 0 ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-muted-foreground'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${embedProgress >= 0 ? 'bg-purple-600 dark:bg-purple-400 ring-purple-500/30' : 'bg-muted ring-transparent'}`}></div>
                                            Model Init
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${embedProgress >= 20 ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-muted-foreground'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${embedProgress >= 20 ? 'bg-purple-600 dark:bg-purple-400 ring-purple-500/30' : 'bg-muted ring-transparent'}`}></div>
                                            Processing
                                        </div>
                                        <div className={`flex items-center gap-1.5 ${embedProgress >= 85 ? 'text-purple-600 dark:text-purple-400 font-semibold' : 'text-muted-foreground'}`}>
                                            <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-background ${embedProgress >= 85 ? 'bg-purple-600 dark:bg-purple-400 ring-purple-500/30' : 'bg-muted ring-transparent'}`}></div>
                                            Saving
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm text-purple-700 dark:text-purple-300">
                                            <span className="flex items-center gap-2 font-medium">
                                                <BrainCircuit className="w-4 h-4" />
                                                {embedStatus}
                                            </span>
                                            <span className="font-bold">{Math.round(embedProgress)}%</span>
                                        </div>
                                        <Progress value={embedProgress} className="h-2 bg-purple-500/20 [&>*]:bg-purple-600 dark:[&>*]:bg-purple-500" />
                                    </div>
                                </>
                            )}

                            {!processing && (
                                <div className="flex justify-between items-center bg-background/50 p-3 rounded-lg border border-border/50">
                                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300 flex items-center gap-2">
                                        <BrainCircuit className="w-4 h-4" />
                                        {pendingCount} records pending AI indexing
                                    </span>
                                    <Button size="sm" variant="outline" onClick={() => handleGenerateEmbeddings()} className="h-8 text-xs font-semibold border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/20">
                                        Resume AI Processing
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                </CardContent>
                <CardFooter className="justify-end bg-muted/40 border-t border-border/50 py-4 px-6">
                    {uploading ? (
                        <Button variant="destructive" onClick={handleCancelUpload} className="shadow-sm">Cancel Upload</Button>
                    ) : processing ? (
                        <Button variant="destructive" onClick={handleCancelEmbed} className="shadow-sm">Stop Processing</Button>
                    ) : (
                        <Button onClick={() => handleUploadMaster()} disabled={files.length === 0} className="font-semibold shadow-sm">
                            <UploadCloud className="w-4 h-4 mr-2" />
                            Start Ingestion
                        </Button>
                    )}
                </CardFooter>
            </Card>

            {/* DANGER ZONE */}
            <Card className="border-destructive/30 shadow-none bg-destructive/5 overflow-hidden">
                <CardHeader className="pb-4">
                    <CardTitle className="text-destructive flex items-center gap-2 text-lg">
                        <AlertCircle className="w-5 h-5" />
                        Danger Zone
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 bg-background rounded-xl border border-destructive/20 shadow-sm">
                        <div className="space-y-1">
                            <h4 className="font-bold text-base text-foreground">Delete All Data</h4>
                            <p className="text-sm text-muted-foreground w-full md:max-w-md leading-relaxed">
                                Permanently remove all HSN classification codes, categories, and vector embeddings.
                                <span className="block mt-1 font-medium text-destructive">This action is irreversible and will reset the registry.</span>
                            </p>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={deleting || uploading || processing} className="whitespace-nowrap font-semibold shadow-sm hover:bg-red-600">
                                    {deleting ? "Deleting..." : (
                                        <>
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Delete Everything
                                        </>
                                    )}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-destructive">Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all HSN master data
                                        and remove all search embeddings from the database. The system will be empty.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        Yes, Delete Everything
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </CardContent>
            </Card>

            {/* Shared Animation Style for Indeterminate Bar */}
            {(uploading || processing || deleting) && (
                <style jsx global>{`
                        @keyframes indeterminate-bar {
                            0% { transform: translateX(-100%); width: 20%; }
                            50% { width: 40%; }
                            100% { transform: translateX(300%); width: 20%; }
                        }
                        .animate-indeterminate-bar {
                            animation: indeterminate-bar 1.5s infinite linear;
                        }
                    `}</style>
            )}
        </div>
    );
}
