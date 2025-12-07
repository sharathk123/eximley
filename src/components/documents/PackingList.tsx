import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { styles } from '@/lib/pdf-styles';
import { DocumentHeader, DocumentFooter } from './shared/DocumentComponents';

interface PackingListProps {
    shipment: any;
    order: any;
    company: any;
    buyer: any;
}

export const PackingList: React.FC<PackingListProps> = ({ shipment, order, company, buyer }) => {
    const formatDate = (date: string) => new Date(date).toLocaleDateString('en-GB');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <DocumentHeader company={company} documentTitle="PACKING LIST" />

                {/* Shipment Details */}
                <View style={styles.section}>
                    <View style={styles.row}>
                        <View style={styles.col50}>
                            <Text><Text style={styles.label}>Packing List No:</Text> {shipment.shipment_number}</Text>
                            <Text><Text style={styles.label}>Date:</Text> {formatDate(shipment.shipment_date)}</Text>
                            <Text><Text style={styles.label}>Order Ref:</Text> {order.order_number}</Text>
                        </View>
                        <View style={styles.col50}>
                            <Text><Text style={styles.label}>Total Packages:</Text> {shipment.total_packages || '-'}</Text>
                            <Text><Text style={styles.label}>Gross Weight:</Text> {shipment.gross_weight_kg ? `${shipment.gross_weight_kg} KG` : '-'}</Text>
                            <Text><Text style={styles.label}>Net Weight:</Text> {shipment.net_weight_kg ? `${shipment.net_weight_kg} KG` : '-'}</Text>
                        </View>
                    </View>
                </View>

                {/* Consignee */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONSIGNEE</Text>
                    <Text style={{ fontWeight: 'bold' }}>{buyer?.name}</Text>
                    {buyer?.address && <Text>{buyer.address}</Text>}
                    {buyer?.city && <Text>{buyer.city}, {buyer?.country}</Text>}
                </View>

                {/* Shipping Details */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SHIPPING DETAILS</Text>
                    <View style={styles.row}>
                        <View style={styles.col50}>
                            {shipment.port_of_loading && (
                                <Text><Text style={styles.label}>Port of Loading:</Text> {shipment.port_of_loading}</Text>
                            )}
                            {shipment.port_of_discharge && (
                                <Text><Text style={styles.label}>Port of Discharge:</Text> {shipment.port_of_discharge}</Text>
                            )}
                            {shipment.vessel_name && (
                                <Text><Text style={styles.label}>Vessel:</Text> {shipment.vessel_name}</Text>
                            )}
                        </View>
                        <View style={styles.col50}>
                            {shipment.carrier && (
                                <Text><Text style={styles.label}>Carrier:</Text> {shipment.carrier}</Text>
                            )}
                            {shipment.tracking_number && (
                                <Text><Text style={styles.label}>Tracking:</Text> {shipment.tracking_number}</Text>
                            )}
                            {shipment.container_numbers && shipment.container_numbers.length > 0 && (
                                <Text><Text style={styles.label}>Containers:</Text> {shipment.container_numbers.join(', ')}</Text>
                            )}
                        </View>
                    </View>
                </View>

                {/* Items Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.tableCell, { width: '5%' }]}>Sr.</Text>
                        <Text style={[styles.tableCell, { width: '25%' }]}>Description</Text>
                        <Text style={[styles.tableCell, { width: '15%' }]}>SKU Code</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>Qty</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>Unit</Text>
                        <Text style={[styles.tableCell, { width: '10%' }]}>Pkg No.</Text>
                        <Text style={[styles.tableCell, { width: '12%' }]}>Gross Wt</Text>
                        <Text style={[styles.tableCell, { width: '13%' }]}>Net Wt</Text>
                    </View>

                    {shipment.shipment_items?.map((item: any, index: number) => {
                        const orderItem = item.order_items;
                        const sku = orderItem?.skus;
                        const grossWt = sku?.gross_weight_kg ? (Number(sku.gross_weight_kg) * Number(item.quantity)).toFixed(2) : '-';
                        const netWt = sku?.net_weight_kg ? (Number(sku.net_weight_kg) * Number(item.quantity)).toFixed(2) : '-';

                        return (
                            <View key={item.id} style={styles.tableRow}>
                                <Text style={[styles.tableCell, { width: '5%' }]}>{index + 1}</Text>
                                <Text style={[styles.tableCell, { width: '25%' }]}>{sku?.name || orderItem?.description || '-'}</Text>
                                <Text style={[styles.tableCell, { width: '15%' }]}>{sku?.sku_code || '-'}</Text>
                                <Text style={[styles.tableCell, { width: '10%' }]}>{item.quantity}</Text>
                                <Text style={[styles.tableCell, { width: '10%' }]}>{sku?.unit_of_measure || 'PCS'}</Text>
                                <Text style={[styles.tableCell, { width: '10%' }]}>{item.package_number || '-'}</Text>
                                <Text style={[styles.tableCell, { width: '12%' }]}>{grossWt} KG</Text>
                                <Text style={[styles.tableCell, { width: '13%' }]}>{netWt} KG</Text>
                            </View>
                        );
                    })}
                </View>

                {/* Declaration */}
                <View style={[styles.section, { marginTop: 20 }]}>
                    <Text style={{ fontSize: 8, fontStyle: 'italic' }}>
                        We certify that the above particulars are true and correct.
                    </Text>
                </View>

                {/* Signature */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text>Prepared By</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text>Authorized Signatory</Text>
                        {company?.signatory_name && (
                            <Text style={{ marginTop: 5 }}>{company.signatory_name}</Text>
                        )}
                    </View>
                </View>

                <DocumentFooter company={company} />
            </Page>
        </Document>
    );
};
