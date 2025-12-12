"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Form } from '@/components/ui/form';
import { useRouter } from 'next/navigation';

import { useProformaForm } from '@/hooks/useProformaForm';
import { InvoiceDetailsSection } from './form/InvoiceDetailsSection';
import { FinancialsSection } from './form/FinancialsSection';
import { LogisticsSection } from './form/LogisticsSection';
import { LineItemsSection } from './form/LineItemsSection';

interface ProformaInvoiceFormProps {
    initialData?: any;
    mode: 'create' | 'edit';
}

export function ProformaInvoiceForm({ initialData, mode }: ProformaInvoiceFormProps) {
    const router = useRouter();
    const {
        form,
        loading,
        onSubmit,
        data: { buyers, skus, currencies, luts, incoterms, banks, paymentTerms },
        helpers: { calculateTotal }
    } = useProformaForm({ initialData, mode });

    const total = calculateTotal();
    const currency = form.watch('currency_code');

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === 'edit' && initialData ? `Edit Invoice: ${initialData.invoice_number}` : "Create Proforma Invoice"}
                    </h1>
                    <p className="text-muted-foreground">
                        {mode === 'edit' ? "Update invoice details and items." : "Create a new proforma invoice."}
                    </p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">

                    <InvoiceDetailsSection control={form.control} buyers={buyers} />

                    <FinancialsSection control={form.control} currencies={currencies} luts={luts} />

                    <LogisticsSection control={form.control} incoterms={incoterms} banks={banks} paymentTerms={paymentTerms} />

                    <LineItemsSection control={form.control} skus={skus} currency={currency} />

                    {/* Total Summary */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex justify-between items-center">
                                <span className="font-bold text-xl">Grand Total</span>
                                <span className="font-bold text-2xl text-primary">{currency || 'USD'} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </CardContent>
                    </Card>


                    <div className="flex justify-end gap-3 pt-6">
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="min-w-[120px]">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                mode === 'edit' ? 'Update Invoice' : 'Create Invoice'
                            )}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
