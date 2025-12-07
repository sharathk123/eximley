import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf-styles';
import { DocumentHeader, DocumentFooter } from './shared/DocumentComponents';

interface CommercialInvoiceProps {
    order: any;
    company: any;
    buyer: any;
}

export const CommercialInvoice: React.FC<CommercialInvoiceProps> = ({ order, company, buyer }) => {
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <DocumentHeader company={company} documentTitle="COMMERCIAL INVOICE" />

                {/* Invoice Details */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.col50}>
                            <Text><Text style={styles.label}>Invoice No:</Text> {order.order_number}</Text>
                            <Text><Text style={styles.label}>Date:</Text> {formatDate(order.order_date)}</Text>
                        </View>
                        <View style={styles.col50}>
                            <Text><Text style={styles.label}>Currency:</Text> {order.currency_code}</Text>
                            <Text><Text style={styles.label}>Payment Terms:</Text> As Agreed</Text>
                        </View>
                    </View>
                </View>

                {/* Buyer Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONSIGNEE / BUYER</Text>
                    <Text style={{ fontWeight: 'bold' }}>{buyer?.name}</Text>
                    {buyer?.address && <Text>{buyer.address}</Text>}
                    {buyer?.city && <Text>{buyer.city}, {buyer?.country}</Text>}
                    {buyer?.tax_id && <Text>Tax ID: {buyer.tax_id}</Text>}
                </View>

                {/* Exporter Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EXPORTER</Text>
                    <Text style={{ fontWeight: 'bold' }}>{company?.legal_name}</Text>
                    <Text>{company?.address}</Text>
                    <Text>{company?.city}, {company?.state} - {company?.pincode}, {company?.country}</Text>
                    {company?.iec_number && <Text>IEC: {company.iec_number}</Text>}
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, { width: '5%' }]}>Sr.</Text>
                        <Text style={[styles.tableCell, { width: '35%' }]}>Description of Goods</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>HS Code</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>Qty</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>Unit</Text>
                        <Text style={[styles.tableCell, { width: '12%' }]}>Rate</Text>
                        <Text style={[styles.tableCell, { width: '13%', textAlign: 'right' }]}>Amount</Text>
                    </View>

                    {order.order_items?.map((item: any, index: number) => (
                        <View key={item.id} style={styles.tableRow}>
                            <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
                            <Text style={[styles.tableCell, { width: '35%' }]}>
                                {item.skus?.name || item.description}
                                {item.skus?.sku_code && `\n(${item.skus.sku_code})`}
                            </Text>
                            <Text style={[styles.tableCell, { width: '15%' }]}>{item.skus?.hs_code || '-'}</Text>
                            <Text style={[styles.tableCell, { width: '10%' }]}>{item.quantity}</Text>
                            <Text style={[styles.tableCell, { width: '10%' }]}>{item.skus?.unit_of_measure || 'PCS'}</Text>
                            <Text style={[styles.tableCell, { width: '12%' }]}>{Number(item.unit_price).toFixed(2)}</Text>
                            <Text style={[styles.tableCell, { width: '13%', textAlign: 'right' }]}>
                                {(Number(item.quantity) * Number(item.unit_price)).toFixed(2)}
                            </Text>
                        </View>
                    ))}

                    {/* Total */}
                    <View style={styles.totalRow}>
                        <Text style={{ width: '87%', textAlign: 'right', marginRight: 10 }}>TOTAL:</Text>
                        <Text style={{ width: '13%', textAlign: 'right' }}>
                            {order.currency_code} {Number(order.total_amount).toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Bank Details */}
                {company?.bank_name && (
                    <View style={[styles.section, { marginTop: 20 }]}>
                        <Text style={styles.sectionTitle}>BANK DETAILS FOR PAYMENT</Text>
                        <Text><Text style={styles.label}>Bank Name:</Text> {company.bank_name}</Text>
                        {company.bank_branch && <Text><Text style={styles.label}>Branch:</Text> {company.bank_branch}</Text>}
                        {company.bank_account_number && <Text><Text style={styles.label}>Account No:</Text> {company.bank_account_number}</Text>}
                        {company.bank_ifsc && <Text><Text style={styles.label}>IFSC Code:</Text> {company.bank_ifsc}</Text>}
                        {company.bank_swift && <Text><Text style={styles.label}>SWIFT Code:</Text> {company.bank_swift}</Text>}
                    </View>
                )}

                {/* Declaration */}
                <View style={[styles.section, { marginTop: 15 }]}>
                    <Text style={{ fontSize: 8, fontStyle: 'italic' }}>
                        We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.
                    </Text>
                </View>

                {/* Signature */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text>Buyer's Signature</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text>For {company?.legal_name || 'Company'}</Text>
                        {company?.signatory_name && (
                            <Text style={{ marginTop: 5 }}>{company.signatory_name}</Text>
                        )}
                        {company?.signatory_designation && (
                            <Text style={{ fontSize: 8 }}>{company.signatory_designation}</Text>
                        )}
                    </View>
                </View>

                <DocumentFooter company={company} />
            </Page>
        </Document>
    );
};
