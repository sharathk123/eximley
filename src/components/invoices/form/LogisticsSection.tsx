"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Control } from 'react-hook-form';

interface LogisticsSectionProps {
    control: Control<any>;
    incoterms: any[];
    banks: any[];
    paymentTerms?: any[];
}

export function LogisticsSection({ control, incoterms, banks, paymentTerms = [] }: LogisticsSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Logistics & Terms</CardTitle>
                <CardDescription>Shipping terms, ports, and payment instructions.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <FormField
                        control={control}
                        name="incoterm"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Incoterm</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Term" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {incoterms.map(i => (
                                            <SelectItem key={i.code} value={i.code}>{i.code} - {i.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="incoterm_place"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Incoterm Place</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Mumbai / New York" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="payment_terms"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>Payment Terms</FormLabel>
                                <div className="space-y-2">
                                    <Select onValueChange={(val) => field.onChange(val)}>
                                        <SelectTrigger className="w-full text-muted-foreground">
                                            <SelectValue placeholder="Quick Select (Optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {paymentTerms?.map((term) => (
                                                <SelectItem key={term.id} value={term.label}>
                                                    <div className="flex flex-col items-start text-left">
                                                        <span className="font-medium">{term.label}</span>
                                                        {term.description && (
                                                            <span className="text-xs text-muted-foreground text-wrap max-w-[300px] leading-tight mt-0.5">
                                                                {term.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormControl>
                                        <Input placeholder="e.g. 50% Advance/Balance against BL" {...field} />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                        control={control}
                        name="port_of_loading"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Port of Loading</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Nhava Sheva" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="port_of_discharge"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Port of Discharge</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Jebel Ali" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={control}
                        name="bank_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Bank Account</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || " "}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Bank" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value=" ">None (Use Default)</SelectItem>
                                        {banks.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.bank_name} - {b.account_number} ({b.currency})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
