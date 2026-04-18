import * as XLSX from 'xlsx'

// ============================================
// EXCEL EKSPORT
// ============================================
export function exportToExcel(
  sheets: { name: string; data: Record<string, unknown>[] }[],
  filename: string
) {
  const wb = XLSX.utils.book_new()

  sheets.forEach(sheet => {
    if (!sheet.data.length) return

    const formatted = sheet.data.map(row => {
      const newRow: Record<string, unknown> = {}
      Object.entries(row).forEach(([key, value]) => {
        const label = COLUMN_LABELS[key] || key
        if (typeof value === 'boolean') {
          newRow[label] = value ? 'Ha' : "Yo'q"
        } else if (value instanceof Date) {
          newRow[label] = value.toLocaleDateString('uz-UZ')
        } else if (value === null || value === undefined) {
          newRow[label] = '—'
        } else {
          newRow[label] = value
        }
      })
      return newRow
    })

    const ws = XLSX.utils.json_to_sheet(formatted)

    const colWidths = Object.keys(formatted[0] || {}).map(key => ({
      wch: Math.max(
        key.length,
        ...formatted.map(row => String(row[key] ?? '').length)
      ) + 2,
    }))
    ws['!cols'] = colWidths

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
  })

  XLSX.writeFile(wb, `${filename}.xlsx`)
}

