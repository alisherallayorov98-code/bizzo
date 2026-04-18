import { Injectable } from '@nestjs/common'
import { ImportEntity } from './import.types'

// Excel shablon ma'lumotlari (XLSX kutubxonasiz — JSON sifatida qaytaramiz,
// frontend XLSX bilan yuklab oladi)
@Injectable()
export class TemplateService {
  getTemplate(entity: ImportEntity): {
    headers:  string[]
    example:  Record<string, string>[]
    required: string[]
    hints:    Record<string, string>
  } {
    switch (entity) {
      case 'contact': return {
        headers:  ['Ism/Nomi', 'Turi', 'Telefon', 'Email', 'STIR', 'Manzil', 'Viloyat', 'Izoh', 'Ochilish qarzi (so\'m)', 'Qarz turi', 'Qarz muddati'],
        required: ['Ism/Nomi'],
        example: [{
          'Ism/Nomi': 'Toshmatov Savdo MChJ',
          'Turi': 'CUSTOMER',
          'Telefon': '+998901234567',
          'Email': 'info@toshmatov.uz',
          'STIR': '123456789',
          'Manzil': 'Toshkent sh., Chilonzor t.',
          'Viloyat': 'Toshkent',
          'Izoh': '',
          "Ochilish qarzi (so'm)": '5000000',
          'Qarz turi': 'RECEIVABLE',
          'Qarz muddati': '2024-12-31',
        }, {
          'Ism/Nomi': 'Abdullayev Jamshid',
          'Turi': 'SUPPLIER',
          'Telefon': '+998712223344',
          'Email': '',
          'STIR': '',
          'Manzil': '',
          'Viloyat': 'Samarqand',
          'Izoh': 'Asosiy yetkazuvchi',
          "Ochilish qarzi (so'm)": '2500000',
          'Qarz turi': 'PAYABLE',
          'Qarz muddati': '2025-01-15',
        }],
        hints: {
          'Turi': 'CUSTOMER (mijoz), SUPPLIER (yetkazuvchi), BOTH (ikkalasi)',
          'Qarz turi': 'RECEIVABLE (siz olasiz), PAYABLE (siz to\'laysiz)',
          'Qarz muddati': 'YYYY-MM-DD formatida (masalan: 2025-06-30)',
        },
      }

      case 'product': return {
        headers:  ['Nomi', 'Kodi', 'Barcode', 'Kategoriya', 'O\'lchov birligi', 'Xarid narxi', 'Sotish narxi', 'Min. qoldiq', 'Boshlang\'ich qoldiq', 'O\'rtacha narx'],
        required: ['Nomi'],
        example: [{
          'Nomi': 'Polipropilen qop 50kg',
          'Kodi': 'PP-50',
          'Barcode': '4600000000001',
          'Kategoriya': 'Qoplar',
          "O'lchov birligi": 'dona',
          'Xarid narxi': '2500',
          'Sotish narxi': '3200',
          'Min. qoldiq': '500',
          "Boshlang'ich qoldiq": '1200',
          "O'rtacha narx": '2500',
        }, {
          'Nomi': 'Granula PP qayta',
          'Kodi': 'GR-PP',
          'Barcode': '',
          'Kategoriya': 'Granulalar',
          "O'lchov birligi": 'kg',
          'Xarid narxi': '4200',
          'Sotish narxi': '5500',
          'Min. qoldiq': '500',
          "Boshlang'ich qoldiq": '3000',
          "O'rtacha narx": '4200',
        }],
        hints: {
          "O'lchov birligi": 'dona, kg, litr, m, m2, tonna, qop',
          "Boshlang'ich qoldiq": 'Shu kunga qadar omborxonadagi miqdor',
        },
      }

      case 'debt': return {
        headers:  ['Kontragent nomi', 'Telefon', 'Qarz turi', 'Summa', 'To\'langan', 'Valyuta', 'Muddat', 'Izoh'],
        required: ['Kontragent nomi', 'Qarz turi', 'Summa'],
        example: [{
          'Kontragent nomi': 'Karimov Baxtiyor',
          'Telefon': '+998901112233',
          'Qarz turi': 'RECEIVABLE',
          'Summa': '3500000',
          "To'langan": '1000000',
          'Valyuta': 'UZS',
          'Muddat': '2025-03-31',
          'Izoh': '2024-yil shartnomasi',
        }],
        hints: {
          'Qarz turi': 'RECEIVABLE (sizga qarzdor), PAYABLE (siz qarzdorsiz)',
          'Valyuta': 'UZS, USD, EUR',
        },
      }

      case 'stock': return {
        headers:  ['Mahsulot nomi', 'Kodi', 'Miqdor', 'O\'rtacha narx', 'Omborxona'],
        required: ['Mahsulot nomi', 'Miqdor'],
        example: [{
          'Mahsulot nomi': 'Polipropilen qop 50kg',
          'Kodi': 'PP-50',
          'Miqdor': '1200',
          "O'rtacha narx": '2500',
          'Omborxona': 'Asosiy ombor',
        }],
        hints: {
          'Omborxona': 'Bo\'sh qoldirsangiz asosiy omborxonaga qo\'shiladi',
        },
      }

      case 'employee': return {
        headers:  ['Ism', 'Familiya', 'Lavozim', 'Bo\'lim', 'Telefon', 'Email', 'Qabul sanasi', 'Maosh (so\'m)', 'Turi'],
        required: ['Ism', 'Familiya'],
        example: [{
          'Ism': 'Jasur',
          'Familiya': 'Nazarov',
          'Lavozim': 'Omborchi',
          "Bo'lim": 'Ombor',
          'Telefon': '+998901234567',
          'Email': 'jasur@company.uz',
          'Qabul sanasi': '2022-01-15',
          "Maosh (so'm)": '3500000',
          'Turi': 'FULL_TIME',
        }],
        hints: {
          'Turi': 'FULL_TIME, PART_TIME, CONTRACT',
          'Qabul sanasi': 'YYYY-MM-DD formatida',
        },
      }

      case 'deal': return {
        headers:  ['Kontragent', 'Sarlavha', 'Summa', 'Bosqich', 'Yopilgan sana', 'Izoh'],
        required: ['Kontragent', 'Summa'],
        example: [{
          'Kontragent': 'Toshmatov Savdo MChJ',
          'Sarlavha': '2024-yil 1-kvartal shartnomasi',
          'Summa': '15000000',
          'Bosqich': 'WON',
          'Yopilgan sana': '2024-03-31',
          'Izoh': '',
        }],
        hints: {
          'Bosqich': 'LEAD, CONTACT, PROPOSAL, NEGOTIATION, WON, LOST',
        },
      }

      default:
        return { headers: [], example: [], required: [], hints: {} }
    }
  }

  getAllTemplates() {
    const entities: ImportEntity[] = ['contact', 'product', 'debt', 'stock', 'employee', 'deal']
    return entities.map(e => ({ entity: e, ...this.getTemplate(e) }))
  }
}
