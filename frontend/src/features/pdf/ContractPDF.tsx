import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles, COLORS } from './pdfStyles'

interface ContractPDFProps {
  contract: {
    id:             string
    contractNumber: string
    title:          string
    type:           string
    status:         string
    startDate:      string
    endDate?:       string | null
    totalAmount?:   number | null
    currency?:      string
    description?:   string | null
    terms?:         string | null
    createdAt:      string
    contact?: { name: string; phone?: string; address?: string; stir?: string }
  }
  company: { name: string; legalName?: string; stir?: string; address?: string; phone?: string; logo?: string }
}

const TYPE_LABELS: Record<string, string> = {
  SALE: 'Sotuv', PURCHASE: 'Xarid', SERVICE: 'Xizmat', RENT: 'Ijara', OTHER: 'Boshqa',
}
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Qoralama', ACTIVE: 'Faol', COMPLETED: 'Yakunlangan', CANCELLED: 'Bekor', EXPIRED: 'Muddati o\'tgan',
}

function fmt(n: number, currency = 'UZS') {
  const v = new Intl.NumberFormat('uz-UZ').format(Math.round(n))
  return currency === 'USD' ? `$${v}` : `${v} so'm`
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('uz-UZ')
}

export function ContractPDFDoc({ contract, company }: ContractPDFProps) {
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
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Shartnoma</Text>
            <Text style={styles.docNumber}>#{contract.contractNumber}</Text>
            <Text style={styles.docDate}>{contract.title}</Text>
            <Text style={styles.docDate}>Sana: {fmtDate(contract.startDate)}</Text>
            <View style={[styles.badge, { backgroundColor: '#DBEAFE', marginTop: 6 }]}>
              <Text style={[styles.badgeText, { color: COLORS.accent }]}>
                {STATUS_LABELS[contract.status] ?? contract.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Preamble */}
        <View style={{ marginBottom: 20, padding: 14, backgroundColor: COLORS.bg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontSize: 10, lineHeight: 1.7, color: COLORS.text }}>
            Ushbu {TYPE_LABELS[contract.type] ?? contract.type} shartnomasi {fmtDate(contract.startDate)} yilda{'\n'}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{company.legalName ?? company.name}</Text>
            {' '}(keyingi o'rinlarda «Birinchi tomon» deb yuritiladi) va{'\n'}
            <Text style={{ fontFamily: 'Helvetica-Bold' }}>{contract.contact?.name ?? '—'}</Text>
            {' '}(keyingi o'rinlarda «Ikkinchi tomon» deb yuritiladi) o'rtasida tuzildi.
          </Text>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Birinchi tomon</Text>
            <Text style={styles.partyName}>{company.legalName ?? company.name}</Text>
            {company.stir && <Text style={styles.partyDetail}>STIR: {company.stir}</Text>}
            {company.address && <Text style={styles.partyDetail}>{company.address}</Text>}
            {company.phone && <Text style={styles.partyDetail}>Tel: {company.phone}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Ikkinchi tomon</Text>
            <Text style={styles.partyName}>{contract.contact?.name ?? '—'}</Text>
            {contract.contact?.stir && <Text style={styles.partyDetail}>STIR: {contract.contact.stir}</Text>}
            {contract.contact?.address && <Text style={styles.partyDetail}>{contract.contact.address}</Text>}
            {contract.contact?.phone && <Text style={styles.partyDetail}>Tel: {contract.contact.phone}</Text>}
          </View>
        </View>

        {/* Contract details */}
        <Text style={styles.sectionTitle}>Shartnoma shartlari</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Shartnoma raqami</Text>
            <Text style={styles.infoValue}>#{contract.contractNumber}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Turi</Text>
            <Text style={styles.infoValue}>{TYPE_LABELS[contract.type] ?? contract.type}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Boshlanish sanasi</Text>
            <Text style={styles.infoValue}>{fmtDate(contract.startDate)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Tugash sanasi</Text>
            <Text style={styles.infoValue}>{fmtDate(contract.endDate)}</Text>
          </View>
          {contract.totalAmount && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Shartnoma summasi</Text>
              <Text style={[styles.infoValue, { color: COLORS.accent }]}>
                {fmt(contract.totalAmount, contract.currency)}
              </Text>
            </View>
          )}
        </View>

        {/* Description */}
        {contract.description && (
          <>
            <Text style={styles.sectionTitle}>Shartnoma predmeti</Text>
            <View style={{ padding: 12, backgroundColor: COLORS.bg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 }}>
              <Text style={{ fontSize: 9, lineHeight: 1.6, color: COLORS.text }}>{contract.description}</Text>
            </View>
          </>
        )}

        {/* Terms */}
        {contract.terms && (
          <>
            <Text style={styles.sectionTitle}>Qo'shimcha shartlar</Text>
            <View style={{ padding: 12, backgroundColor: COLORS.bg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 }}>
              <Text style={{ fontSize: 9, lineHeight: 1.6, color: COLORS.text }}>{contract.terms}</Text>
            </View>
          </>
        )}

        {/* Signatures */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Birinchi tomon imzosi: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>M.O. {company.legalName ?? company.name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Ikkinchi tomon imzosi: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>M.O. {contract.contact?.name ?? ''}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} | Shartnoma #{contract.contractNumber}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
