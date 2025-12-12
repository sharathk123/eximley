"use client";

import { useRouter } from "next/navigation";
import { ProformaTableView } from "./list/ProformaTableView";
import { ProformaCardView } from "./list/ProformaCardView";

interface ProformaListProps {
    invoices: any[];
    viewMode: 'card' | 'list';
    onEdit: (invoice: any) => void;
    onDelete: (invoice: any) => void;
    onConvert: (invoice: any) => void;
}

export function ProformaList({
    invoices,
    viewMode,
    onEdit,
    onDelete,
    onConvert
}: ProformaListProps) {
    const router = useRouter();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'draft': return 'secondary';
            case 'sent': return 'default';
            case 'approved': return 'default';
            case 'rejected': return 'destructive';
            case 'revised': return 'outline';
            case 'converted': return 'default';
            default: return 'outline';
        }
    };

    const handleRowClick = (id: string) => {
        router.push(`/invoices/proforma/${id}`);
    };

    if (viewMode === 'card') {
        return (
            <ProformaCardView
                invoices={invoices}
                onEdit={onEdit}
                onDelete={onDelete}
                onConvert={onConvert}
                onRowClick={handleRowClick}
                getStatusColor={getStatusColor}
            />
        );
    }

    return (
        <ProformaTableView
            invoices={invoices}
            onEdit={onEdit}
            onDelete={onDelete}
            onConvert={onConvert}
            onRowClick={handleRowClick}
            getStatusColor={getStatusColor}
        />
    );
}
