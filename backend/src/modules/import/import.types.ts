// ============================================================
// IMPORT TYPES
// ============================================================

export type ImportSource = 'EXCEL' | 'CSV' | '1C' | 'DIDOX' | 'MANUAL'
export type ImportEntity = 'contact' | 'product' | 'debt' | 'stock' | 'employee' | 'deal'
export type ImportAction  = 'created' | 'updated' | 'skipped' | 'error' | 'merged'

export interface RawRow {
  [key: string]: string | number | null | undefined
}

export interface ColumnMapping {
  [sourceColumn: string]: string // sourceColumn → targetField
}

export interface ImportContactRow {
  name:        string
  type?:       string   // CUSTOMER | SUPPLIER | BOTH
  phone?:      string
  email?:      string
  address?:    string
  stir?:       string
  region?:     string
  notes?:      string
  // Ochilish qoldiqlari
  openingDebtAmount?:  number
  openingDebtType?:    string  // RECEIVABLE | PAYABLE
  openingDebtDate?:    string
}

export interface ImportProductRow {
  name:       string
  code?:      string
  barcode?:   string
  category?:  string
  unit?:      string
  buyPrice?:  number
  sellPrice?: number
  minPrice?:  number
  minStock?:  number
  // Boshlang'ich qoldiq
  openingStock?:     number
  openingAvgPrice?:  number
}

export interface ImportDebtRow {
  contactName:   string
  contactPhone?: string
  type:          string  // RECEIVABLE | PAYABLE
  amount:        number
  paidAmount?:   number
  currency?:     string
  dueDate?:      string
  notes?:        string
  referenceNo?:  string
}

export interface ImportStockRow {
  productName:  string
  productCode?: string
  quantity:     number
  avgPrice?:    number
  warehouseName?: string
}

export interface ImportEmployeeRow {
  firstName:    string
  lastName:     string
  position?:    string
  department?:  string
  phone?:       string
  email?:       string
  hireDate?:    string
  baseSalary?:  number
  employeeType?: string  // FULL_TIME | PART_TIME | CONTRACT
}

export interface ImportDealRow {
  contactName:  string
  title?:       string
  amount:       number
  stage?:       string
  closedAt?:    string
  notes?:       string
}

// Column detection patterns — aqlli ustun aniqlash
export const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  // Contact
  name:         [/^(ism|nomi?|name|наименование|контрагент|mijoz|firma)/i],
  type:         [/^(tur|type|тип|вид)/i],
  phone:        [/^(tel|phone|mobil|рабочий\s*тел|телефон)/i],
  email:        [/^(email|почта|e-?mail)/i],
  stir:         [/^(stir|инн|inn|солик|tax.?id)/i],
  address:      [/^(manzil|adres|address|адрес)/i],
  region:       [/^(viloyat|region|город|шаҳар)/i],

  // Product
  code:         [/^(kod|code|артикул|şifr)/i],
  barcode:      [/^(barcode|штрих|barkod)/i],
  category:     [/^(kategoriya|category|группа|group)/i],
  unit:         [/^(birlik|unit|ед\.?\s*изм|o`lchov)/i],
  buyPrice:     [/^(xarid|buy.?price|себестоимость|закупочн)/i],
  sellPrice:    [/^(sotish|sell.?price|цена\s*продажи|нарх)/i],
  minStock:     [/^(min.?qoldiq|min.?stock|минимальн|запас)/i],

  // Financial
  amount:       [/^(summa|amount|сумма|miqdor)/i],
  paidAmount:   [/^(to`langan|paid|оплачено)/i],
  remainAmount: [/^(qoldiq|remain|остаток)/i],
  dueDate:      [/^(muddat|due.?date|срок|to`lov\s*sanasi)/i],
  currency:     [/^(valyuta|currency|валюта)/i],

  // Employee
  firstName:    [/^(ism|first.?name|имя)/i],
  lastName:     [/^(familiya|last.?name|фамилия)/i],
  position:     [/^(lavozim|position|должность)/i],
  department:   [/^(bo`lim|department|отдел)/i],
  baseSalary:   [/^(maosh|salary|оклад|зарплата)/i],
  hireDate:     [/^(qabul|hire.?date|дата\s*приема)/i],

  // Deal
  title:        [/^(sarlavha|title|название|описание)/i],
  stage:        [/^(bosqich|stage|этап|стадия)/i],
  closedAt:     [/^(yopilgan|closed|закрыто|дата)/i],

  // Opening balances
  openingStock:      [/^(boshlang`ich\s*qoldiq|opening\s*stock|нач\.\s*остаток)/i],
  openingDebtAmount: [/^(boshlang`ich\s*qarz|opening\s*debt|нач\.\s*долг)/i],
}
