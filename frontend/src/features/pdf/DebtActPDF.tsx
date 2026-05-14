import { Document, Page, Text, View, Image } from '@react-pdf/renderer'
import { styles, COLORS } from './pdfStyles'

interface DebtActProps {
  debt: {
    id:          string
    type:        'RECEIVABLE' | 'PAYABLE'
    description: string | null
    amount:      number
    paidAmount:  number
    remaining:   number
    dueDate?:    string | null
    createdAt:   string
    isPaid:      boolean
    contact?: { name: string; phone?: string | null; address?: string }
    payments?: Array<{
      id: string; amount: number; method: string; paymentDate: string; notes?: string | null
    }>
  }
  company: { name: string; legalName?: string; stir?: string; address?: string; phone?: string; logo?: string }
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Naqd', CARD: 'Karta', TRANSFER: "O'tkazma", AVANS: 'Avans', OTHER: 'Boshqa',
}

function fmt(n: number) {
  return new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + " so'm"
}
function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('uz-UZ')
}

export function DebtActPDFDoc({ debt, company }: DebtActProps) {
  const actNum = debt.id.slice(-8).toUpperCase()
  const isReceivable = debt.type === 'RECEIVABLE'

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
            {company.stir && <Text style={styles.companyDetail}>STIR: {company.stir}</Text>}
            {company.address && <Text style={styles.companyDetail}>{company.address}</Text>}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.docTitle}>Qabul-topshirish dalolatnamasi</Text>
            <Text style={styles.docNumber}>Akt #{actNum}</Text>
            <Text style={styles.docDate}>Sana: {fmtDate(debt.createdAt)}</Text>
          </View>
        </View>

        {/* Act introduction */}
        <View style={{ marginBottom: 20, padding: 14, backgroundColor: COLORS.bg, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border }}>
          <Text style={{ fontSize: 10, lineHeight: 1.6, color: COLORS.text }}>
            {fmtDate(debt.createdAt)} yilda {company.name}{' '}
            {isReceivable
              ? `(Kreditor) va ${debt.contact?.name ?? '—'} (Debitor) o'rtasida`
              : `(Debitor) va ${debt.contact?.name ?? '—'} (Kreditor) o'rtasida`}{' '}
            quyidagi qarz bo'yicha hisob-kitob dalolatnamasi tuzildi:
          </Text>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{isReceivable ? 'Kreditor (Biz)' : 'Debitor (Biz)'}</Text>
            <Text style={styles.partyName}>{company.name}</Text>
            {company.stir && <Text style={styles.partyDetail}>STIR: {company.stir}</Text>}
            {company.address && <Text style={styles.partyDetail}>{company.address}</Text>}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>{isReceivable ? 'Debitor' : 'Kreditor'}</Text>
            <Text style={styles.partyName}>{debt.contact?.name ?? '—'}</Text>
            {debt.contact?.phone && <Text style={styles.partyDetail}>Tel: {debt.contact.phone}</Text>}
            {debt.contact?.address && <Text style={styles.partyDetail}>{debt.contact.address}</Text>}
          </View>
        </View>

        {/* Debt info */}
        <Text style={styles.sectionTitle}>Qarz ma'lumotlari</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Qarz sababi</Text>
            <Text style={styles.infoValue}>{debt.description ?? '—'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Dastlabki summa</Text>
            <Text style={styles.infoValue}>{fmt(debt.amount)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>To'langan summa</Text>
            <Text style={[styles.infoValue, { color: COLORS.success }]}>{fmt(debt.paidAmount)}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Qolgan qarz</Text>
            <Text style={[styles.infoValue, { color: debt.isPaid ? COLORS.success : COLORS.danger }]}>
              {debt.isPaid ? "To'liq to'langan ✓" : fmt(debt.remaining)}
            </Text>
          </View>
          {debt.dueDate && (
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>To'lash muddati</Text>
              <Text style={styles.infoValue}>{fmtDate(debt.dueDate)}</Text>
            </View>
          )}
        </View>

        {/* Payment history */}
        {(debt.payments ?? []).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>To'lovlar tarixi</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Sana</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Usul</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Summa</Text>
                <Text style={[styles.tableHeaderCell, { flex: 3 }]}>Izoh</Text>
              </View>
              {(debt.payments ?? []).map((p, i) => (
                <View key={p.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{fmtDate(p.paymentDate)}</Text>
                  <Text style={[styles.tableCell, { flex: 1.5 }]}>{METHOD_LABELS[p.method] ?? p.method}</Text>
                  <Text style={[styles.tableCellBold, { flex: 2, textAlign: 'right', color: COLORS.success }]}>
                    +{fmt(p.amount)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 3, color: COLORS.muted }]}>{p.notes ?? '—'}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Dastlabki qarz</Text>
            <Text style={styles.totalValue}>{fmt(debt.amount)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>To'langan</Text>
            <Text style={[styles.totalValue, { color: COLORS.success }]}>{fmt(debt.paidAmount)}</Text>
          </View>
          <View style={styles.totalRowFinal}>
            <Text style={styles.totalLabelFinal}>Qoldi</Text>
            <Text style={styles.totalValueFinal}>{debt.isPaid ? "To'liq ✓" : fmt(debt.remaining)}</Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.signaturesRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{isReceivable ? 'Kreditor' : 'Debitor'}: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>{company.name}</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>{isReceivable ? 'Debitor' : 'Kreditor'}: _______________</Text>
            <Text style={[styles.signatureLabel, { marginTop: 4 }]}>{debt.contact?.name ?? ''}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{company.name} | Akt #{actNum}</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) =>
            `${pageNumber} / ${totalPages}`
          } />
        </View>
      </Page>
    </Document>
  )
}
