"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import {
    FileText,
    Plus,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Download
} from "lucide-react";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function LutPage() {
    const [luts, setLuts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        lut_number: "",
        financial_year: "2024-25",
        valid_from: "",
        valid_to: "",
        filed_date: "",
        acknowledgment_number: "",
        document_url: ""
    });

    useEffect(() => {
        fetchLuts();
    }, []);

    const fetchLuts = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/compliance/lut");
            const data = await res.json();
            if (data.luts) {
                setLuts(data.luts);
            }
        } catch (error) {
            console.error("Error fetching LUTs:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLut = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/compliance/lut", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create LUT");
            }

            toast({ title: "Success", description: "LUT added successfully" });
            setIsAddDialogOpen(false);
            setFormData({
                lut_number: "",
                financial_year: "2024-25",
                valid_from: "",
                valid_to: "",
                filed_date: "",
                acknowledgment_number: "",
                document_url: ""
            });
            fetchLuts();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const StatusBadge = ({ status, endDate }: { status: string, endDate: string }) => {
        const isExpired = new Date(endDate) < new Date();

        if (status === 'cancelled') {
            return <Badge variant="destructive">Cancelled</Badge>;
        }

        if (isExpired) {
            return <Badge variant="secondary">Expired</Badge>;
        }

        return <Badge variant="default" className="bg-green-600">Active</Badge>;
    };

    return (
        <PageContainer>
            <PageHeader
                title="Letter of Undertaking (LUT)"
                description="Manage your GST LUTs for zero-rated exports"
            >
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add LUT
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add New LUT</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddLut} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>LUT Number *</Label>
                                    <Input value={formData.lut_number} onChange={(e) => setFormData(prev => ({ ...prev, lut_number: e.target.value }))} required placeholder="ARN or LUT No." />
                                </div>
                                <div>
                                    <Label>Financial Year *</Label>
                                    <Input value={formData.financial_year} onChange={(e) => setFormData(prev => ({ ...prev, financial_year: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Valid From *</Label>
                                    <Input type="date" value={formData.valid_from} onChange={(e) => setFormData(prev => ({ ...prev, valid_from: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Valid To *</Label>
                                    <Input type="date" value={formData.valid_to} onChange={(e) => setFormData(prev => ({ ...prev, valid_to: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Filed Date</Label>
                                    <Input type="date" value={formData.filed_date} onChange={(e) => setFormData(prev => ({ ...prev, filed_date: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Acknowledgment Number</Label>
                                    <Input value={formData.acknowledgment_number} onChange={(e) => setFormData(prev => ({ ...prev, acknowledgment_number: e.target.value }))} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Save LUT Details</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Active & Past LUTs</CardTitle>
                        <CardDescription>
                            LUT is required to export goods without payment of IGST
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {luts.length === 0 ? (
                            <div className="text-center py-10 border-2 border-dashed rounded-lg">
                                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                <h3 className="text-lg font-medium">No LUTs Found</h3>
                                <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                    Add your current Letter of Undertaking to enable zero-rated export tracking.
                                </p>
                                <Button variant="outline" onClick={() => setIsAddDialogOpen(true)}>
                                    Add Your First LUT
                                </Button>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Financial Year</TableHead>
                                        <TableHead>LUT Number</TableHead>
                                        <TableHead>Validity Period</TableHead>
                                        <TableHead>Acknowledgment</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {luts.map((lut) => (
                                        <TableRow key={lut.id}>
                                            <TableCell className="font-medium">{lut.financial_year}</TableCell>
                                            <TableCell>{lut.lut_number}</TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {new Date(lut.valid_from).toLocaleDateString()} - <span className="text-muted-foreground">{new Date(lut.valid_to).toLocaleDateString()}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{lut.acknowledgment_number || '-'}</TableCell>
                                            <TableCell>
                                                <StatusBadge status={lut.status} endDate={lut.valid_to} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                <div className="grid md:grid-cols-3 gap-6">
                    <Card className="bg-blue-50 border-blue-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4" /> Why file LUT?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-blue-700">
                            Filing LUT allows you to export goods without paying IGST upfront, improving cash flow. Without LUT, you must pay IGST and claim a refund later.
                        </CardContent>
                    </Card>
                    <Card className="bg-orange-50 border-orange-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-orange-800 flex items-center gap-2">
                                <Calendar className="h-4 w-4" /> Validity
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-orange-700">
                            An LUT is valid for one financial year. You must renew it before March 31st each year to ensure seamless exports in the new financial year.
                        </CardContent>
                    </Card>
                    <Card className="bg-purple-50 border-purple-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base text-purple-800 flex items-center gap-2">
                                <FileText className="h-4 w-4" /> GSTR-1
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-purple-700">
                            Exports under LUT must be reported in GSTR-1 Table 6A under "Export without payment of tax" using the LUT number.
                        </CardContent>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}
