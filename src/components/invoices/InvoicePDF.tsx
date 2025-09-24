import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Register fonts if needed
// Font.register({
//   family: 'Inter',
//   src: '/fonts/Inter-Regular.ttf'
// });

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 40,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  invoiceNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    padding: '4 8',
    borderRadius: 4,
  },
  statusDraft: {
    color: '#666',
    backgroundColor: '#f3f4f6',
  },
  statusSent: {
    color: '#2563eb',
    backgroundColor: '#dbeafe',
  },
  statusPaid: {
    color: '#16a34a',
    backgroundColor: '#dcfce7',
  },
  statusOverdue: {
    color: '#dc2626',
    backgroundColor: '#fee2e2',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  infoBlock: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  infoText: {
    fontSize: 11,
    color: '#1a1a1a',
    marginBottom: 3,
  },
  table: {
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDescription: {
    flex: 3,
  },
  colQty: {
    flex: 1,
    textAlign: 'center',
  },
  colPrice: {
    flex: 1,
    textAlign: 'right',
  },
  colAmount: {
    flex: 1,
    textAlign: 'right',
  },
  tableHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#666',
    textTransform: 'uppercase',
  },
  tableText: {
    fontSize: 11,
    color: '#1a1a1a',
  },
  itemName: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  itemDescription: {
    fontSize: 10,
    color: '#666',
  },
  totalsSection: {
    marginLeft: 'auto',
    width: 250,
    marginTop: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 11,
    color: '#666',
  },
  totalValue: {
    fontSize: 11,
    color: '#1a1a1a',
    textAlign: 'right',
  },
  totalRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
  },
  totalLabelMain: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  totalValueMain: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'right',
  },
  paymentSection: {
    marginTop: 40,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  paymentInfo: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  notesSection: {
    marginTop: 40,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 11,
    color: '#1a1a1a',
    lineHeight: 1.5,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 10,
    color: '#9ca3af',
  },
});

interface InvoicePDFProps {
  invoice: any;
  organization: any;
}

// Get status styles
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'DRAFT': return styles.statusDraft;
    case 'SENT': return styles.statusSent;
    case 'PAID': return styles.statusPaid;
    case 'OVERDUE': return styles.statusOverdue;
    default: return styles.statusDraft;
  }
};

const InvoicePDF: React.FC<InvoicePDFProps> = ({ invoice, organization }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>{organization.name || 'Invoice'}</Text>
            <Text style={styles.invoiceNumber}>Invoice #{invoice.number}</Text>
          </View>
          <Text style={[styles.status, getStatusStyle(invoice.status)]}>
            {invoice.status}
          </Text>
        </View>
      </View>

      {/* Info Section */}
      <View style={styles.infoSection}>
        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>From</Text>
          <Text style={styles.infoText}>{organization.name}</Text>
          {organization.address && (
            <Text style={styles.infoText}>{organization.address}</Text>
          )}
          {organization.email && (
            <Text style={styles.infoText}>{organization.email}</Text>
          )}
          {organization.phone && (
            <Text style={styles.infoText}>{organization.phone}</Text>
          )}
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Bill To</Text>
          <Text style={styles.infoText}>{invoice.company?.name || 'N/A'}</Text>
          {invoice.contact && (
            <>
              <Text style={styles.infoText}>{invoice.contact.name}</Text>
              <Text style={styles.infoText}>{invoice.contact.email}</Text>
            </>
          )}
        </View>

        <View style={styles.infoBlock}>
          <Text style={styles.infoTitle}>Invoice Details</Text>
          <Text style={styles.infoText}>
            Date: {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
          </Text>
          <Text style={styles.infoText}>
            Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
          </Text>
          <Text style={styles.infoText}>
            Terms: {invoice.paymentTerms || 'Net 30'}
          </Text>
        </View>
      </View>

      {/* Line Items */}
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDescription]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colPrice]}>Price</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>

        {invoice.lines?.map((line: any, index: number) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.colDescription}>
              <Text style={[styles.tableText, styles.itemName]}>{line.name}</Text>
              {line.description && (
                <Text style={styles.itemDescription}>{line.description}</Text>
              )}
            </View>
            <Text style={[styles.tableText, styles.colQty]}>
              {line.quantity} {line.unitLabel || ''}
            </Text>
            <Text style={[styles.tableText, styles.colPrice]}>
              {invoice.currency} {Number(line.unitPrice).toFixed(2)}
            </Text>
            <Text style={[styles.tableText, styles.colAmount]}>
              {invoice.currency} {Number(line.lineSubtotal).toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {invoice.currency} {Number(invoice.subtotal).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tax</Text>
          <Text style={styles.totalValue}>
            {invoice.currency} {Number(invoice.taxTotal).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRowMain}>
          <Text style={styles.totalLabelMain}>Total</Text>
          <Text style={styles.totalValueMain}>
            {invoice.currency} {Number(invoice.total).toFixed(2)}
          </Text>
        </View>
        {invoice.amountPaid > 0 && (
          <>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Paid</Text>
              <Text style={styles.totalValue}>
                -{invoice.currency} {Number(invoice.amountPaid).toFixed(2)}
              </Text>
            </View>
            <View style={styles.totalRowMain}>
              <Text style={styles.totalLabelMain}>Amount Due</Text>
              <Text style={styles.totalValueMain}>
                {invoice.currency} {Number(invoice.amountDue).toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Payment Info */}
      {invoice.status !== 'PAID' && (
        <View style={styles.paymentSection}>
          <Text style={styles.paymentTitle}>Payment Information</Text>
          <Text style={styles.paymentInfo}>
            Please pay within {invoice.paymentTerms || 'Net 30'} terms
          </Text>
          <Text style={styles.paymentInfo}>
            Amount Due: {invoice.currency} {Number(invoice.amountDue).toFixed(2)}
          </Text>
        </View>
      )}

      {/* Notes */}
      {invoice.notesCustomer && (
        <View style={styles.notesSection}>
          <Text style={styles.notesTitle}>Notes</Text>
          <Text style={styles.notesText}>{invoice.notesCustomer}</Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Thank you for your business! • Generated on {format(new Date(), 'MMM d, yyyy')}
      </Text>
    </Page>
  </Document>
);

export default InvoicePDF;