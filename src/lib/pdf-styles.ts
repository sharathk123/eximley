import { StyleSheet } from '@react-pdf/renderer';

export const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottom: '2 solid #000',
        paddingBottom: 10,
    },
    companyName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    companyDetails: {
        fontSize: 9,
        color: '#666',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 15,
        textTransform: 'uppercase',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
        backgroundColor: '#f0f0f0',
        padding: 5,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    col50: {
        width: '50%',
    },
    col33: {
        width: '33.33%',
    },
    col25: {
        width: '25%',
    },
    label: {
        fontWeight: 'bold',
        marginRight: 5,
    },
    value: {
        color: '#333',
    },
    table: {
        marginTop: 10,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#333',
        color: '#fff',
        padding: 5,
        fontWeight: 'bold',
        fontSize: 9,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottom: '1 solid #ddd',
        padding: 5,
        fontSize: 9,
    },
    tableCell: {
        padding: 2,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        borderTop: '1 solid #ddd',
        paddingTop: 10,
        fontSize: 8,
        color: '#666',
    },
    signatureSection: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signatureBox: {
        width: '45%',
        borderTop: '1 solid #000',
        paddingTop: 5,
        textAlign: 'center',
    },
    totalRow: {
        flexDirection: 'row',
        backgroundColor: '#f9f9f9',
        padding: 8,
        fontWeight: 'bold',
        fontSize: 11,
        marginTop: 5,
    },
});
