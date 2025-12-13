"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";

export default function LandedCostCalculatorPage() {
    const [values, setValues] = useState({
        productCost: 0,
        freight: 0,
        insurance: 0,
        dutyRate: 0,
        exchangeRate: 1, // Default 1 if same currency or pre-converted
    });

    const [result, setResult] = useState<any>(null);

    const calculate = () => {
        const cif = (values.productCost + values.freight + values.insurance) * values.exchangeRate;
        const duty = cif * (values.dutyRate / 100);
        const socialWelfareSurcharge = duty * 0.10; // 10% SWS in India usually
        const totalCustoms = duty + socialWelfareSurcharge;
        const landedCost = cif + totalCustoms;
        // GST usually on (CIF + Customs) -> IGST
        // Simple MVP calc

        setResult({
            cif,
            duty,
            sws: socialWelfareSurcharge,
            totalCustoms,
            landedCost
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value) || 0;
        setValues({ ...values, [e.target.name]: val });
    };

    return (
        <PageContainer>
            <PageHeader
                title="Landed Cost Calculator"
                description="Estimate the total cost of importing goods into India."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Inputs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Product Cost (FX)</Label>
                            <Input name="productCost" type="number" placeholder="1000" onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Freight (FX)</Label>
                            <Input name="freight" type="number" placeholder="100" onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Insurance (FX)</Label>
                            <Input name="insurance" type="number" placeholder="50" onChange={handleChange} />
                        </div>
                        <Separator />
                        <div className="space-y-2">
                            <Label>Exchange Rate (to INR)</Label>
                            <Input name="exchangeRate" type="number" placeholder="83.5" onChange={handleChange} />
                        </div>
                        <div className="space-y-2">
                            <Label>Basic Customs Duty (%)</Label>
                            <Input name="dutyRate" type="number" placeholder="10" onChange={handleChange} />
                        </div>
                        <Button onClick={calculate} className="w-full mt-4">Calculate</Button>
                    </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                    <CardHeader>
                        <CardTitle>Results (INR)</CardTitle>
                        <CardDescription>Breakdown of costs</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {result ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span>CIF Value:</span>
                                    <span className="font-medium">{result.cif.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>Basic Duty ({values.dutyRate}%):</span>
                                    <span>{result.duty.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-sm text-muted-foreground">
                                    <span>SWS (10%):</span>
                                    <span>{result.sws.toFixed(2)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between font-medium">
                                    <span>Total Customs:</span>
                                    <span>{result.totalCustoms.toFixed(2)}</span>
                                </div>
                                <Separator className="bg-slate-300" />
                                <div className="flex justify-between text-lg font-bold text-primary">
                                    <span>Landed Cost:</span>
                                    <span>{result.landedCost.toFixed(2)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-muted-foreground py-10">
                                Enter values to calculate
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </PageContainer>
    );
}