// ============================================
// CSV EKSPORT
// ============================================
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return

  const headers = Object.keys(data[0]).map(key => COLUMN_LABELS[key] || key)
  const rows    = data.map(row =>
    Object.values(row).map(val => {
      const str = String(val ?? '')
      return str.includes(',') ? `"${str}"` : str
    })
  )

  const csv  = [headers, ...rows].map(row => row.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ============================================
// PDF EKSPORT (jspdf + autotable)
// ============================================
export async function exportToPDF(config: {
  title:     string
  subtitle?: string
  period?:   string
  tables: {
    title:    string
    headers:  string[]
    rows:     (string | number)[][]
    summary?: { label: string; value: string }[]
  }[]
  filename: string
}) {
  const { jsPDF }  = await import('jspdf')
  const autoTable  = (await import('jspdf-autotable')).default

  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
  doc.setFont('helvetica')

  let yPos = 20

  // Sarlavha
  doc.setFontSize(18)
  doc.setTextColor(26, 86, 219)
  doc.text(config.title, 14, yPos)
  yPos += 8

  if (config.subtitle) {
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.text(config.subtitle, 14, yPos)
    yPos += 6
  }

  if (config.period) {
    doc.setFontSize(9)
    doc.setTextColor(156, 163, 175)
    doc.text(`Davr: ${config.period}`, 14, yPos)
    yPos += 4
  }

  doc.setDrawColor(229, 231, 235)
  doc.line(14, yPos + 2, 283, yPos + 2)
  yPos += 8

  config.tables.forEach(table => {
    doc.setFontSize(11)
    doc.setTextColor(31, 41, 55)
    doc.text(table.title, 14, yPos)
    yPos += 6

    autoTable(doc, {
      startY: yPos,
      head:   [table.headers],
      body:   table.rows,
      theme:  'grid',
      headStyles: {
        fillColor: [26, 86, 219],
        textColor: 255,
        fontStyle: 'bold',
        fontSize:  9,
      },
      bodyStyles: {
        fontSize:  8,
        textColor: [31, 41, 55],
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      margin: { left: 14, right: 14 },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8

    if (table.summary?.length) {
      doc.setFontSize(9)
      table.summary.forEach(s => {
        doc.setTextColor(107, 114, 128)
        doc.text(s.label, 14, yPos)
        doc.setTextColor(31, 41, 55)
        doc.setFont('helvetica', 'bold')
        doc.text(s.value, 80, yPos)
        doc.setFont('helvetica', 'normal')
        yPos += 5
      })
      yPos += 4
    }
  })

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175)
    doc.text(
      `BIZZO Platform  |  ${new Date().toLocaleDateString('uz-UZ')}  |  ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    )
  }

  doc.save(`${config.filename}.pdf`)
}

// ============================================
// INVOICE PDF
// ============================================
export async function exportInvoicePDF(invoice: {
  invoiceNumber: string
  contact?:      { name: string; email?: string }
  createdAt:     string
  dueDate?:      string
  items?:        { name: string; quantity: number; unit: string; price: number; discount: number; totalPrice: number }[]
  subtotal:      number
  taxRate:       number
  taxAmount:     number
  discount:      number
  totalAmount:   number
  paidAmount:    number
  notes?:        string
  status:        string
  companyName?:  string
}) {
  const { jsPDF }  = await import('jspdf')
  const autoTable  = (await import('jspdf-autotable')).default
  const doc        = new jsPDF({ orientation: 'portrait', format: 'a4' })
  const W          = doc.internal.pageSize.width
  const fmt        = (n: number) => new Intl.NumberFormat('uz-UZ').format(Math.round(n)) + " so'm"

  // Header band
  doc.setFillColor(26, 86, 219)
  doc.rect(0, 0, W, 40, 'F')

  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('BIZZO', 14, 18)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.companyName || 'BiznesERP Platform', 14, 27)

  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('HISOB-FAKTURA', W - 14, 16, { align: 'right' })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`№ ${invoice.invoiceNumber}`, W - 14, 25, { align: 'right' })

  const statusLabel: Record<string, string> = {
    DRAFT: "Qoralama", SENT: "Yuborildi", PAID: "To'langan",
    PARTIAL: "Qisman", OVERDUE: "Muddati o'tdi", CANCELLED: "Bekor qilindi"
  }
  doc.text(statusLabel[invoice.status] || invoice.status, W - 14, 33, { align: 'right' })

  // Billing info
  doc.setTextColor(31, 41, 55)
  let y = 52
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('Kimga:', 14, y)
  doc.setFont('helvetica', 'normal')
  doc.text(invoice.contact?.name || '—', 14, y + 6)
  if (invoice.contact?.email) doc.text(invoice.contact.email, 14, y + 12)

  doc.setFont('helvetica', 'bold')
  doc.text("Sana:", W / 2, y)
  doc.setFont('helvetica', 'normal')
  doc.text(new Date(invoice.createdAt).toLocaleDateString('uz-UZ'), W / 2, y + 6)

  if (invoice.dueDate) {
    doc.setFont('helvetica', 'bold')
    doc.text("To'lov muddati:", W / 2, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.text(new Date(invoice.dueDate).toLocaleDateString('uz-UZ'), W / 2, y + 20)
  }

  // Items table
  y = 85
  const rows = (invoice.items || []).map((it, i) => [
    String(i + 1),
    it.name,
    String(it.quantity),
    it.unit,
    fmt(it.price),
    it.discount > 0 ? `${it.discount}%` : '—',
    fmt(it.totalPrice),
  ])

  autoTable(doc, {
    startY:   y,
    head:     [['#', 'Nomi', 'Miqdor', 'Birlik', 'Narxi', 'Chegirma', 'Jami']],
    body:     rows,
    theme:    'grid',
    headStyles:  { fillColor: [26, 86, 219], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles:  { fontSize: 8, textColor: [31, 41, 55] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { cellWidth: 8 }, 6: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // Totals
  const totals = [
    ["Narx summasi:",    fmt(invoice.subtotal)],
    invoice.discount > 0 ? [`Chegirma (${invoice.discount}%):`, `- ${fmt(invoice.subtotal * invoice.discount / 100)}`] : null,
    invoice.taxRate > 0  ? [`QQS (${invoice.taxRate}%):`, fmt(invoice.taxAmount)] : null,
    ["JAMI:",            fmt(invoice.totalAmount)],
    invoice.paidAmount > 0 ? ["To'langan:", `- ${fmt(invoice.paidAmount)}`] : null,
    invoice.paidAmount > 0 ? ["Qoldi:", fmt(invoice.totalAmount - invoice.paidAmount)] : null,
  ].filter(Boolean) as string[][]

  const startX = W - 100
  totals.forEach((row, i) => {
    const isTotal = row[0] === 'JAMI:'
    if (isTotal) {
      doc.setFillColor(26, 86, 219)
      doc.rect(startX - 2, y - 4, 88, 9, 'F')
      doc.setTextColor(255, 255, 255)
    } else {
      doc.setTextColor(107, 114, 128)
    }
    doc.setFontSize(isTotal ? 10 : 8)
    doc.setFont('helvetica', isTotal ? 'bold' : 'normal')
    doc.text(row[0], startX, y)
    doc.text(row[1], W - 14, y, { align: 'right' })
    y += isTotal ? 12 : 7
  })

  // Notes
  if (invoice.notes) {
    doc.setTextColor(107, 114, 128)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'italic')
    doc.text(`Izoh: ${invoice.notes}`, 14, y + 4)
  }

  // Footer
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(156, 163, 175)
  doc.text(
    `BIZZO Platform  |  ${new Date().toLocaleDateString('uz-UZ')}`,
    W / 2,
    doc.internal.pageSize.height - 8,
    { align: 'center' }
  )

  doc.save(`invoice-${invoice.invoiceNumber}.pdf`)
}

// ============================================
// USTUN NOMLARI (O'zbek tilida)
// ============================================
const COLUMN_LABELS: Record<string, string> = {
  id:            'ID',
  name:          'Nomi',
  createdAt:     'Yaratilgan sana',
  updatedAt:     'Yangilangan sana',
  contact:       'Mijoz',
  contactId:     'Mijoz ID',
  phone:         'Telefon',
  email:         'Email',
  address:       'Manzil',
  type:          'Turi',
  productName:   'Mahsulot',
  productCode:   'Kod',
  category:      'Kategoriya',
  unit:          'Birlik',
  quantity:      'Miqdor',
  buyPrice:      'Xarid narxi',
  sellPrice:     'Sotish narxi',
  minStock:      "Min. qoldiq",
  totalValue:    'Jami qiymat',
  isLow:         'Kam qoldiq',
  dealNumber:    'Deal raqami',
  amount:        'Summa',
  finalAmount:   'Jami summa',
  closedAt:      'Yopilgan sana',
  itemsCount:    'Mahsulotlar soni',
  position:      'Lavozim',
  department:    "Bo'lim",
  employeeType:  'Tur',
  baseSalary:    'Oylik maosh',
  dailyRate:     'Kunlik tarif',
  workDays:      'Ish kunlari',
  totalDue:      "To'lash kerak",
  totalPaid:     "To'langan",
  unpaid:        'Qoldi',
  remainAmount:  'Qoldiq',
  paidAmount:    "To'langan",
  dueDate:       'Muddati',
  isOverdue:     "Muddati o'tdi",
  batchNumber:   'Partiya raqami',
  sourceType:    'Manba',
  qualityType:   'Sifat turi',
  inputWeight:   'Kirdi (kg)',
  outputWeight:  'Chiqdi (kg)',
  lossWeight:    "Yo'qotish (kg)",
  lossPercent:   "Yo'qotish %",
  totalCost:     'Xarajat',
  pricePerKg:    'Narx/kg',
  status:        'Holat',
  receivedAt:    'Qabul qilingan',
  warehouse:     'Omborxona',
  totalIn:       'Kirim',
  totalOut:      'Chiqim',
  totalRevenue:  'Daromad',
  totalExpenses: 'Xarajat',
  netProfit:     'Foyda',
  profitMargin:  'Foyda %',
}
