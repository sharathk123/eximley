"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';

interface FinancialsSectionProps {
    control: Control<any>;
    currencies: any[];
    luts: any[];
}

export function FinancialsSection({ control, currencies, luts }: FinancialsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Financials & Basic Info</CardTitle>
                <CardDescription>Buyer details, currency, and validity.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={control}
                        name="currency_code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Currency <span className="text-destructive">*</span></FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Currency" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {currencies.map(c => (
                                            <SelectItem key={c.code} value={c.code}>
                                                {c.code} - {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="conversion_rate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Exchange Rate (to Local)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="lut_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>LUT (Zero-rated export)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || " "}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Active LUT" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value=" ">None (IGST Paid)</SelectItem>
                                        {luts.map(lut => (
                                            <SelectItem key={lut.id} value={lut.id}>
                                                {lut.lut_number} (FY {lut.financial_year})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormDescription className="text-xs">
                                    Leave empty if paying IGST.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
