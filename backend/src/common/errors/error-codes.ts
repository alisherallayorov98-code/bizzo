/**
 * BIZZO API xato kodlari — markazlashtirilgan katalog.
 * Har bir kod: <MODULE>_<NUM> formatida. HTTP status bilan birga qaytariladi.
 */
export const ERROR_CODES = {
  // AUTH
  AUTH_001: { http: 401, message: "Email yoki parol noto'g'ri" },
  AUTH_002: { http: 401, message: 'Token muddati tugagan' },
  AUTH_003: { http: 401, message: 'Refresh token yaroqsiz' },
  AUTH_004: { http: 403, message: "Juda ko'p urinish — vaqtincha bloklangan" },
  AUTH_005: { http: 403, message: 'Email tasdiqlanmagan' },
  AUTH_006: { http: 400, message: 'Tasdiqlash tokeni yaroqsiz yoki eskirgan' },
  AUTH_007: { http: 400, message: 'Parol tiklash tokeni yaroqsiz yoki eskirgan' },

  // USER
  USER_001: { http: 404, message: 'Foydalanuvchi topilmadi' },
  USER_002: { http: 409, message: 'Bu email allaqachon ro\'yxatdan o\'tgan' },
  USER_003: { http: 403, message: 'Ruxsat yetarli emas' },

  // CONTACT
  CONTACT_001: { http: 404, message: 'Kontakt topilmadi' },
  CONTACT_002: { http: 409, message: "Bunday INN allaqachon mavjud" },

  // PRODUCT
  PRODUCT_001: { http: 404, message: 'Mahsulot topilmadi' },
  PRODUCT_002: { http: 409, message: 'SKU takrorlanmoqda' },
  PRODUCT_003: { http: 400, message: 'Stok yetarli emas' },

  // WAREHOUSE
  WAREHOUSE_001: { http: 404, message: 'Ombor topilmadi' },
  WAREHOUSE_002: { http: 400, message: 'Stok harakati noto\'g\'ri' },

  // DEBT
  DEBT_001: { http: 404, message: 'Qarz topilmadi' },
  DEBT_002: { http: 400, message: "To'lov summasi qarzdan oshib ketdi" },

  // BILLING
  BILLING_001: { http: 400, message: 'Promo kod yaroqsiz' },
  BILLING_002: { http: 409, message: 'Faol obuna allaqachon mavjud' },
  BILLING_003: { http: 402, message: "To'lov amalga oshmadi" },
  BILLING_004: { http: 404, message: 'Tarif topilmadi' },

  // BILLING (payment gateway)
  PAYME_001: { http: 400, message: 'Payme webhook imzosi yaroqsiz' },
  CLICK_001: { http: 400, message: 'Click webhook imzosi yaroqsiz' },

  // VALIDATION
  VALIDATION_001: { http: 400, message: 'Kirish maydonlari yaroqsiz' },

  // SERVER
  SERVER_001: { http: 500, message: 'Server xatosi' },
  SERVER_002: { http: 503, message: 'Xizmat vaqtincha ishlamayapti' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
