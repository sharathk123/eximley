
"use client";

import { useState } from "react";
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";


export default function HSNIngest() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ count: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setResult(null);
            setError(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/admin/hsn/ingest", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Upload failed");
            }

            setResult({ count: data.count, total: data.totalParsed });
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-2xl mx-auto shadow-md border-slate-200">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <UploadCloud className="w-6 h-6 text-blue-600" />
                    Ingest HSN Data
                </CardTitle>
                <CardDescription>
                    Upload an official HSN list (PDF, XLSX, CSV) to parse and generate semantic embeddings.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Dropzone */}
                <div
                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer
                        ${file ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 hover:border-slate-400 hover:bg-slate-50'}
                    `}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('hsn-file-upload')?.click()}
                >
                    <input
                        id="hsn-file-upload"
                        type="file"
                        accept=".pdf,.xlsx,.csv,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {file ? (
                        <div className="text-center animate-in fade-in zoom-in duration-300">
                            <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                            <p className="font-semibold text-slate-700">{file.name}</p>
                            <p className="text-xs text-slate-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">
                            <UploadCloud className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                            <p className="font-medium">Click or Drag file to upload</p>
                            <p className="text-xs mt-1">Supports PDF, XLSX, CSV</p>
                        </div>
                    )}
                </div>

                {/* Status Alerts */}
                {loading && (
                    <div className="flex items-center justify-center p-4 bg-slate-100 rounded-lg text-slate-600 gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-sm font-medium">Processing... large files may take a moment.</span>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
                        <AlertCircle className="h-5 w-5 mt-0.5 text-red-600 shrink-0" />
                        <div>
                            <h4 className="font-medium text-sm">Error</h4>
                            <p className="text-sm mt-1 opacity-90">{error}</p>
                        </div>
                    </div>
                )}

                {result && (
                    <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex items-start gap-3 animate-in slide-in-from-top-2">
                        <CheckCircle className="h-5 w-5 mt-0.5 text-green-600 shrink-0" />
                        <div>
                            <h4 className="font-medium text-sm">Success</h4>
                            <p className="text-sm mt-1 opacity-90">
                                Parsed {result.total} records. Successfully embedded and stored {result.count} entries.
                            </p>
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="justify-end border-t pt-4 bg-slate-50/50">
                <Button onClick={handleUpload} disabled={!file || loading} className="min-w-[120px]">
                    {loading ? "Ingesting..." : "Start Ingestion"}
                </Button>
            </CardFooter>
        </Card>
    );
}
