"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { proformaSchema, ProformaFormValues } from "@/lib/schemas/proforma";

interface UseProformaFormProps {
    initialData?: any;
    mode: 'create' | 'edit';
}

export function useProformaForm({ initialData, mode }: UseProformaFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const [buyers, setBuyers] = useState<any[]>([]);
    const [skus, setSkus] = useState<any[]>([]);
    const [currencies, setCurrencies] = useState<any[]>([]);
    const [luts, setLuts] = useState<any[]>([]);
    const [incoterms, setIncoterms] = useState<any[]>([]);
    const [banks, setBanks] = useState<any[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<any[]>([]);

    const defaultValues: ProformaFormValues = {
        buyer_id: "",
        date: new Date().toISOString().split('T')[0],
        currency_code: "USD",
        conversion_rate: 1,
        lut_id: "",
        incoterm: "",
        incoterm_place: "",
        payment_terms: "",
        port_of_loading: "",
        port_of_discharge: "",
        bank_id: "",
        items: [{
            sku_id: "",
            quantity: 1,
            unit_price: 0,
            description: "",
            hsn_code: "",
            unit_of_measurement: "",
            net_weight: 0,
            gross_weight: 0
        }]
    };

    const form = useForm({
        resolver: zodResolver(proformaSchema),
        defaultValues,
    });

    useEffect(() => {
        fetchFormData();
    }, []);

    useEffect(() => {
        if (initialData) {
            form.reset({
                buyer_id: initialData.buyer_id || '',
                date: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                currency_code: initialData.currency_code || 'USD',
                conversion_rate: initialData.conversion_rate || 1,
                lut_id: initialData.lut_id || "",
                incoterm: initialData.incoterm || "",
                incoterm_place: initialData.incoterm_place || "",
                payment_terms: initialData.payment_terms || "",
                port_of_loading: initialData.port_of_loading || "",
                port_of_discharge: initialData.port_of_discharge || "",
                bank_id: initialData.bank_id || "",
                items: initialData.proforma_items?.map((item: any) => ({
                    sku_id: item.sku_id || '',
                    quantity: Number(item.quantity) || 1,
                    unit_price: Number(item.unit_price) || 0,
                    description: item.description || ''
                })) || [{ sku_id: "", quantity: 1, unit_price: 0, description: "" }]
            });
        }
    }, [initialData, form]);

    async function fetchFormData() {
        try {
            const [entRes, skuRes, currRes, lutRes, incoRes, bankRes, ptRes] = await Promise.all([
                fetch("/api/entities?type=buyer"),
                fetch("/api/skus"),
                fetch("/api/currencies"),
                fetch("/api/compliance/lut?status=active"),
                fetch("/api/incoterms"),
                fetch("/api/company/banks"),
                fetch("/api/payment-terms")
            ]);

            // Safely parse JSON
            const safeJson = async (res: Response) => {
                if (!res.ok) return {};
                return res.json().catch(() => ({}));
            };

            const entData = await safeJson(entRes);
            const skuData = await safeJson(skuRes);
            const currData = await safeJson(currRes);
            const lutData = await safeJson(lutRes);
            const incoData = await safeJson(incoRes);
            const bankData = await safeJson(bankRes);
            const ptData = await safeJson(ptRes);

            if (entData.entities) setBuyers(entData.entities);
            if (skuData.skus) setSkus(skuData.skus);
            if (currData.currencies) setCurrencies(currData.currencies);
            if (lutData.luts) setLuts(lutData.luts);
            if (incoData.incoterms) setIncoterms(incoData.incoterms);
            if (bankData.banks) setBanks(bankData.banks);
            if (ptData.paymentTerms) setPaymentTerms(ptData.paymentTerms);
        } catch (err) {
            console.error("Error fetching form data:", err);
        }
    }

    const onSubmit = async (values: ProformaFormValues) => {
        setLoading(true);
        try {
            const url = "/api/invoices/proforma";
            const method = mode === 'edit' ? "PUT" : "POST";
            const body = mode === 'edit' ? { ...values, id: initialData.id } : values;

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || `Failed to ${mode} invoice`);
            }

            toast({
                title: "Success",
                description: `Invoice ${mode === 'edit' ? "updated" : "created"} successfully`
            });

            router.push('/invoices/proforma');
            router.refresh();
        } catch (error: any) {
            console.error(error);
            toast({
                title: "Error",
                description: error.message || `Failed to ${mode} invoice`,
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = () => {
        const items = form.watch('items') || [];
        return items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0), 0);
    };

    return {
        form,
        loading,
        onSubmit,
        data: {
            buyers,
            skus,
            currencies,
            luts,
            incoterms,
            banks,
            paymentTerms
        },
        helpers: {
            calculateTotal
        }
    };
}
