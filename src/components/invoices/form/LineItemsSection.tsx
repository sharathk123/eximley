"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { Control, useFieldArray, useWatch } from 'react-hook-form';

interface LineItemsSectionProps {
    control: Control<any>;
    skus: any[];
    currency: string;
}

export function LineItemsSection({ control, skus, currency }: LineItemsSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "items"
    });

    // Helper to calculate item total safely
    const ItemTotal = ({ index }: { index: number }) => {
        const item = useWatch({
            control,
            name: `items.${index}`
        });

        if (!item) return <>0.00</>;
        const total = (item.quantity || 0) * (item.unit_price || 0);
        return <>{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</>;
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Line Items</CardTitle>
                    <CardDescription>Add products and quantities.</CardDescription>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ sku_id: "", hsn_code: "", unit_of_measurement: "", quantity: 1, unit_price: 0, net_weight: 0, gross_weight: 0 })}
                >
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-card/50">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                                <FormField
                                    control={control}
                                    name={`items.${index}.sku_id`}
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Product/SKU <span className="text-destructive">*</span></FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select Product" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {skus.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>
                                                            {s.sku_code} - {s.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 mt-8"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <FormField
                                control={control}
                                name={`items.${index}.hsn_code`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>HSN Code <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 620342" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`items.${index}.unit_of_measurement`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>UOM <span className="text-destructive">*</span></FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select UOM" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="PCS">PCS (Pieces)</SelectItem>
                                                <SelectItem value="KGS">KGS (Kilograms)</SelectItem>
                                                <SelectItem value="MTR">MTR (Meters)</SelectItem>
                                                <SelectItem value="LTR">LTR (Liters)</SelectItem>
                                                <SelectItem value="SET">SET (Sets)</SelectItem>
                                                <SelectItem value="DOZ">DOZ (Dozen)</SelectItem>
                                                <SelectItem value="PAI">PAI (Pairs)</SelectItem>
                                                <SelectItem value="TON">TON (Metric Tons)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`items.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Qty <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <FormField
                                control={control}
                                name={`items.${index}.unit_price`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Unit Price <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`items.${index}.net_weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Net Wt (KG) <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name={`items.${index}.gross_weight`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Gross Wt (KG) <span className="text-destructive">*</span></FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" placeholder="0.00" {...field} onChange={e => field.onChange(Number(e.target.value))} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="flex flex-col justify-end pb-2">
                                <div className="text-right text-sm text-muted-foreground">Total</div>
                                <div className="text-right font-semibold text-lg">
                                    {currency || 'USD'} <ItemTotal index={index} />
                                </div>
                            </div>
                        </div>

                        <FormField
                            control={control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs text-muted-foreground">Description (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={1} className="min-h-[40px] resize-none" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}
