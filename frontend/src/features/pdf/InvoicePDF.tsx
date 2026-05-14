import {
  Document, Page, Text, View, Image, PDFDownloadLink,
} from '@react-pdf/renderer'
import { styles, COLORS } from './pdfStyles'

interface InvoiceItem {
  id:          string
  name?:       string
  productName?: string
  quantity:    number
  price?:      number
  unitPrice?:  number
  discount:    number
  totalPrice:  number
  unit?:       string
}

interface Invoice {
  id:           string
  invoiceNumber: string
  status:       string
  createdAt:    string
  dueDate?:     string
  subtotal:     number
  taxRate:      number
  taxAmount:    number
  discount:     number
  totalAmount:  number
  paidAmount:   number
  notes?:       string
  contact?: { name: string; phone?: string; address?: string; stir?: string }
  items?: InvoiceItem[]
}

interface Company {
  name: string; legalName?: string; stir?: string
  address?: string; phone?: string; logo?: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + " so'm"
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('uz-UZ')
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama', SENT: 'Yuborildi', PAID: "To'langan", OVERDUE: "Muddati o'tgan", CANCELLED: 'Bekor'
}

export function InvoicePDFDoc({ invoice, company }: { invoice: Invoice; company: Company }) {
  const remaining = invoice.totalAmount - invoice.paidAmount

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {company.logo && (
              <Image src={company.logo} style={{ width: 48, height: 48, marginBottom: 6, objectFit: 'contain' }} />
            )}
            <Text style={styles.companyName}>{company.name}</Text>
            {company.legalName && <Text style={styles.companyDetail}>{company.legalName}</Text>}
            {company.stir && <Text style={styles.companyDetail}>STIR: {company.stir}</Text>}
            {company.address && <Text style={styles.companyDetail}>{company.address}</Text>}
            {company.phone && <Text style={styles.companyDetail}>Tel: {company.phone}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Hisob-faktura</Text>
            <Text style={styles.docNumber}>#{invoice.invoiceNumber}</Text>
            <Text style={styles.docDate}>Sana: {fmtDate(invoice.createdAt)}</Text>
            {invoice.dueDate && (
              <Text style={styles.docDate}>Muddat: {fmtDate(invoice.dueDate)}</Text>
            )}
            <View style={[styles.badge, {
              backgroundColor: invoice.status === 'PAID' ? '#D1FAE5' : '#FEF3C7',
              marginTop: 6,
            }]}>
              <Text style={[styles.badgeText, {
                color: invoice.status === 'PAID' ? COLORS.success : COLORS.warning,
              }]}>
                {STATUS_LABELS[invoice.status] ?? invoice.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Sotuvchi</Text>
            <Text style={styles.partyName}>{company.name}</Text>
            {company.stir && <Text style={styles.partyDetail}>STIR: {company.stir}</Text>}
            {company.address && <Text style={styles.partyDetail}>{company.address}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Xaridor</Text>
            <Text style={styles.partyName}>{invoice.contact?.name ?? '—'}</Text>
            {invoice.contact?.stir && <Text style={styles.partyDetail}>STIR: {invoice.contact.stir}</Text>}
            {invoice.contact?.address && <Text style={styles.partyDetail}>{invoice.contact.address}</Text>}
            {invoice.contact?.phone && <Text style={styles.partyDetail}>Tel: {invoice.contact.phone}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <Text style={styles.sectionTitle}>Mahsulotlar va xizmatlar</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Nomi</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Miqdor</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Narx</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Chegirma</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Jami</Text>
          </View>
          {(invoice.items ?? []).map((item, i) => (
            <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={[styles.tableCell, { flex: 3 }]}>
                {item.productName ?? item.name}{item.unit ? ` (${item.unit})` : ''}
              </Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'center' }]}>{item.quantity}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{fmt(item.unitPrice ?? item.price ?? 0)}</Text>
              <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                {item.discount > 0 ? `${item.discount}%` : '—'}
              </Text>
              <Text style={[styles.tableCellBold, { flex: 1.5, textAlign: 'right' }]}>{fmt(item.totalPrice)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Yig'indi</Text>
            <Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          {invoice.taxRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>QQS ({invoice.taxRate}%)</Text>
              <Text style={styles.totalValue}>{fmt(invoice.taxAmount)}</Text>
            </View>
          )}
          {invoice.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Chegirma</Text>
              <Text style={[styles.totalValue, { color: COLORS.danger }]}>
                -{fmt(invoice.subtotal * invoice.discount / 100)}
              </Text>
            </View>
          )}
          {invoice.paidAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>To'langan</Text>
              <Text style={[styles.totalValue, { color: COLORS.success }]}>{fmt(invoice.paidAmount)}</Text>
            </View>
          )}
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>{invoice.paidAmount > 0 ? 'Qoldi' : 'JAMI'}</Text>
            <Text style={styles.totalValueFinal}>{fmt(remaining > 0 ? remaining : invoice.totalAmount)}</Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Izoh</Text>
            <Text style={{ fontSize: 9, color: COLORS.muted }}>{invoice.notes}</Text>
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Sotuvchi imzosi: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>{company.name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Xaridor imzosi: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>{invoice.contact?.name ?? ''}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} | Hisob-faktura #{invoice.invoiceNumber}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
