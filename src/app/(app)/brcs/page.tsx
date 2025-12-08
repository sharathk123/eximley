"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
    FileText,
    Loader2,
    DollarSign,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    TrendingUp,
    Calendar
} from "lucide-react";

export default function BRCsPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [brcs, setBrcs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [complianceData, setComplianceData] = useState<any>(null);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isRealizeDialogOpen, setIsRealizeDialogOpen] = useState(false);
    const [selectedBrc, setSelectedBrc] = useState<any>(null);
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        shipping_bill_id: "",
        invoice_value: "",
        currency_code: "USD",
        export_date: "",
        bank_name: "",
        bank_branch: "",
        ad_code: "",
        notes: ""
    });

    const [paymentData, setPaymentData] = useState({
        amount: "",
        payment_date: "",
        payment_reference: "",
        exchange_rate: "",
        amount_inr: ""
    });

    useEffect(() => {
        fetchBRCs();
        fetchComplianceData();
        fetchShippingBills();
    }, []);

    const fetchBRCs = async (status?: string) => {
        setLoading(true);
        try {
            const url = status && status !== "all" ? `/api/brcs?status=${status}` : "/api/brcs";
            const res = await fetch(url);
            const data = await res.json();
            if (data.brcs) {
                setBrcs(data.brcs);
            }
        } catch (error) {
            console.error("Error fetching BRCs:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchComplianceData = async () => {
        try {
            const res = await fetch("/api/brcs/compliance");
            const data = await res.json();
            setComplianceData(data);
        } catch (error) {
            console.error("Error fetching compliance data:", error);
        }
    };

    const fetchShippingBills = async () => {
        try {
            const res = await fetch("/api/shipping-bills");
            const data = await res.json();
            if (data.shippingBills) {
                // Only show filed/cleared shipping bills
                const eligible = data.shippingBills.filter((sb: any) =>
                    sb.status === 'filed' || sb.status === 'cleared' || sb.status === 'shipped'
                );
                setShippingBills(eligible);
            }
        } catch (error) {
            console.error("Error fetching shipping bills:", error);
        }
    };

    const handleAddBRC = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/brcs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create BRC");
            }

            toast({ title: "Success", description: "BRC created successfully" });
            setIsAddDialogOpen(false);
            setFormData({
                shipping_bill_id: "",
                invoice_value: "",
                currency_code: "USD",
                export_date: "",
                bank_name: "",
                bank_branch: "",
                ad_code: "",
                notes: ""
            });
            fetchBRCs();
            fetchComplianceData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const handleRealizePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBrc) return;

        try {
            const res = await fetch(`/api/brcs/${selectedBrc.id}/realize`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(paymentData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to realize payment");
            }

            toast({ title: "Success", description: "Payment realized successfully" });
            setIsRealizeDialogOpen(false);
            setPaymentData({
                amount: "",
                payment_date: "",
                payment_reference: "",
                exchange_rate: "",
                amount_inr: ""
            });
            fetchBRCs();
            fetchComplianceData();
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: any = {
            pending: { variant: 'secondary', icon: Clock, color: 'text-gray-600' },
            partial: { variant: 'default', icon: TrendingUp, color: 'text-yellow-600' },
            full: { variant: 'default', icon: CheckCircle2, color: 'text-green-600' },
            overdue: { variant: 'destructive', icon: AlertTriangle, color: 'text-red-600' }
        };
        const config = variants[status] || variants.pending;
        const Icon = config.icon;

        return (
            <Badge variant={config.variant} className="gap-1">
                <Icon className="h-3 w-3" />
                {status}
            </Badge>
        );
    };

    const getDaysRemainingBadge = (days: number) => {
        if (days < 0) {
            return <Badge variant="destructive">{Math.abs(days)} days overdue</Badge>;
        } else if (days <= 7) {
            return <Badge variant="destructive">{days} days left</Badge>;
        } else if (days <= 30) {
            return <Badge variant="default" className="bg-orange-500">{days} days left</Badge>;
        } else {
            return <Badge variant="secondary">{days} days left</Badge>;
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">e-BRC Tracking</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track export proceeds realization and RBI compliance
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add BRC
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Create New BRC</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleAddBRC} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Shipping Bill *</Label>
                                    <Select value={formData.shipping_bill_id} onValueChange={(val) => setFormData(prev => ({ ...prev, shipping_bill_id: val }))}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select shipping bill" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shippingBills.map(sb => (
                                                <SelectItem key={sb.id} value={sb.id}>
                                                    {sb.sb_number} - {sb.export_orders?.entities?.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Invoice Value *</Label>
                                    <Input type="number" step="0.01" value={formData.invoice_value} onChange={(e) => setFormData(prev => ({ ...prev, invoice_value: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Currency *</Label>
                                    <Select value={formData.currency_code} onValueChange={(val) => setFormData(prev => ({ ...prev, currency_code: val }))}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="GBP">GBP</SelectItem>
                                            <SelectItem value="INR">INR</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Export Date *</Label>
                                    <Input type="date" value={formData.export_date} onChange={(e) => setFormData(prev => ({ ...prev, export_date: e.target.value }))} required />
                                </div>
                                <div>
                                    <Label>Bank Name</Label>
                                    <Input value={formData.bank_name} onChange={(e) => setFormData(prev => ({ ...prev, bank_name: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>Bank Branch</Label>
                                    <Input value={formData.bank_branch} onChange={(e) => setFormData(prev => ({ ...prev, bank_branch: e.target.value }))} />
                                </div>
                                <div>
                                    <Label>AD Code</Label>
                                    <Input value={formData.ad_code} onChange={(e) => setFormData(prev => ({ ...prev, ad_code: e.target.value }))} placeholder="Authorized Dealer Code" />
                                </div>
                                <div className="col-span-2">
                                    <Label>Notes</Label>
                                    <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} />
                                </div>
                            </div>
                            <Button type="submit" className="w-full">Create BRC</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); fetchBRCs(val); }}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="pending">Pending</TabsTrigger>
                    <TabsTrigger value="partial">Partial</TabsTrigger>
                    <TabsTrigger value="full">Realized</TabsTrigger>
                    <TabsTrigger value="overdue">Overdue</TabsTrigger>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="space-y-4">
                    {activeTab === "overview" && complianceData ? (
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-4 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Total BRCs</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{complianceData.stats.total_brcs}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Pending</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-gray-600">{complianceData.stats.pending}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Overdue</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-600">{complianceData.stats.overdue}</div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardDescription>Pending Amount</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">${complianceData.stats.total_pending_amount.toLocaleString()}</div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Overdue Alert */}
                            {complianceData.overdue_brcs.length > 0 && (
                                <Card className="border-red-200 bg-red-50">
                                    <CardHeader>
                                        <CardTitle className="text-red-600 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5" />
                                            Overdue BRCs - Immediate Action Required
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {complianceData.overdue_brcs.map((brc: any) => (
                                                <div key={brc.id} className="flex justify-between items-center p-3 bg-white rounded border">
                                                    <div>
                                                        <div className="font-medium">{brc.shipping_bills?.sb_number}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {brc.shipping_bills?.export_orders?.entities?.name}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">{brc.currency_code} {Number(brc.pending_amount).toLocaleString()}</div>
                                                        <div className="text-sm text-red-600 font-medium">
                                                            {Math.abs(brc.days_remaining)} days overdue
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Upcoming Due */}
                            {complianceData.upcoming_due.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <Calendar className="h-5 w-5" />
                                            Due in Next 30 Days
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2">
                                            {complianceData.upcoming_due.map((brc: any) => (
                                                <div key={brc.id} className="flex justify-between items-center p-3 bg-muted rounded">
                                                    <div>
                                                        <div className="font-medium">{brc.shipping_bills?.sb_number}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            Due: {new Date(brc.due_date).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold">{brc.currency_code} {Number(brc.pending_amount).toLocaleString()}</div>
                                                        {getDaysRemainingBadge(brc.days_remaining)}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="pt-6">
                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                    </div>
                                ) : brcs.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                        <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                        <h3 className="text-lg font-medium">No BRCs found</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                                            Create BRCs to track export proceeds realization
                                        </p>
                                    </div>
                                ) : (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>SB Number</TableHead>
                                                    <TableHead>Buyer</TableHead>
                                                    <TableHead>Export Date</TableHead>
                                                    <TableHead className="text-right">Invoice Value</TableHead>
                                                    <TableHead className="text-right">Realized</TableHead>
                                                    <TableHead className="text-right">Pending</TableHead>
                                                    <TableHead>Due Date</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {brcs.map((brc) => (
                                                    <TableRow key={brc.id}>
                                                        <TableCell className="font-medium">{brc.shipping_bills?.sb_number}</TableCell>
                                                        <TableCell>{brc.shipping_bills?.export_orders?.entities?.name}</TableCell>
                                                        <TableCell>{new Date(brc.export_date).toLocaleDateString()}</TableCell>
                                                        <TableCell className="text-right">{brc.currency_code} {Number(brc.invoice_value).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right">{brc.currency_code} {Number(brc.realized_amount).toLocaleString()}</TableCell>
                                                        <TableCell className="text-right font-semibold">{brc.currency_code} {Number(brc.pending_amount).toLocaleString()}</TableCell>
                                                        <TableCell>
                                                            <div>{new Date(brc.due_date).toLocaleDateString()}</div>
                                                            <div className="text-xs">{getDaysRemainingBadge(brc.days_remaining)}</div>
                                                        </TableCell>
                                                        <TableCell>{getStatusBadge(brc.realization_status)}</TableCell>
                                                        <TableCell>
                                                            {brc.realization_status !== 'full' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setSelectedBrc(brc);
                                                                        setIsRealizeDialogOpen(true);
                                                                    }}
                                                                >
                                                                    <DollarSign className="h-4 w-4 mr-1" />
                                                                    Realize
                                                                </Button>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Realize Payment Dialog */}
            <Dialog open={isRealizeDialogOpen} onOpenChange={setIsRealizeDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Realize Payment</DialogTitle>
                    </DialogHeader>
                    {selectedBrc && (
                        <form onSubmit={handleRealizePayment} className="space-y-4 pt-4">
                            <div className="p-3 bg-muted rounded">
                                <div className="text-sm text-muted-foreground">Pending Amount</div>
                                <div className="text-xl font-bold">{selectedBrc.currency_code} {Number(selectedBrc.pending_amount).toLocaleString()}</div>
                            </div>
                            <div>
                                <Label>Payment Amount *</Label>
                                <Input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData(prev => ({ ...prev, amount: e.target.value }))} required />
                            </div>
                            <div>
                                <Label>Payment Date *</Label>
                                <Input type="date" value={paymentData.payment_date} onChange={(e) => setPaymentData(prev => ({ ...prev, payment_date: e.target.value }))} required />
                            </div>
                            <div>
                                <Label>Payment Reference</Label>
                                <Input value={paymentData.payment_reference} onChange={(e) => setPaymentData(prev => ({ ...prev, payment_reference: e.target.value }))} placeholder="SWIFT/Bank reference" />
                            </div>
                            <Button type="submit" className="w-full">Record Payment</Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
