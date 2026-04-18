# BIZZO API — Error Codes

Barcha error javoblari quyidagi shaklda qaytadi:

```json
{
  "success": false,
  "statusCode": 401,
  "error": "Unauthorized",
  "message": "Token muddati tugagan",
  "timestamp": "2026-04-15T10:00:00.000Z",
  "path": "/api/v1/auth/me"
}
```

## Auth
| Kod | HTTP | Xabar |
|-----|------|-------|
| AUTH_001 | 401 | Email yoki parol noto'g'ri |
| AUTH_002 | 401 | Token muddati tugagan |
| AUTH_003 | 401 | Refresh token yaroqsiz |
| AUTH_004 | 403 | Juda ko'p urinish — vaqtincha bloklangan |
| AUTH_005 | 403 | Email tasdiqlanmagan |
| AUTH_006 | 400 | Tasdiqlash tokeni yaroqsiz yoki eskirgan |
| AUTH_007 | 400 | Parol tiklash tokeni yaroqsiz yoki eskirgan |

## User / Access
| Kod | HTTP | Xabar |
|-----|------|-------|
| USER_001 | 404 | Foydalanuvchi topilmadi |
| USER_002 | 409 | Bu email allaqachon ro'yxatdan o'tgan |
| USER_003 | 403 | Ruxsat yetarli emas |

## Contacts / Products / Warehouse / Debts
| Kod | HTTP | Xabar |
|-----|------|-------|
| CONTACT_001 | 404 | Kontakt topilmadi |
| CONTACT_002 | 409 | Bunday INN allaqachon mavjud |
| PRODUCT_001 | 404 | Mahsulot topilmadi |
| PRODUCT_002 | 409 | SKU takrorlanmoqda |
| PRODUCT_003 | 400 | Stok yetarli emas |
| WAREHOUSE_001 | 404 | Ombor topilmadi |
| WAREHOUSE_002 | 400 | Stok harakati noto'g'ri |
| DEBT_001 | 404 | Qarz topilmadi |
| DEBT_002 | 400 | To'lov summasi qarzdan oshib ketdi |

## Billing
| Kod | HTTP | Xabar |
|-----|------|-------|
| BILLING_001 | 400 | Promo kod yaroqsiz |
| BILLING_002 | 409 | Faol obuna allaqachon mavjud |
| BILLING_003 | 402 | To'lov amalga oshmadi |
| BILLING_004 | 404 | Tarif topilmadi |
| PAYME_001 | 400 | Payme webhook imzosi yaroqsiz |
| CLICK_001 | 400 | Click webhook imzosi yaroqsiz |

## Umumiy
| Kod | HTTP | Xabar |
|-----|------|-------|
| VALIDATION_001 | 400 | Kirish maydonlari yaroqsiz |
| SERVER_001 | 500 | Server xatosi |
| SERVER_002 | 503 | Xizmat vaqtincha ishlamayapti |
