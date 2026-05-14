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
  [sourceColumn: string]: string // sourceColumn в†’ targetField
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

// Column detection patterns вЂ” aqlli ustun aniqlash
export const COLUMN_PATTERNS: Record<string, RegExp[]> = {
  // Contact
  name:         [/^(ism|nomi?|name|РЅР°РёРјРµРЅРѕРІР°РЅРёРµ|РєРѕРЅС‚СЂР°РіРµРЅС‚|mijoz|firma)/i],
  type:         [/^(tur|type|С‚РёРї|РІРёРґ)/i],
  phone:        [/^(tel|phone|mobil|СЂР°Р±РѕС‡РёР№\s*С‚РµР»|С‚РµР»РµС„РѕРЅ)/i],
  email:        [/^(email|РїРѕС‡С‚Р°|e-?mail)/i],
  stir:         [/^(stir|РёРЅРЅ|inn|СЃРѕР»РёРє|tax.?id)/i],
  address:      [/^(manzil|adres|address|Р°РґСЂРµСЃ)/i],
  region:       [/^(viloyat|region|РіРѕСЂРѕРґ|С€Р°ТіР°СЂ)/i],

  // Product
  code:         [/^(kod|code|Р°СЂС‚РёРєСѓР»|Еџifr)/i],
  barcode:      [/^(barcode|С€С‚СЂРёС…|barkod)/i],
  category:     [/^(kategoriya|category|РіСЂСѓРїРїР°|group)/i],
  unit:         [/^(birlik|unit|РµРґ\.?\s*РёР·Рј|o`lchov)/i],
  buyPrice:     [/^(xarid|buy.?price|СЃРµР±РµСЃС‚РѕРёРјРѕСЃС‚СЊ|Р·Р°РєСѓРїРѕС‡РЅ)/i],
  sellPrice:    [/^(sotish|sell.?price|С†РµРЅР°\s*РїСЂРѕРґР°Р¶Рё|РЅР°СЂС…)/i],
  minStock:     [/^(min.?qoldiq|min.?stock|РјРёРЅРёРјР°Р»СЊРЅ|Р·Р°РїР°СЃ)/i],

  // Financial
  amount:       [/^(summa|amount|СЃСѓРјРјР°|miqdor)/i],
  paidAmount:   [/^(to`langan|paid|РѕРїР»Р°С‡РµРЅРѕ)/i],
  remaining: [/^(qoldiq|remain|РѕСЃС‚Р°С‚РѕРє)/i],
  dueDate:      [/^(muddat|due.?date|СЃСЂРѕРє|to`lov\s*sanasi)/i],
  currency:     [/^(valyuta|currency|РІР°Р»СЋС‚Р°)/i],

  // Employee
  firstName:    [/^(ism|first.?name|РёРјСЏ)/i],
  lastName:     [/^(familiya|last.?name|С„Р°РјРёР»РёСЏ)/i],
  position:     [/^(lavozim|position|РґРѕР»Р¶РЅРѕСЃС‚СЊ)/i],
  department:   [/^(bo`lim|department|РѕС‚РґРµР»)/i],
  baseSalary:   [/^(maosh|salary|РѕРєР»Р°Рґ|Р·Р°СЂРїР»Р°С‚Р°)/i],
  hireDate:     [/^(qabul|hire.?date|РґР°С‚Р°\s*РїСЂРёРµРјР°)/i],

  // Deal
  title:        [/^(sarlavha|title|РЅР°Р·РІР°РЅРёРµ|РѕРїРёСЃР°РЅРёРµ)/i],
  stage:        [/^(bosqich|stage|СЌС‚Р°Рї|СЃС‚Р°РґРёСЏ)/i],
  closedAt:     [/^(yopilgan|closed|Р·Р°РєСЂС‹С‚Рѕ|РґР°С‚Р°)/i],

  // Opening balances
  openingStock:      [/^(boshlang`ich\s*qoldiq|opening\s*stock|РЅР°С‡\.\s*РѕСЃС‚Р°С‚РѕРє)/i],
  openingDebtAmount: [/^(boshlang`ich\s*qarz|opening\s*debt|РЅР°С‡\.\s*РґРѕР»Рі)/i],
}

