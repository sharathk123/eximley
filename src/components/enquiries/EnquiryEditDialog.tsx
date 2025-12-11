"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const itemSchema = z.object({
    sku_id: z.string().min(1, "Product/SKU is required"),
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    target_price: z.coerce.number().optional(),
    notes: z.string().optional(),
});

const enquirySchema = z.object({
    customer_name: z.string().min(1, "Customer name is required"),
    customer_email: z.string().min(1, "Email is required").email("Invalid email address"),
    customer_phone: z.string().min(1, "Phone is required"),
    customer_company: z.string().optional(),
    customer_country: z.string().optional(),
    currency_code: z.string().optional(),
    source: z.enum(["website", "referral", "trade_show", "social_media", "email", "phone", "other"]),
    subject: z.string().optional(),
    description: z.string().optional(),
    priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
    next_follow_up_date: z.string().optional(),
    items: z.array(itemSchema),
});

// ... (lines 38-190 unchanged)

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="customer_email" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                                    <FormControl><Input placeholder="john@example.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="customer_phone" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone <span className="text-destructive">*</span></FormLabel>
                                    <div className="flex gap-2">
                                        <Select
                                            value={field.value?.split(' ')[0] || ""}
                                            onValueChange={(val) => {
                                                const currentNumber = field.value?.split(' ')[1] || "";
                                                field.onChange(`${val} ${currentNumber}`);
                                            }}
                                        >
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue placeholder="Code" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {countries.reduce((acc: any[], current) => {
                                                    const x = acc.find(item => item.phone_code === current.phone_code);
                                                    if (!x) {
                                                        return acc.concat([current]);
                                                    } else {
                                                        return acc;
                                                    }
                                                }, []).map((c) => (
                                                    <SelectItem key={c.id} value={c.phone_code}>
                                                        <span className="mr-2">{c.flag_emoji}</span>
                                                        {c.phone_code}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormControl>
                                            <Input
                                                placeholder="1234567890"
                                                value={field.value?.split(' ')[1] || field.value?.replace(/^\+[\d]+\s/, '') || ""}
                                                onChange={(e) => {
                                                    const code = field.value?.split(' ')[0] || "";
                                                    field.onChange(`${code} ${e.target.value}`);
                                                }}
                                            />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

// ... (lines 243-400 unchanged)

                                        {form.formState.errors.items?.[index]?.sku_id && (
                                            <p className="text-[10px] text-destructive mt-1">Product is required</p>
                                        )}
                                    </div>
                                    <div className="col-span-3">
                                        <FormLabel className="text-xs">Qty <span className="text-destructive">*</span></FormLabel>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs"
                                            min="1"
                                            {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <FormLabel className="text-xs">Target Price</FormLabel>
                                        <Input
                                            type="number"
                                            className="h-8 text-xs"
                                            {...form.register(`items.${index}.target_price`, { valueAsNumber: true })}
                                        />
                                    </div>
                                    <div className="col-span-5">
                                        <FormLabel className="text-xs">Notes</FormLabel>
                                        <Input
                                            className="h-8 text-xs"
                                            {...form.register(`items.${index}.notes`)}
                                        />
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(index)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-background pb-2">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    enquiry ? "Update Enquiry" : "Save Enquiry"
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
