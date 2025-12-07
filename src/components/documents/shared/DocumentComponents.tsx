import React from 'react';
import { Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf-styles';

interface DocumentHeaderProps {
    company: any;
    documentTitle: string;
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({ company, documentTitle }) => (
    <View style={styles.header}>
        <Text style={styles.companyName}>{company?.legal_name || company?.trade_name || 'Company Name'}</Text>
        <Text style={styles.companyDetails}>
            {company?.address && `${company.address}, `}
            {company?.city && `${company.city}, `}
            {company?.state && `${company.state} - `}
            {company?.pincode}
        </Text>
        <Text style={styles.companyDetails}>
            {company?.phone && `Tel: ${company.phone} | `}
            {company?.email && `Email: ${company.email}`}
        </Text>
        {company?.gstin && (
            <Text style={styles.companyDetails}>GSTIN: {company.gstin}</Text>
        )}
        {company?.iec_number && (
            <Text style={styles.companyDetails}>IEC: {company.iec_number}</Text>
        )}
        <Text style={styles.title}>{documentTitle}</Text>
    </View>
);

interface DocumentFooterProps {
    pageNumber?: number;
    totalPages?: number;
    company?: any;
}

export const DocumentFooter: React.FC<DocumentFooterProps> = ({ pageNumber, totalPages, company }) => (
    <View style={styles.footer}>
        <Text>
            This is a computer-generated document. No signature required.
        </Text>
        {company?.signatory_name && (
            <Text style={{ marginTop: 5 }}>
                For {company.legal_name || company.trade_name}
            </Text>
        )}
        {pageNumber && totalPages && (
            <Text style={{ textAlign: 'right', marginTop: -15 }}>
                Page {pageNumber} of {totalPages}
            </Text>
        )}
    </View>
);
