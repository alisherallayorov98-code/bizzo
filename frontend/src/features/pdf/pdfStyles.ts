import { StyleSheet, Font } from '@react-pdf/renderer'

// Register standard fonts (built-in Helvetica works without file loading)
export const COLORS = {
  primary:   '#1E3A5F',
  accent:    '#3B82F6',
  success:   '#10B981',
  danger:    '#EF4444',
  warning:   '#F59E0B',
  text:      '#1F2937',
  muted:     '#6B7280',
  border:    '#E5E7EB',
  bg:        '#F9FAFB',
  white:     '#FFFFFF',
}

export const styles = StyleSheet.create({
  page: {
    fontFamily:  'Helvetica',
    fontSize:    10,
    color:       COLORS.text,
    paddingTop:    40,
    paddingBottom: 60,
    paddingLeft:   50,
    paddingRight:  50,
    backgroundColor: COLORS.white,
  },

  // ── Header ──────────────────────────────────────
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems:    'flex-start',
    marginBottom:  24,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  headerLeft: { flex: 1 },
  headerRight: { alignItems: 'flex-end' },

  companyName: {
    fontSize:   16,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.primary,
    marginBottom: 4,
  },
  companyDetail: {
    fontSize: 9,
    color:    COLORS.muted,
    marginBottom: 2,
  },

  docTitle: {
    fontSize:   22,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.primary,
    marginBottom: 4,
  },
  docNumber: {
    fontSize: 11,
    color:    COLORS.accent,
    fontFamily: 'Helvetica-Bold',
  },
  docDate: {
    fontSize: 9,
    color:    COLORS.muted,
    marginTop: 4,
  },

  // ── Parties ─────────────────────────────────────
  partiesRow: {
    flexDirection: 'row',
    gap:           24,
    marginBottom:  20,
  },
  partyBox: {
    flex: 1,
    padding: 12,
    backgroundColor: COLORS.bg,
    borderRadius:    4,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  partyLabel: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom:  6,
  },
  partyName: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.text,
    marginBottom: 3,
  },
  partyDetail: {
    fontSize: 9,
    color:    COLORS.muted,
    marginBottom: 2,
  },

  // ── Table ───────────────────────────────────────
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection:   'row',
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius:    3,
    marginBottom:    1,
  },
  tableHeaderCell: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.white,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableRow: {
    flexDirection:     'row',
    paddingVertical:   7,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRowAlt: {
    backgroundColor: COLORS.bg,
  },
  tableCell: {
    fontSize: 9,
    color:    COLORS.text,
  },
  tableCellBold: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.text,
  },

  // ── Totals ──────────────────────────────────────
  totalsBox: {
    alignSelf:       'flex-end',
    width:           260,
    borderWidth:     1,
    borderColor:     COLORS.border,
    borderRadius:    4,
    overflow:        'hidden',
    marginBottom:    20,
  },
  totalRow: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    paddingVertical:   7,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  totalRowFinal: {
    flexDirection:     'row',
    justifyContent:    'space-between',
    paddingVertical:   10,
    paddingHorizontal: 12,
    backgroundColor:   COLORS.primary,
  },
  totalLabel: {
    fontSize: 9,
    color:    COLORS.muted,
  },
  totalValue: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.text,
  },
  totalValueFinal: {
    fontSize:   11,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.white,
  },
  totalLabelFinal: {
    fontSize:   9,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.white,
  },

  // ── Status badge ────────────────────────────────
  badge: {
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:      10,
    alignSelf:         'flex-start',
  },
  badgeText: {
    fontSize:   8,
    fontFamily: 'Helvetica-Bold',
  },

  // ── Footer ──────────────────────────────────────
  footer: {
    position:   'absolute',
    bottom:     30,
    left:       50,
    right:      50,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop:  8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 8,
    color:    COLORS.muted,
  },

  // ── Signatures ──────────────────────────────────
  signaturesRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      40,
    gap:            40,
  },
  signatureBox: {
    flex:         1,
    borderTopWidth: 1,
    borderTopColor: COLORS.text,
    paddingTop:   6,
  },
  signatureLabel: {
    fontSize: 8,
    color:    COLORS.muted,
  },

  // ── Section title ───────────────────────────────
  sectionTitle: {
    fontSize:     11,
    fontFamily:   'Helvetica-Bold',
    color:        COLORS.primary,
    marginBottom: 10,
    marginTop:    16,
  },

  // ── Info grid ───────────────────────────────────
  infoGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           8,
    marginBottom:  16,
  },
  infoItem: {
    width:  '48%',
    padding: 8,
    backgroundColor: COLORS.bg,
    borderRadius:    4,
    borderWidth:     1,
    borderColor:     COLORS.border,
  },
  infoLabel: {
    fontSize:     8,
    color:        COLORS.muted,
    marginBottom: 3,
  },
  infoValue: {
    fontSize:   10,
    fontFamily: 'Helvetica-Bold',
    color:      COLORS.text,
  },
})
