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
import { Separator } from "@/components/ui/separator";
import { Calculator, FileText, Database, Loader2, TrendingUp, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

export default function IncentivesPage() {
    const [activeTab, setActiveTab] = useState("calculator");
    const [shippingBills, setShippingBills] = useState<any[]>([]);
    const [selectedSB, setSelectedSB] = useState<string>("");
    const [calculationType, setCalculationType] = useState<"rodtep" | "duty_drawback">("rodtep");
    const [calculating, setCalculating] = useState(false);
    const [calculationResult, setCalculationResult] = useState<any>(null);
    const [claims, setClaims] = useState<any[]>([]);
    const [loadingClaims, setLoadingClaims] = useState(false);
    const [isClaimDialogOpen, setIsClaimDialogOpen] = useState(false);
    const [claimNotes, setClaimNotes] = useState("");
    const { toast } = useToast();

    // Fetch shipping bills
    useEffect(() => {
        fetchShippingBills();
        fetchClaims();
    }, []);

    const fetchShippingBills = async () => {
        try {
            const res = await fetch("/api/shipping-bills");
            const data = await res.json();
            if (data.shippingBills) {
                // Only show filed/cleared shipping bills (not drafted)
                const eligibleBills = data.shippingBills.filter((sb: any) =>
                    sb.status === 'filed' || sb.status === 'cleared' || sb.status === 'shipped'
                );
                setShippingBills(eligibleBills);
            }
        } catch (error) {
            console.error("Error fetching shipping bills:", error);
        }
    };

    const fetchClaims = async () => {
        setLoadingClaims(true);
        try {
            const res = await fetch("/api/incentives/claims");
            const data = await res.json();
            if (data.claims) {
                setClaims(data.claims);
            }
        } catch (error) {
            console.error("Error fetching claims:", error);
        } finally {
            setLoadingClaims(false);
        }
    };

    const handleCalculate = async () => {
        if (!selectedSB) {
            toast({ title: "Error", description: "Please select a shipping bill", variant: "destructive" });
            return;
        }

        setCalculating(true);
        setCalculationResult(null);

        try {
            const endpoint = calculationType === "rodtep"
                ? "/api/incentives/rodtep/calculate"
                : "/api/incentives/duty-drawback/calculate";

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ shipping_bill_id: selectedSB })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Calculation failed");
            }

            setCalculationResult(data);
            toast({ title: "Success", description: "Incentive calculated successfully" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setCalculating(false);
        }
    };

    const handleFileClaim = async () => {
        if (!calculationResult) return;

        try {
            const claimData: any = {
                shipping_bill_id: calculationResult.shipping_bill_id,
                claim_type: calculationType,
                notes: claimNotes
            };

            if (calculationType === "rodtep") {
                claimData.rodtep_amount = calculationResult.total_rodtep_amount;
                claimData.rodtep_rate = calculationResult.average_rodtep_rate;
            } else {
                claimData.drawback_amount = calculationResult.total_drawback_amount;
                claimData.drawback_rate = calculationResult.average_drawback_rate;
            }

            const res = await fetch("/api/incentives/claims", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(claimData)
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to file claim");
            }

            toast({ title: "Success", description: "Claim filed successfully" });
            setIsClaimDialogOpen(false);
            setClaimNotes("");
            fetchClaims();
            setActiveTab("claims");
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: any = {
            pending: 'secondary',
            filed: 'default',
            approved: 'default',
            rejected: 'destructive',
            received: 'default'
        };
        return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold">Incentives Calculator</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Calculate RoDTEP and Duty Drawback benefits for your exports
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="calculator">
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculator
                    </TabsTrigger>
                    <TabsTrigger value="claims">
                        <FileText className="h-4 w-4 mr-2" />
                        Claims
                    </TabsTrigger>
                    <TabsTrigger value="rates">
                        <Database className="h-4 w-4 mr-2" />
                        Rates
                    </TabsTrigger>
                </TabsList>

                {/* CALCULATOR TAB */}
                <TabsContent value="calculator" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Calculate Export Incentives</CardTitle>
                            <CardDescription>
                                Select a shipping bill and calculation type to estimate your incentive benefits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Shipping Bill</Label>
                                    <Select value={selectedSB} onValueChange={setSelectedSB}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select shipping bill" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {shippingBills.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    No filed shipping bills available
                                                </div>
                                            ) : (
                                                shippingBills.map(sb => (
                                                    <SelectItem key={sb.id} value={sb.id}>
                                                        {sb.sb_number} - {sb.export_orders?.entities?.name} ({sb.currency_code} {Number(sb.fob_value).toFixed(2)})
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Incentive Type</Label>
                                    <Select value={calculationType} onValueChange={(val: any) => setCalculationType(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="rodtep">RoDTEP</SelectItem>
                                            <SelectItem value="duty_drawback">Duty Drawback</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Button onClick={handleCalculate} disabled={calculating || !selectedSB}>
                                {calculating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Calculating...
                                    </>
                                ) : (
                                    <>
                                        <Calculator className="mr-2 h-4 w-4" />
                                        Calculate {calculationType === "rodtep" ? "RoDTEP" : "Duty Drawback"}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    {/* CALCULATION RESULTS */}
                    {calculationResult && (
                        <Card>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>Calculation Results</CardTitle>
                                        <CardDescription>
                                            {calculationResult.shipping_bill_number} - {calculationResult.buyer}
                                        </CardDescription>
                                    </div>
                                    <Dialog open={isClaimDialogOpen} onOpenChange={setIsClaimDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <FileText className="mr-2 h-4 w-4" />
                                                File Claim
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>File Incentive Claim</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4 pt-4">
                                                <div>
                                                    <Label>Notes (Optional)</Label>
                                                    <Textarea
                                                        placeholder="Add any notes or comments..."
                                                        value={claimNotes}
                                                        onChange={(e) => setClaimNotes(e.target.value)}
                                                    />
                                                </div>
                                                <Button onClick={handleFileClaim} className="w-full">
                                                    Submit Claim
                                                </Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>FOB Value</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {calculationResult.currency} {Number(calculationResult.total_fob_value).toLocaleString()}
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Average Rate</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {calculationType === "rodtep"
                                                    ? calculationResult.average_rodtep_rate
                                                    : calculationResult.average_drawback_rate}%
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardDescription>Total Incentive</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-600">
                                                {calculationResult.currency} {
                                                    calculationType === "rodtep"
                                                        ? Number(calculationResult.total_rodtep_amount).toLocaleString()
                                                        : Number(calculationResult.total_drawback_amount).toLocaleString()
                                                }
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Separator />

                                {/* HSN-wise Breakdown */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">HSN-wise Breakdown</h3>
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader className="bg-muted/50">
                                                <TableRow>
                                                    <TableHead>HSN Code</TableHead>
                                                    <TableHead>Description</TableHead>
                                                    <TableHead className="text-right">Quantity</TableHead>
                                                    <TableHead className="text-right">FOB Value</TableHead>
                                                    <TableHead className="text-right">Rate</TableHead>
                                                    <TableHead className="text-right">Incentive Amount</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {calculationResult.items.map((item: any, idx: number) => (
                                                    <TableRow key={idx}>
                                                        <TableCell className="font-mono">{item.hsn_code}</TableCell>
                                                        <TableCell>{item.description}</TableCell>
                                                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                                                        <TableCell className="text-right">{Number(item.fob_value).toFixed(2)}</TableCell>
                                                        <TableCell className="text-right">
                                                            {calculationType === "rodtep"
                                                                ? `${item.rodtep_rate}%`
                                                                : item.calculation_method || `${item.drawback_rate_percentage}%`
                                                            }
                                                        </TableCell>
                                                        <TableCell className="text-right font-semibold">
                                                            {calculationType === "rodtep"
                                                                ? Number(item.rodtep_amount).toFixed(2)
                                                                : Number(item.drawback_amount).toFixed(2)
                                                            }
                                                        </TableCell>
                                                        <TableCell>
                                                            {item.applicable ? (
                                                                <Badge variant="default" className="gap-1">
                                                                    <CheckCircle2 className="h-3 w-3" />
                                                                    Eligible
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="secondary" className="gap-1">
                                                                    <AlertCircle className="h-3 w-3" />
                                                                    No Rate
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                {/* CLAIMS TAB */}
                <TabsContent value="claims" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Filed Claims</CardTitle>
                            <CardDescription>Track your incentive claim submissions and status</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingClaims ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : claims.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                    <h3 className="text-lg font-medium">No claims filed yet</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
                                        Calculate incentives and file claims from the Calculator tab
                                    </p>
                                </div>
                            ) : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead>SB Number</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Amount</TableHead>
                                                <TableHead>RoDTEP Status</TableHead>
                                                <TableHead>Drawback Status</TableHead>
                                                <TableHead>Filed Date</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {claims.map((claim) => (
                                                <TableRow key={claim.id}>
                                                    <TableCell className="font-medium">
                                                        {claim.shipping_bills?.sb_number}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{claim.claim_type}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        {claim.rodtep_amount && `₹${Number(claim.rodtep_amount).toLocaleString()}`}
                                                        {claim.drawback_amount && `₹${Number(claim.drawback_amount).toLocaleString()}`}
                                                    </TableCell>
                                                    <TableCell>
                                                        {claim.rodtep_status && getStatusBadge(claim.rodtep_status)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {claim.drawback_status && getStatusBadge(claim.drawback_status)}
                                                    </TableCell>
                                                    <TableCell>
                                                        {new Date(claim.created_at).toLocaleDateString()}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* RATES TAB */}
                <TabsContent value="rates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rate Tables</CardTitle>
                            <CardDescription>
                                Browse RoDTEP and Duty Drawback rates by HSN code
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                Rate tables are managed by administrators. Contact your admin to update rates or add new HSN codes.
                            </p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <div className="grid md:grid-cols-3 gap-6 pt-4">
                <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-blue-800 flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> RoDTEP Scheme
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-blue-700">
                        Remission of Duties and Taxes on Exported Products (RoDTEP) refunds embedded central, state, and local duties that were not rebated under other schemes.
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-green-800 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" /> Duty Drawback
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-green-700">
                        Duty Drawback (DBK) rebates customs and central excise duties chargeable on imported and indigenous materials used in the manufacture of export goods.
                    </CardContent>
                </Card>
                <Card className="bg-purple-50 border-purple-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base text-purple-800 flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Claim Process
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-purple-700">
                        You must link your incentive claims to specific Shipping Bills. Ensure your scroll is generated in ICEGATE before realizing the actual payment.
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
