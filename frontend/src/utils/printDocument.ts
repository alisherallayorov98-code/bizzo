export function printHTML(html: string, title = 'BIZZO') {
  const win = window.open('', '_blank', 'width=800,height=600')
  if (!win) { alert('Pop-up bloklangan. Brauzer ruxsatlarini tekshiring.'); return }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="uz">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 12pt; color: #000; background: #fff; }
        .page { width: 210mm; min-height: 297mm; padding: 15mm 15mm 15mm 25mm; margin: 0 auto; }
        .receipt { width: 58mm; padding: 4mm; font-size: 9pt; margin: 0 auto; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 4px 6px; }
        th { background: #f5f5f5; font-weight: bold; }
        .text-right  { text-align: right; }
        .text-center { text-align: center; }
        .bold  { font-weight: bold; }
        .large { font-size: 14pt; }
        .small { font-size: 9pt; color: #666; }
        .divider { border-top: 1px dashed #000; margin: 6px 0; }
        .logo-box {
          width: 10mm; height: 10mm; background: #2563eb;
          border-radius: 2mm; display: inline-flex;
          align-items: center; justify-content: center;
          color: white; font-weight: 900; font-size: 14pt;
        }
        @media print {
          @page { margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align:center;padding:10px;background:#f0f0f0;border-bottom:1px solid #ccc;">
        <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;margin-right:8px;">
          🖨️ Chop etish
        </button>
        <button onclick="window.close()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;font-size:13px;">
          Yopish
        </button>
      </div>
      ${html}
    </body>
    </html>
  `)
  win.document.close()
  setTimeout(() => win.print(), 500)
}

export function generateReceipt(params: {
  companyName:   string
  items:         { name: string; qty: number; unit: string; price: number; total: number }[]
  subtotal:      number
  discount?:     number
  total:         number
  paymentMethod: string
  contactName?:  string
  date:          string
  cashier?:      string
}): string {
  const fmt = (n: number) => n.toLocaleString('uz-UZ') + " so'm"
  const payLabels: Record<string, string> = {
    CASH: 'Naqd', DEBT: 'Qarz', CARD: 'Karta', TRANSFER: "O'tkazma",
  }

  return `
    <div class="receipt">
      <div class="text-center" style="margin-bottom:6px;">
        <div class="bold large">${params.companyName}</div>
        <div class="small">${params.date}</div>
        ${params.cashier ? `<div class="small">Kassir: ${params.cashier}</div>` : ''}
      </div>
      <div class="divider"></div>
      ${params.items.map(item => `
        <div>${item.name}</div>
        <div style="display:flex;justify-content:space-between;">
          <span class="small">${item.qty} ${item.unit} × ${fmt(item.price)}</span>
          <span class="bold">${fmt(item.total)}</span>
        </div>
      `).join('')}
      <div class="divider"></div>
      ${params.discount ? `
        <div style="display:flex;justify-content:space-between;">
          <span>Chegirma:</span><span>-${fmt(params.discount)}</span>
        </div>
      ` : ''}
      <div style="display:flex;justify-content:space-between;" class="bold large">
        <span>JAMI:</span><span>${fmt(params.total)}</span>
      </div>
      <div class="small" style="margin-top:4px;">
        To'lov: ${payLabels[params.paymentMethod] || params.paymentMethod}
      </div>
      ${params.contactName ? `<div class="small">Mijoz: ${params.contactName}</div>` : ''}
      <div class="divider"></div>
      <div class="text-center small">Rahmat! • app.bizzo.uz</div>
    </div>
  `
}

export function generateNakladnaya(params: {
  type:       'IN' | 'OUT'
  docNumber:  string
  date:       string
  company:    { name: string; stir?: string; address?: string }
  contact?:   { name: string; stir?: string; address?: string }
  items:      { name: string; unit: string; qty: number; price: number; total: number }[]
  total:      number
  notes?:     string
}): string {
  const fmt = (n: number) => n.toLocaleString('uz-UZ')
  const typeLabel = params.type === 'IN' ? 'KIRIM' : 'CHIQIM'
  const fromTo    = params.type === 'IN'
    ? { from: params.contact?.name || '—', to: params.company.name }
    : { from: params.company.name,          to: params.contact?.name || '—' }

  return `
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="logo-box">B</div>
          <div>
            <div class="bold" style="font-size:15pt;">BIZZO</div>
            <div class="small">${params.company.name}</div>
          </div>
        </div>
        <div class="text-right small">
          <div>STIR: ${params.company.stir || '—'}</div>
          <div>${params.company.address || ''}</div>
        </div>
      </div>
      <hr style="border-color:#2563eb;border-width:2px;margin-bottom:12px;">
      <div class="text-center" style="margin-bottom:12px;">
        <div class="bold large">TOVAR YETKAZIB BERISH DALOLAT VARAQASI (NAKLADNAYA)</div>
        <div class="bold" style="font-size:13pt;">${typeLabel} — ${params.docNumber}</div>
        <div class="small">${params.date}</div>
      </div>
      <table style="margin-bottom:12px;border:none;">
        <tr style="border:none;">
          <td style="border:none;width:50%;vertical-align:top;">
            <div class="small bold">YUBORUVCHI:</div>
            <div class="bold">${fromTo.from}</div>
            ${params.type === 'IN' && params.contact?.stir ? `<div class="small">STIR: ${params.contact.stir}</div>` : ''}
            ${params.type === 'OUT' ? `<div class="small">STIR: ${params.company.stir || '—'}</div>` : ''}
          </td>
          <td style="border:none;width:50%;vertical-align:top;">
            <div class="small bold">QABUL QILUVCHI:</div>
            <div class="bold">${fromTo.to}</div>
            ${params.type === 'OUT' && params.contact?.stir ? `<div class="small">STIR: ${params.contact.stir}</div>` : ''}
            ${params.type === 'IN' ? `<div class="small">STIR: ${params.company.stir || '—'}</div>` : ''}
          </td>
        </tr>
      </table>
      <table style="margin-bottom:12px;">
        <thead>
          <tr>
            <th style="width:5%">#</th>
            <th style="width:40%">Mahsulot nomi</th>
            <th style="width:12%" class="text-center">Birlik</th>
            <th style="width:13%" class="text-right">Miqdor</th>
            <th style="width:15%" class="text-right">Narx (so'm)</th>
            <th style="width:15%" class="text-right">Summa (so'm)</th>
          </tr>
        </thead>
        <tbody>
          ${params.items.map((item, i) => `
            <tr>
              <td class="text-center">${i + 1}</td>
              <td>${item.name}</td>
              <td class="text-center">${item.unit}</td>
              <td class="text-right">${item.qty}</td>
              <td class="text-right">${fmt(item.price)}</td>
              <td class="text-right bold">${fmt(item.total)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5" class="text-right bold">JAMI:</td>
            <td class="text-right bold large">${fmt(params.total)} so'm</td>
          </tr>
        </tfoot>
      </table>
      ${params.notes ? `<div class="small" style="margin-bottom:20px;">Izoh: ${params.notes}</div>` : ''}
      <table style="border:none;margin-top:20px;">
        <tr style="border:none;">
          <td style="border:none;width:50%;">
            <div class="small">Topshirdi:</div>
            <div style="margin-top:20px;border-top:1px solid #000;width:60%;padding-top:4px;">
              <span class="small">imzo, F.I.O.</span>
            </div>
          </td>
          <td style="border:none;width:50%;">
            <div class="small">Qabul qildi:</div>
            <div style="margin-top:20px;border-top:1px solid #000;width:60%;padding-top:4px;">
              <span class="small">imzo, F.I.O.</span>
            </div>
          </td>
        </tr>
      </table>
      <div class="small text-center" style="margin-top:16px;color:#999;">
        BIZZO ERP • app.bizzo.uz • ${new Date().getFullYear()}
      </div>
    </div>
  `
}
