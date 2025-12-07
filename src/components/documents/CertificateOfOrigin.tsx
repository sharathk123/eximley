import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf-styles';
import { DocumentHeader, DocumentFooter } from './shared/DocumentComponents';

interface CertificateOfOriginProps {
    order: any;
    company: any;
    buyer: any;
}

export const CertificateOfOrigin: React.FC<CertificateOfOriginProps> = ({ order, company, buyer }) => {
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <DocumentHeader company={company} documentTitle="CERTIFICATE OF ORIGIN" />

                {/* Certificate Number */}
                <View style={styles.section}>
                    <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
                        Certificate No: COO-{order.order_number}
                    </Text>
                    <Text style={{ textAlign: 'center', fontSize: 10, marginTop: 5 }}>
                        Date: {formatDate(order.order_date)}
                    </Text>
                </View>

                {/* Exporter */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EXPORTER</Text>
                    <Text style={{ fontWeight: 'bold' }}>{company?.legal_name}</Text>
                    <Text>{company?.address}</Text>
                    <Text>{company?.city}, {company?.state} - {company?.pincode}</Text>
                    <Text>{company?.country || 'India'}</Text>
                    {company?.iec_number && <Text>IEC: {company.iec_number}</Text>}
                </View>

                {/* Consignee */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONSIGNEE</Text>
                    <Text style={{ fontWeight: 'bold' }}>{buyer?.name}</Text>
                    {buyer?.address && <Text>{buyer.address}</Text>}
                    {buyer?.city && <Text>{buyer.city}, {buyer?.country}</Text>}
                </View>

                {/* Goods Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DESCRIPTION OF GOODS</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCell, { width: '10%' }]}>Sr.</Text>
                            <Text style={[styles.tableCell, { width: '40%' }]}>Description</Text>
                            <Text style={[styles.tableCell, { width: '20%' }]}>HS Code</Text>
                            <Text style={[styles.tableCell, { width: '15%' }]}>Quantity</Text>
                            <Text style={[styles.tableCell, { width: '15%' }]}>Origin</Text>
                        </View>

                        {order.order_items?.map((item: any, index: number) => (
                            <View key={item.id} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '10%' }]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, { width: '40%' }]}>
                                    {item.skus?.name || item.description}
                                </Text>
                                <Text style={[styles.tableCell, { width: '20%' }]}>{item.skus?.hs_code || '-'}</Text>
                                <Text style={[styles.tableCell, { width: '15%' }]}>
                                    {item.quantity} {item.skus?.unit_of_measure || 'PCS'}
                                </Text>
                                <Text style={[styles.tableCell, { width: '15%' }]}>
                                    {item.skus?.country_of_origin || 'India'}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Declaration */}
                <View style={[styles.section, { marginTop: 30 }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>DECLARATION</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                        The undersigned hereby declares that the above details and statement are correct; that all the goods were produced in{' '}
                        <Text style={{ fontWeight: 'bold' }}>{company?.country || 'India'}</Text> and that they comply with the origin requirements
                        specified for those goods in the applicable trade agreement.
                    </Text>
                </View>

                {/* Signature */}
                <View style={[styles.signatureSection, { marginTop: 40 }]}>
                    <View style={styles.signatureBox}>
                        <Text>Place: {company?.city || '_____________'}</Text>
                        <Text style={{ marginTop: 5 }}>Date: {formatDate(order.order_date)}</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text>Authorized Signatory</Text>
                        {company?.signatory_name && (
                            <Text style={{ marginTop: 10, fontWeight: 'bold' }}>{company.signatory_name}</Text>
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
