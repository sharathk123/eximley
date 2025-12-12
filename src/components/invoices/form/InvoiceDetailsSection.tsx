"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';

interface InvoiceDetailsSectionProps {
    control: Control<any>;
    buyers: any[];
}

export function InvoiceDetailsSection({ control, buyers }: InvoiceDetailsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={control}
                        name="buyer_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Buyer <span className="text-destructive">*</span></FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Buyer" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {buyers.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Date <span className="text-destructive">*</span></FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
