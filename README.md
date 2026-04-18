# BiznesERP — O'zbekiston Enterprise ERP/CRM Platformasi

O'zbekiston bozori uchun mo'ljallangan enterprise darajasidagi ERP/CRM platformasi.
SAP, Odoo, Salesforce kabi tizimlarning eng yaxshi jihatlarini O'zbek biznes muhitiga moslashtirgan.

## Texnik Stack

| Qatlam | Texnologiya |
|--------|-------------|
| Frontend | React 18 + TypeScript 5 + Vite 5 |
| UI | shadcn/ui + Tailwind CSS + Radix UI |
| State | Zustand + TanStack Query |
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 + PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (access 15min + refresh 7day) |
| AI | Anthropic Claude API |
| Fayl | MinIO (S3-kompatibel) |
| Docker | Docker + Docker Compose |

## Tezkor boshlash

### Talab qilinadigan dasturlar
- Node.js 20+
- Docker + Docker Compose
- Git

### 1. Loyihani klonlash
```bash
git clone <repo-url>
cd erp-platform
```

### 2. Environment sozlash
```bash
cp .env.example .env
# .env faylini tahrirlang va kerakli qiymatlarni kiriting
```

### 3. Docker bilan ishga tushirish (tavsiya etiladi)
```bash
docker-compose up -d
```

### 4. Yoki lokal ishga tushirish

**PostgreSQL va Redis ishga tushirish:**
```bash
docker-compose up -d postgres redis minio
```

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## URL manzillar

| Xizmat | URL |
|--------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| Swagger UI | http://localhost:4000/api/docs |
| MinIO Console | http://localhost:9001 |

## Loyiha strukturasi

```
erp-platform/
├── frontend/          # React ilovasi
│   ├── src/
│   │   ├── components/  # UI + Layout + Shared komponentlar
│   │   ├── pages/       # Sahifalar
│   │   ├── store/       # Zustand holat
│   │   ├── hooks/       # Custom hooks
│   │   ├── services/    # API chaqiruvlar
│   │   ├── types/       # TypeScript tiplari
│   │   ├── utils/       # Yordamchi funksiyalar
│   │   └── config/      # Konfiguratsiya
│   └── ...
│
├── backend/           # NestJS API
│   ├── src/
│   │   ├── modules/     # Biznes modullar
│   │   ├── common/      # Umumiy (guard, interceptor, filter)
│   │   └── prisma/      # Prisma ORM
│   └── prisma/          # DB schema
│
└── docker/            # Docker fayllar
```

## Modullar

### Yadro (barchaga bepul)
- Dashboard — ko'rsatkichlar paneli
- Kontragentlar — mijozlar va yetkazuvchilar
- Mahsulotlar — katalog boshqaruvi
- Ombor — zaxira va harakatlar
- Xodimlar — HR va ish haqi
- Qarzlar — debitor/kreditor hisob
- Hisobotlar — asosiy hisobotlar

### Qo'shimcha modullar
- **Savdo CRM** — bitimlar, loyihalar, pipeline
- **Chiqindi qayta ishlash** — qabul, saralash, sotish
- **Qurilish** — smeta, material, brigadalar
- **Ishlab chiqarish** — retsept, partiya, sifat nazorat

## Prompts bo'yicha rivojlanish rejasi

| Prompt | Kontent |
|--------|---------|
| 1 | Loyiha asosi (bu fayl) |
| 2 | UI komponentlar tizimi |
| 3 | Layout — Sidebar, Header |
| 4 | Auth — Login sahifasi |
| 5 | Dashboard sahifasi |
| 6 | Kontragentlar moduli |
| 7 | Mahsulotlar katalogi |
| 8 | Ombor moduli |
| 9 | Xodimlar va ish haqi |
| 10 | Qarzlar moduli |
| 11 | Hisobotlar |
| 12 | Sozlamalar |
| 13 | Backend — Auth API |
| 14 | Backend — CRUD API |
| 15 | Chiqindi moduli |
| 16 | Savdo CRM moduli |
| 17 | AI integratsiya |
| 18 | PDF/Excel eksport |
| 19 | Real-time (WebSocket) |
| 20 | Production deployment |

## Litsenziya

Xususiy. Barcha huquqlar himoyalangan.
