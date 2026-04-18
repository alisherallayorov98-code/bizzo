/**
 * Didox-uslubidagi shartnoma HTML generatsiyasi.
 * Keyingi bosqichda puppeteer/wkhtmltopdf orqali PDF ga o'giriladi.
 */
export function renderContractHtml(params: {
  contract: any;
  contact: any;
  company: any;
}): string {
  const { contract, contact, company } = params;
  const date = new Date(contract.createdAt).toLocaleDateString('uz-UZ');
  const money = contract.totalAmount
    ? `${Number(contract.totalAmount).toLocaleString('uz-UZ')} ${contract.currency}`
    : '—';

  return `<!DOCTYPE html>
<html lang="uz">
<head>
<meta charset="UTF-8"/>
<title>${escape(contract.contractNumber)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; color: #000; line-height: 1.5; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 4px; }
  .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
  .party { border: 1px solid #000; padding: 10px; }
  .party h3 { margin: 0 0 8px; font-size: 12pt; }
  table.terms { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.terms td { border: 1px solid #000; padding: 6px 8px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
  .sig { border-top: 1px solid #000; padding-top: 6px; text-align: center; font-size: 10pt; }
  .amount { font-size: 14pt; font-weight: bold; }
</style>
</head>
<body>
  <h1>${escape(contract.title)}</h1>
  <div class="meta">
    <div>№ <b>${escape(contract.contractNumber)}</b></div>
    <div>Toshkent sh.</div>
    <div>${escape(date)}</div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Yetkazib beruvchi</h3>
      <div><b>${escape(company?.name || '')}</b></div>
      <div>INN: ${escape(company?.inn || '—')}</div>
      <div>Manzil: ${escape(company?.address || '—')}</div>
      <div>Tel: ${escape(company?.phone || '—')}</div>
    </div>
    <div class="party">
      <h3>Xaridor</h3>
      <div><b>${escape(contact?.name || '')}</b></div>
      <div>INN: ${escape(contact?.inn || '—')}</div>
      <div>Manzil: ${escape(contact?.address || '—')}</div>
      <div>Tel: ${escape(contact?.phone || '—')}</div>
    </div>
  </div>

  <h3>Shartnoma shartlari</h3>
  <table class="terms">
    <tr><td width="40%">Summa</td><td class="amount">${escape(money)}</td></tr>
    <tr><td>Boshlanish sanasi</td><td>${fmt(contract.startDate)}</td></tr>
    <tr><td>Tugash sanasi</td><td>${fmt(contract.endDate)}</td></tr>
    <tr><td>Valyuta</td><td>${escape(contract.currency)}</td></tr>
  </table>

  ${contract.notes ? `<h3>Qo'shimcha shartlar</h3><p>${escape(contract.notes)}</p>` : ''}

  ${renderData(contract.data)}

  <div class="signatures">
    <div class="sig">Yetkazib beruvchi<br/>${escape(company?.name || '')}</div>
    <div class="sig">Xaridor<br/>${escape(contact?.name || '')}</div>
  </div>
</body>
</html>`;
}

function escape(v: any): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] as string));
}

function fmt(d?: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('uz-UZ');
}

function renderData(data: any): string {
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) return '';
  const rows = Object.entries(data)
    .map(([k, v]) => `<tr><td>${escape(k)}</td><td>${escape(v)}</td></tr>`)
    .join('');
  return `<h3>Qo'shimcha ma'lumotlar</h3><table class="terms">${rows}</table>`;
}
