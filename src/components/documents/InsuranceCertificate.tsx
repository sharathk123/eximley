import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf-styles';
import { DocumentHeader, DocumentFooter } from './shared/DocumentComponents';

interface InsuranceCertificateProps {
    shipment: any;
    company: any;
    order: any;
}

export const InsuranceCertificate: React.FC<InsuranceCertificateProps> = ({ shipment, company, order }) => {
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');
    const formatCurrency = (amount: number, currency: string) => `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <DocumentHeader company={company} documentTitle="MARINE INSURANCE CERTIFICATE" />

                {/* Certificate Number */}
                <View style={styles.section}>
                    <Text style={{ textAlign: 'center', fontSize: 12, fontWeight: 'bold' }}>
                        Certificate No: INS-{shipment.shipment_number}
                    </Text>
                    <Text style={{ textAlign: 'center', fontSize: 10, marginTop: 5 }}>
                        Date: {shipment.insurance_date ? formatDate(shipment.insurance_date) : formatDate(shipment.shipment_date)}
                    </Text>
                </View>

                {/* Insurance Company */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INSURED BY</Text>
                    <Text style={{ fontWeight: 'bold' }}>{shipment.insurance_company || 'Insurance Company Name'}</Text>
                    <Text>Policy No: {shipment.insurance_policy_number || 'N/A'}</Text>
                </View>

                {/* Insured Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>INSURED</Text>
                    <Text style={{ fontWeight: 'bold' }}>{company?.legal_name}</Text>
                    <Text>{company?.address}</Text>
                    <Text>{company?.city}, {company?.state} - {company?.pincode}</Text>
                    <Text>{company?.country || 'India'}</Text>
                </View>

                {/* Consignee */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONSIGNEE</Text>
                    <Text style={{ fontWeight: 'bold' }}>{order?.entities?.name}</Text>
                    {order?.entities?.address && <Text>{order.entities.address}</Text>}
                    {order?.entities?.city && <Text>{order.entities.city}, {order?.entities?.country}</Text>}
                </View>

                {/* Shipment Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SHIPMENT DETAILS</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                        <View style={{ width: '48%' }}>
                            <Text style={{ fontSize: 10 }}>Shipment No: {shipment.shipment_number}</Text>
                            <Text style={{ fontSize: 10, marginTop: 3 }}>Date: {formatDate(shipment.shipment_date)}</Text>
                            <Text style={{ fontSize: 10, marginTop: 3 }}>Transport: {shipment.transport_mode?.toUpperCase() || 'SEA'}</Text>
                            {shipment.vessel_name && <Text style={{ fontSize: 10, marginTop: 3 }}>Vessel: {shipment.vessel_name}</Text>}
                            {shipment.bl_number && <Text style={{ fontSize: 10, marginTop: 3 }}>BOL: {shipment.bl_number}</Text>}
                        </View>
                        <View style={{ width: '48%' }}>
                            <Text style={{ fontSize: 10 }}>From: {shipment.port_of_loading || 'N/A'}</Text>
                            <Text style={{ fontSize: 10, marginTop: 3 }}>To: {shipment.port_of_discharge || 'N/A'}</Text>
                            {order?.incoterm && <Text style={{ fontSize: 10, marginTop: 3 }}>Incoterm: {order.incoterm}</Text>}
                        </View>
                    </View>
                </View>

                {/* Coverage Amount */}
                <View style={[styles.section, { backgroundColor: '#f0f0f0', padding: 15, marginTop: 10 }]}>
                    <Text style={styles.sectionTitle}>INSURED AMOUNT</Text>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', marginTop: 5 }}>
                        {formatCurrency(
                            shipment.insurance_value || order?.total_value || 0,
                            shipment.insurance_currency || order?.currency || 'USD'
                        )}
                    </Text>
                    {shipment.insurance_coverage_type && (
                        <Text style={{ fontSize: 9, marginTop: 5 }}>Coverage: {shipment.insurance_coverage_type}</Text>
                    )}
                </View>

                {/* Goods Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>DESCRIPTION OF GOODS</Text>
                    <View style={styles.table}>
                        <View style={styles.tableHeader}>
                            <Text style={[styles.tableCell, { width: '10%' }]}>Sr.</Text>
                            <Text style={[styles.tableCell, { width: '50%' }]}>Description</Text>
                            <Text style={[styles.tableCell, { width: '20%' }]}>Quantity</Text>
                            <Text style={[styles.tableCell, { width: '20%' }]}>Package</Text>
                        </View>

                        {shipment.shipment_items?.map((item: any, index: number) => (
                            <View key={item.id} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '10%' }]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, { width: '50%' }]}>
                                    {item.order_items?.products?.name || 'Product'}
                                </Text>
                                <Text style={[styles.tableCell, { width: '20%' }]}>
                                    {item.quantity} {item.order_items?.skus?.unit_of_measure || 'PCS'}
                                </Text>
                                <Text style={[styles.tableCell, { width: '20%' }]}>{item.package_number || '-'}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Coverage Terms */}
                <View style={[styles.section, { marginTop: 20 }]}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', marginBottom: 10 }}>COVERAGE TERMS</Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.5 }}>
                        This certifies that the goods described herein are insured under the above policy against all risks of loss or damage
                        during transit from the port of loading to the port of discharge, subject to the terms and conditions of the policy.
                    </Text>
                    <Text style={{ fontSize: 9, lineHeight: 1.5, marginTop: 5 }}>
                        Coverage includes but is not limited to: Loss or damage by fire, theft, collision, jettison, and washing overboard.
                        General average and salvage charges are also covered.
                    </Text>
                </View>

                {/* Declaration */}
                <View style={[styles.section, { marginTop: 20, borderTop: '1px solid #ccc', paddingTop: 10 }]}>
                    <Text style={{ fontSize: 9, fontStyle: 'italic' }}>
                        In the event of loss or damage, claims should be reported immediately to the insurance company.
                        Survey reports must be obtained where applicable.
                    </Text>
                </View>

                <DocumentFooter company={company} />
            </Page>
        </Document>
    );
};
